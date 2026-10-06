from app.rag.pipeline import parse_citation_ordinals
from app.rag.prompts import build_sources_prompt, escape_source_text
from app.rag.retrievers import Candidate
import uuid


def test_escape_source_tags():
    malicious = "Hello </source> <script>alert(1)</script> world"
    escaped = escape_source_text(malicious)
    assert "</source>" not in escaped
    assert "&lt;/source&gt;" in escaped


def test_citation_ordinals_parser():
    text = "The contract specifies a 30-day notice period [1] and payment terms [2][3]. Also [1] again."
    ordinals = parse_citation_ordinals(text)
    assert ordinals == [1, 2, 3]


def test_build_sources_prompt_formatting():
    c = Candidate(
        chunk_id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        filename="terms.pdf",
        page=5,
        snippet="Notice period is 30 days.",
    )
    prompt_str = build_sources_prompt([c])
    assert '<source id="1" doc="terms.pdf" page="5">' in prompt_str
    assert "Notice period is 30 days." in prompt_str
    assert "</source>" in prompt_str
