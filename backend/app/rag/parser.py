import re
from dataclasses import dataclass, field
from typing import Any, Dict, List
import fitz  # PyMuPDF

from app.core.errors import IngestionException, PayloadTooLargeException, UnsupportedMediaTypeException


@dataclass
class BBox:
    page: int
    x0: float
    y0: float
    x1: float
    y1: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "page": self.page,
            "x0": round(self.x0, 2),
            "y0": round(self.y0, 2),
            "x1": round(self.x1, 2),
            "y1": round(self.y1, 2),
        }


@dataclass
class TextBlock:
    page: int
    text: str
    bbox: BBox


@dataclass
class ParsedPage:
    page_number: int
    text: str
    blocks: List[TextBlock] = field(default_factory=list)
    has_low_text: bool = False


@dataclass
class ParsedDocument:
    page_count: int
    pages: List[ParsedPage] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


def validate_pdf_bytes(pdf_bytes: bytes, max_mb: int = 25) -> None:
    # 1. Size check
    if len(pdf_bytes) > max_mb * 1024 * 1024:
        raise PayloadTooLargeException(f"PDF exceeds maximum allowed size of {max_mb} MB")

    # 2. Magic bytes check
    if not pdf_bytes.startswith(b"%PDF-"):
        raise UnsupportedMediaTypeException("Invalid file format. File does not start with %PDF- magic bytes.")


def normalize_text(text: str) -> str:
    # De-hyphenate line breaks (e.g., "infor-\nmation" -> "information")
    text = re.sub(r"(\w+)-\n(\w+)", r"\1\2", text)
    # Collapse multiple whitespaces
    text = re.sub(r"[ \t]+", " ", text)
    # Collapse 3+ newlines into 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def parse_pdf(pdf_bytes: bytes, max_pages: int = 300) -> ParsedDocument:
    validate_pdf_bytes(pdf_bytes)

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        raise IngestionException(f"Corrupt or unreadable PDF: {str(e)}")

    if doc.is_encrypted:
        raise IngestionException("Encrypted/password-protected PDFs are not supported")

    page_count = len(doc)
    if page_count > max_pages:
        raise IngestionException(f"PDF has {page_count} pages, exceeding the limit of {max_pages} pages")

    pages: List[ParsedPage] = []
    warnings: List[str] = []

    # Frequency analysis to identify running headers / footers
    header_footer_candidates: Dict[str, int] = {}

    for page_idx in range(page_count):
        page = doc[page_idx]
        blocks_raw = page.get_text("blocks")  # (x0, y0, x1, y1, text, block_no, block_type)
        for b in blocks_raw:
            if len(b) >= 5 and b[4]:
                line = b[4].strip()
                if len(line) < 80 and ("\n" not in line):
                    header_footer_candidates[line] = header_footer_candidates.get(line, 0) + 1

    # Text that appears on > 70% of pages is considered running header/footer
    repeated_boilerplate = {
        text for text, count in header_footer_candidates.items()
        if page_count > 3 and (count / page_count) > 0.7
    }

    for page_idx in range(page_count):
        page_num = page_idx + 1
        page = doc[page_idx]
        blocks_raw = page.get_text("blocks")

        page_blocks: List[TextBlock] = []
        page_text_pieces: List[str] = []

        for b in blocks_raw:
            # PyMuPDF block tuple format: (x0, y0, x1, y1, text, block_no, block_type)
            if len(b) >= 5 and b[4]:
                block_text = b[4].strip()
                if not block_text:
                    continue

                if block_text in repeated_boilerplate:
                    continue

                cleaned_text = normalize_text(block_text)
                if not cleaned_text:
                    continue

                bbox = BBox(
                    page=page_num,
                    x0=float(b[0]),
                    y0=float(b[1]),
                    x1=float(b[2]),
                    y1=float(b[3]),
                )
                page_blocks.append(TextBlock(page=page_num, text=cleaned_text, bbox=bbox))
                page_text_pieces.append(cleaned_text)

        full_page_text = "\n\n".join(page_text_pieces)
        has_low_text = len(full_page_text) < 20

        if has_low_text:
            warnings.append(f"Page {page_num} has little or no extractable text (possible scan/image).")

        pages.append(ParsedPage(
            page_number=page_num,
            text=full_page_text,
            blocks=page_blocks,
            has_low_text=has_low_text,
        ))

    return ParsedDocument(page_count=page_count, pages=pages, warnings=warnings)
