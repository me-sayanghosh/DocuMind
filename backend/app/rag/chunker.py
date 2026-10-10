import re
from dataclasses import dataclass, field
from typing import Any, Dict, List

from app.rag.parser import ParsedDocument, TextBlock


@dataclass
class DocumentChunk:
    chunk_index: int
    page_start: int
    page_end: int
    text: str
    token_count: int
    bboxes: List[Dict[str, Any]] = field(default_factory=list)


def estimate_tokens(text: str) -> int:
    """Approximate token count: ~4 characters or ~1.3 words per token."""
    words = len(text.split())
    chars = len(text)
    return max(1, int(max(words * 1.3, chars / 4)))


def chunk_document(
    parsed: ParsedDocument,
    target_tokens: int = 500,
    overlap_tokens: int = 80,
) -> List[DocumentChunk]:
    chunks: List[DocumentChunk] = []

    # Flatten blocks across pages with their original page numbers and bboxes
    all_blocks: List[TextBlock] = []
    for page in parsed.pages:
        for block in page.blocks:
            all_blocks.append(block)

    if not all_blocks:
        # If no blocks extracted (e.g. empty or scanned pages)
        return []

    current_blocks: List[TextBlock] = []
    current_tokens: int = 0
    chunk_idx = 0

    i = 0
    while i < len(all_blocks):
        block = all_blocks[i]
        block_tokens = estimate_tokens(block.text)

        # If a single block exceeds target_tokens, split it by sentences
        if block_tokens > target_tokens * 1.2:
            sentences = re.split(r"(?<=[.!?])\s+", block.text)
            for s in sentences:
                s_tokens = estimate_tokens(s)
                if current_tokens + s_tokens > target_tokens and current_blocks:
                    # Flush chunk
                    chunk_text = "\n\n".join(b.text for b in current_blocks)
                    page_start = min(b.page for b in current_blocks)
                    page_end = max(b.page for b in current_blocks)
                    unique_bboxes = [b.bbox.to_dict() for b in current_blocks]

                    chunks.append(
                        DocumentChunk(
                            chunk_index=chunk_idx,
                            page_start=page_start,
                            page_end=page_end,
                            text=chunk_text,
                            token_count=current_tokens,
                            bboxes=unique_bboxes,
                        )
                    )
                    chunk_idx += 1

                    # Retain overlap
                    retained: List[TextBlock] = []
                    retained_tokens = 0
                    for b in reversed(current_blocks):
                        b_tok = estimate_tokens(b.text)
                        if retained_tokens + b_tok <= overlap_tokens:
                            retained.insert(0, b)
                            retained_tokens += b_tok
                        else:
                            break
                    current_blocks = retained
                    current_tokens = retained_tokens

                current_blocks.append(TextBlock(page=block.page, text=s, bbox=block.bbox))
                current_tokens += s_tokens
            i += 1
            continue

        if current_tokens + block_tokens > target_tokens and current_blocks:
            chunk_text = "\n\n".join(b.text for b in current_blocks)
            page_start = min(b.page for b in current_blocks)
            page_end = max(b.page for b in current_blocks)
            unique_bboxes = [b.bbox.to_dict() for b in current_blocks]

            chunks.append(
                DocumentChunk(
                    chunk_index=chunk_idx,
                    page_start=page_start,
                    page_end=page_end,
                    text=chunk_text,
                    token_count=current_tokens,
                    bboxes=unique_bboxes,
                )
            )
            chunk_idx += 1

            # Retain overlap
            retained = []
            retained_tokens = 0
            for b in reversed(current_blocks):
                b_tok = estimate_tokens(b.text)
                if retained_tokens + b_tok <= overlap_tokens:
                    retained.insert(0, b)
                    retained_tokens += b_tok
                else:
                    break
            current_blocks = retained
            current_tokens = retained_tokens

        current_blocks.append(block)
        current_tokens += block_tokens
        i += 1

    # Flush remaining blocks
    if current_blocks:
        chunk_text = "\n\n".join(b.text for b in current_blocks)
        page_start = min(b.page for b in current_blocks)
        page_end = max(b.page for b in current_blocks)
        unique_bboxes = [b.bbox.to_dict() for b in current_blocks]

        chunks.append(
            DocumentChunk(
                chunk_index=chunk_idx,
                page_start=page_start,
                page_end=page_end,
                text=chunk_text,
                token_count=current_tokens,
                bboxes=unique_bboxes,
            )
        )

    return chunks
