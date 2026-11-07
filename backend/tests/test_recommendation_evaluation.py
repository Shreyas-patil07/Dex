import pytest

from scripts.evaluate_recommendations import (
    greedy_mmr_order,
    intra_list_diversity,
    ndcg_at_k,
    precision_at_k,
    recall_at_k,
)


def test_ndcg_is_one_for_ideal_order_and_lower_for_reversed_order():
    ideal = ndcg_at_k([3, 2, 0], 3)
    reversed_order = ndcg_at_k([0, 2, 3], 3)

    assert ideal == pytest.approx(1.0)
    assert 0.0 <= reversed_order < ideal


def test_precision_and_recall_at_k_use_binary_relevance():
    grades = [3, 0, 2, 0]

    assert precision_at_k(grades, 2) == pytest.approx(0.5)
    assert recall_at_k(grades, 2) == pytest.approx(0.5)


def test_metrics_handle_empty_and_zero_relevance_lists():
    assert ndcg_at_k([], 3) == 0.0
    assert precision_at_k([], 3) == 0.0
    assert recall_at_k([0, 0], 2) == 0.0
    assert ndcg_at_k([0, 0], 2) == 0.0


def test_intra_list_diversity_distinguishes_identical_and_different_items():
    same = {"features": {"genres": ["18"], "keywords": ["mystery"]}}
    other = {"features": {"genres": ["18"], "keywords": ["mystery"]}}
    different = {"features": {"genres": ["878"], "keywords": ["space"]}}

    assert intra_list_diversity([same, other]) == pytest.approx(0.0)
    assert intra_list_diversity([same, different]) == pytest.approx(1.0)


def test_greedy_mmr_returns_distinct_candidates_and_can_prefer_diversity():
    candidates = [
        {"id": 1, "title": "Drama A", "score": 0.95, "features": {"genres": ["18"]}},
        {"id": 2, "title": "Drama B", "score": 0.90, "features": {"genres": ["18"]}},
        {"id": 3, "title": "Science Fiction", "score": 0.70, "features": {"genres": ["878"]}},
    ]

    selected = greedy_mmr_order(candidates, 2)

    assert [item["id"] for item in selected] == [1, 3]
