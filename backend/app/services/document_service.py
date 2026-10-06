import hashlib
import uuid
from typing import List, Optional, Tuple
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import IngestionException, NotFoundException, PayloadTooLargeException, UnsupportedMediaTypeException
from app.models.chunk import Chunk
from app.models.document import Document
from app.rag.chunker import chunk_document
from app.rag.embedder import get_embedder
from app.rag.parser import parse_pdf, validate_pdf_bytes
from app.services.storage_service import storage_service


class DocumentService:
    async def upload_document(
        self,
        db: AsyncSession,
        workspace_id: uuid.UUID,
        uploaded_by: uuid.UUID,
        filename: str,
        content: bytes,
    ) -> Tuple[Document, bool]:
        # 1. Validation
        validate_pdf_bytes(content, max_mb=settings.MAX_UPLOAD_MB)

        # 2. SHA-256 Deduplication within workspace
        sha256_hash = hashlib.sha256(content).hexdigest()

        existing_stmt = select(Document).where(
            Document.workspace_id == workspace_id,
            Document.sha256 == sha256_hash,
        )
        existing_res = await db.execute(existing_stmt)
        existing_doc = existing_res.scalar_one_or_none()
        if existing_doc:
            return existing_doc, True

        # 3. Save to storage
        storage_key = await storage_service.save_file(
            workspace_id=workspace_id,
            filename=filename,
            content=content,
        )

        # 4. Insert Document record
        doc = Document(
            workspace_id=workspace_id,
            uploaded_by=uploaded_by,
            filename=filename,
            storage_key=storage_key,
            sha256=sha256_hash,
            size_bytes=len(content),
            status="queued",
            chunks_total=0,
            chunks_done=0,
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)

        return doc, False

    async def list_documents(
        self, db: AsyncSession, workspace_id: uuid.UUID
    ) -> List[Document]:
        stmt = (
            select(Document)
            .where(Document.workspace_id == workspace_id)
            .order_by(Document.created_at.desc())
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def get_document(
        self, db: AsyncSession, workspace_id: uuid.UUID, document_id: uuid.UUID
    ) -> Document:
        stmt = select(Document).where(
            Document.id == document_id,
            Document.workspace_id == workspace_id,
        )
        res = await db.execute(stmt)
        doc = res.scalar_one_or_none()
        if not doc:
            raise NotFoundException("Document not found")
        return doc

    async def delete_document(
        self, db: AsyncSession, workspace_id: uuid.UUID, document_id: uuid.UUID
    ) -> None:
        doc = await self.get_document(db, workspace_id, document_id)
        # Delete file from storage
        await storage_service.delete_file(doc.storage_key)
        # Cascade delete from DB
        await db.delete(doc)
        await db.commit()

    async def reingest_document(
        self, db: AsyncSession, workspace_id: uuid.UUID, document_id: uuid.UUID
    ) -> Document:
        doc = await self.get_document(db, workspace_id, document_id)
        doc.status = "queued"
        doc.error = None
        doc.chunks_done = 0
        await db.commit()
        await db.refresh(doc)
        return doc

    async def process_document_ingestion(
        self, db: AsyncSession, document_id: uuid.UUID
    ) -> None:
        doc = await db.get(Document, document_id)
        if not doc:
            return

        doc.status = "processing"
        doc.error = None
        await db.commit()

        try:
            # 1. Read file
            pdf_bytes = await storage_service.read_file(doc.storage_key)

            # 2. Parse PDF
            parsed = parse_pdf(pdf_bytes, max_pages=settings.MAX_PAGES)
            doc.page_count = parsed.page_count

            # 3. Chunk
            chunks = chunk_document(parsed, target_tokens=500, overlap_tokens=80)
            doc.chunks_total = len(chunks)

            # 4. Clear existing chunks (Idempotency)
            await db.execute(delete(Chunk).where(Chunk.document_id == doc.id))
            await db.flush()

            if not chunks:
                doc.status = "ready"
                doc.chunks_done = 0
                await db.commit()
                return

            # 5. Batch Embed
            embedder = get_embedder()
            batch_size = 32
            chunk_records: List[Chunk] = []

            for i in range(0, len(chunks), batch_size):
                batch = chunks[i : i + batch_size]
                texts = [c.text for c in batch]
                embeddings = await embedder.embed_documents(texts)

                for c, emb in zip(batch, embeddings):
                    chunk_rec = Chunk(
                        document_id=doc.id,
                        workspace_id=doc.workspace_id,
                        chunk_index=c.chunk_index,
                        page_start=c.page_start,
                        page_end=c.page_end,
                        text=c.text,
                        bboxes=c.bboxes,
                        token_count=c.token_count,
                        embedding=emb,
                    )
                    db.add(chunk_rec)
                    chunk_records.append(chunk_rec)

                doc.chunks_done = min(len(chunk_records), doc.chunks_total)
                await db.commit()

            doc.status = "ready"
            doc.chunks_done = len(chunks)
            doc.error = None
            await db.commit()

        except Exception as e:
            doc.status = "failed"
            doc.error = str(e)
            await db.commit()


document_service = DocumentService()
