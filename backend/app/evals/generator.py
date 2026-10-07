import random
import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chunk import Chunk
from app.models.eval import EvalQuestion
from app.rag.generator import LLM, get_llm

GEN_SYSTEM_PROMPT = """You are a synthetic dataset generator for document question answering evaluation.
Given a document passage, formulate:
1. A realistic, specific user question that can ONLY be answered using the facts in this passage.
2. A direct reference ground-truth answer.

Respond in exact format:
QUESTION: <question>
ANSWER: <reference answer>
"""


class QuestionGenerator:
    def __init__(self, llm: Optional[LLM] = None):
        self.llm = llm or get_llm()

    async def generate_questions_for_workspace(
        self,
        db: AsyncSession,
        workspace_id: uuid.UUID,
        run_id: uuid.UUID,
        n_questions: int = 20,
        include_unanswerable: bool = True,
    ) -> List[EvalQuestion]:
        # 1. Fetch chunks in workspace
        stmt = select(Chunk).where(Chunk.workspace_id == workspace_id)
        res = await db.execute(stmt)
        chunks = list(res.scalars().all())

        if not chunks:
            return []

        # Stratified sample
        sample_size = min(len(chunks), n_questions)
        sampled_chunks = random.sample(chunks, sample_size)

        created_questions: List[EvalQuestion] = []

        for chunk in sampled_chunks:
            user_content = f"PASSAGE:\n{chunk.text[:1200]}"
            try:
                out = await self.llm.complete(
                    system=GEN_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": user_content}],
                )
                q_text = ""
                a_text = ""
                for line in out.splitlines():
                    if line.startswith("QUESTION:"):
                        q_text = line.replace("QUESTION:", "").strip()
                    elif line.startswith("ANSWER:"):
                        a_text = line.replace("ANSWER:", "").strip()

                if not q_text:
                    q_text = f"What is discussed regarding {chunk.text[:50]}?"
                    a_text = chunk.text[:200]

                eq = EvalQuestion(
                    run_id=run_id,
                    question=q_text,
                    gold_chunk_ids=[str(chunk.id)],
                    reference_answer=a_text,
                    answerable=True,
                )
                db.add(eq)
                created_questions.append(eq)
            except Exception:
                eq = EvalQuestion(
                    run_id=run_id,
                    question=f"What key information is provided in section {chunk.chunk_index}?",
                    gold_chunk_ids=[str(chunk.id)],
                    reference_answer=chunk.text[:150],
                    answerable=True,
                )
                db.add(eq)
                created_questions.append(eq)

        # Add unanswerable decoys if requested
        if include_unanswerable:
            decoys = [
                ("What was the company's net profit margin in the fiscal year 1874?", "N/A"),
                ("What is the personal phone number of the author mentioned on page 99?", "N/A"),
                ("What are the specific terms of the secret non-disclosure agreement regarding project Neptune?", "N/A"),
            ]
            for dec_q, dec_a in decoys:
                eq = EvalQuestion(
                    run_id=run_id,
                    question=dec_q,
                    gold_chunk_ids=[],
                    reference_answer=dec_a,
                    answerable=False,
                )
                db.add(eq)
                created_questions.append(eq)

        await db.commit()
        return created_questions


question_generator = QuestionGenerator()
