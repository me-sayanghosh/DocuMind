from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import WorkspaceContext, get_workspace_ctx
from app.db.session import get_db
from app.rag.reranker import get_reranker
from app.rag.retrievers import FTSRetriever, HybridRetriever, VectorRetriever
from app.schemas.search import SearchCandidateRead, SearchRequest, SearchResponse

router = APIRouter(prefix="/workspaces/{workspace_id}/search", tags=["search"])

vector_retriever = VectorRetriever()
fts_retriever = FTSRetriever()
hybrid_retriever = HybridRetriever(vector_retriever, fts_retriever)
reranker = get_reranker()


@router.post("", response_model=SearchResponse)
async def search_workspace(
    data: SearchRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = ctx.workspace.id
    target_docs = data.doc_ids

    if data.mode == "vector":
        cands = await vector_retriever.retrieve(
            db=db, query=data.query, workspace_id=workspace_id, k=data.k, doc_ids=target_docs
        )
    elif data.mode == "fts":
        cands = await fts_retriever.retrieve(
            db=db, query=data.query, workspace_id=workspace_id, k=data.k, doc_ids=target_docs
        )
    elif data.mode == "hybrid":
        cands = await hybrid_retriever.retrieve(
            db=db, query=data.query, workspace_id=workspace_id, k=data.k, doc_ids=target_docs
        )
    else:
        # hybrid_rerank
        initial = await hybrid_retriever.retrieve(
            db=db, query=data.query, workspace_id=workspace_id, k=30, doc_ids=target_docs
        )
        cands = await reranker.rerank(query=data.query, cands=initial, k=data.k)

    candidates_read = [
        SearchCandidateRead(
            n=idx,
            chunk_id=c.chunk_id,
            document_id=c.document_id,
            filename=c.filename,
            page=c.page,
            snippet=c.snippet,
            score=c.score,
            bboxes=c.bboxes,
        )
        for idx, c in enumerate(cands, start=1)
    ]

    return SearchResponse(
        query=data.query,
        mode=data.mode,
        candidates=candidates_read,
    )
