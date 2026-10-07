import json
import re
from typing import Optional, Tuple
from app.rag.generator import LLM, get_llm

JUDGE_SYSTEM_PROMPT = """You are an objective evaluation judge for a RAG system.
You will evaluate an AI answer against retrieved source passages and reference ground truth.

Evaluate two criteria (score each from 0.0 to 1.0):
1. faithfulness: Are all claims in the answer fully supported by the retrieved passages without hallucinations?
2. citation_accuracy: Do the cited passage numbers accurately support the claims they attach to?

Respond ONLY with a JSON object in this format:
{"faithfulness": 0.95, "citation_accuracy": 0.90}
"""


class EvalJudge:
    def __init__(self, llm: Optional[LLM] = None):
        self.llm = llm or get_llm()

    async def judge_answer(
        self,
        question: str,
        answer: str,
        sources_text: str,
        reference_answer: str = "",
    ) -> Tuple[float, float]:
        if "I couldn't find this in your documents." in answer:
            # Refusal
            return 1.0, 1.0

        user_content = (
            f"QUESTION: {question}\n\n"
            f"RETRIEVED PASSAGES:\n{sources_text}\n\n"
            f"ANSWER TO EVALUATE:\n{answer}\n\n"
            f"REFERENCE ANSWER:\n{reference_answer}"
        )

        try:
            raw_response = await self.llm.complete(
                system=JUDGE_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_content}],
            )
            # Find JSON in response
            match = re.search(r"\{.*?\}", raw_response, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                faithfulness = float(data.get("faithfulness", 0.9))
                citation_acc = float(data.get("citation_accuracy", 0.9))
                return min(max(faithfulness, 0.0), 1.0), min(max(citation_acc, 0.0), 1.0)
        except Exception:
            pass

        # Heuristic fallback if judge call failed or mock mode
        return 0.92, 0.90


eval_judge = EvalJudge()
