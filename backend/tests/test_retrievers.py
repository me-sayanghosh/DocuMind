import uuid

import pytest

from app.rag.retrievers import Candidate, HybridRetriever


@pytest.mark.asyncio
async def test_rrf_scoring_logic():
    c1_id = uuid.uuid4()
    c2_id = uuid.uuid4()
    c3_id = uuid.uuid4()
    doc_id = uuid.uuid4()

    c1 = Candidate(
        chunk_id=c1_id,
        document_id=doc_id,
        filename="doc.pdf",
        page=1,
        snippet="First text",
        score=0.9,
    )
    c2 = Candidate(
        chunk_id=c2_id,
        document_id=doc_id,
        filename="doc.pdf",
        page=2,
        snippet="Second text",
        score=0.8,
    )
    c3 = Candidate(
        chunk_id=c3_id,
        document_id=doc_id,
        filename="doc.pdf",
        page=3,
        snippet="Third text",
        score=0.7,
    )

    # Mock retrievers returning known rankings
    class MockVectorRetriever:
        async def retrieve(self, *args, **kwargs):
            return [c1, c2]

    class MockFTSRetriever:
        async def retrieve(self, *args, **kwargs):
            return [c2, c3]

    hybrid = HybridRetriever(
        vector_retriever=MockVectorRetriever(),
        fts_retriever=MockFTSRetriever(),
    )

    fused = await hybrid.retrieve(
        db=None,
        query="test query",
        workspace_id=uuid.uuid4(),
        k=5,
        rrf_k=60,
    )

    assert len(fused) == 3
    # c2 was rank 2 in dense and rank 1 in fts: 1/(60+2) + 1/(60+1) = 0.0161 + 0.0164 = 0.0325
    # c1 was rank 1 in dense: 1/(60+1) = 0.0164
    # c2 should rank FIRST due to reciprocal rank fusion!
    assert fused[0].chunk_id == c2_id
    assert fused[0].score > fused[1].score
