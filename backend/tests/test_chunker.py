import pytest
from app.rag.chunker import chunk_document, estimate_tokens
from app.rag.parser import BBox, ParsedDocument, ParsedPage, TextBlock


def test_estimate_tokens():
    text = "This is a simple test sentence with eight words."
    tokens = estimate_tokens(text)
    assert tokens >= 5


def test_chunk_document_bounds_and_bboxes():
    blocks = [
        TextBlock(page=1, text="Introduction to the document.", bbox=BBox(1, 10, 20, 100, 40)),
        TextBlock(page=1, text="Second paragraph explaining concepts.", bbox=BBox(1, 10, 50, 100, 70)),
        TextBlock(page=2, text="Third section on page two.", bbox=BBox(2, 10, 20, 100, 40)),
    ]
    pages = [
        ParsedPage(page_number=1, text="Intro\n\nSecond", blocks=blocks[:2]),
        ParsedPage(page_number=2, text="Third section", blocks=[blocks[2]]),
    ]
    parsed = ParsedDocument(page_count=2, pages=pages)

    chunks = chunk_document(parsed, target_tokens=100, overlap_tokens=20)
    assert len(chunks) >= 1
    assert chunks[0].page_start == 1
    assert len(chunks[0].bboxes) > 0
    assert chunks[0].bboxes[0]["page"] == 1
