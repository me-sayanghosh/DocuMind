from typing import Dict, List


def calculate_hit_at_k(
    gold_chunk_ids: List[str],
    retrieved_chunk_ids: List[str],
    k_values: List[int] = [1, 3, 5, 10],
) -> Dict[str, float]:
    gold_set = set(gold_chunk_ids)
    results = {}

    for k in k_values:
        top_k = retrieved_chunk_ids[:k]
        hit = 1.0 if any(cid in gold_set for cid in top_k) else 0.0
        results[f"hit@{k}"] = hit

    return results


def calculate_mrr(
    gold_chunk_ids: List[str],
    retrieved_chunk_ids: List[str],
) -> float:
    gold_set = set(gold_chunk_ids)
    for rank, cid in enumerate(retrieved_chunk_ids, start=1):
        if cid in gold_set:
            return 1.0 / rank
    return 0.0


def calculate_recall_at_k(
    gold_chunk_ids: List[str],
    retrieved_chunk_ids: List[str],
    k: int = 5,
) -> float:
    if not gold_chunk_ids:
        return 0.0
    gold_set = set(gold_chunk_ids)
    top_k_set = set(retrieved_chunk_ids[:k])
    intersection = gold_set.intersection(top_k_set)
    return len(intersection) / len(gold_set)
