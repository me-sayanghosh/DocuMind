from app.evals.metrics import calculate_hit_at_k, calculate_mrr, calculate_recall_at_k


def test_calculate_hit_at_k():
    gold = ["c1", "c2"]
    retrieved = ["c3", "c1", "c4", "c5", "c6"]

    hits = calculate_hit_at_k(gold, retrieved, k_values=[1, 3, 5])
    assert hits["hit@1"] == 0.0
    assert hits["hit@3"] == 1.0
    assert hits["hit@5"] == 1.0


def test_calculate_mrr():
    gold = ["c1"]
    retrieved = ["c2", "c1", "c3"]
    mrr = calculate_mrr(gold, retrieved)
    assert mrr == 0.5

    # Not found
    assert calculate_mrr(gold, ["c4", "c5"]) == 0.0


def test_calculate_recall_at_k():
    gold = ["c1", "c2", "c3"]
    retrieved = ["c1", "c4", "c2", "c5"]
    recall = calculate_recall_at_k(gold, retrieved, k=3)
    # in top 3: c1, c2 -> 2/3 = 0.666...
    assert round(recall, 2) == 0.67
