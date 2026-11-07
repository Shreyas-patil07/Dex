from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.services.recommendations import (  # noqa: E402
    MMR_LAMBDA,
    RECENT_ALL_TIME_BLEND,
    _datetime,
    build_all_time_profile,
    build_local_idf,
    build_recent_profile,
    feature_jaccard,
    mmr_score,
    score_candidate,
)


def dcg_at_k(relevances: list[int], k: int) -> float:
    return sum(
        (2 ** max(0, int(relevance)) - 1) / math.log2(position + 2)
        for position, relevance in enumerate(relevances[:k])
    )


def ndcg_at_k(relevances: list[int], k: int) -> float:
    if k <= 0:
        return 0.0
    ideal = sorted((max(0, int(value)) for value in relevances), reverse=True)[:k]
    ideal_dcg = dcg_at_k(ideal, k)
    return dcg_at_k(relevances, k) / ideal_dcg if ideal_dcg else 0.0


def precision_at_k(relevances: list[int], k: int) -> float:
    if k <= 0:
        return 0.0
    selected = relevances[:k]
    if not selected:
        return 0.0
    return sum(int(value) > 0 for value in selected) / min(k, len(selected))


def recall_at_k(relevances: list[int], k: int) -> float:
    relevant_total = sum(int(value) > 0 for value in relevances)
    if relevant_total == 0:
        return 0.0
    return sum(int(value) > 0 for value in relevances[:k]) / relevant_total


def intra_list_diversity(candidates: list[dict[str, Any]]) -> float:
    if len(candidates) < 2:
        return 0.0
    similarities = [
        feature_jaccard(left.get("features") or {}, right.get("features") or {})
        for index, left in enumerate(candidates)
        for right in candidates[index + 1:]
    ]
    return sum(1.0 - value for value in similarities) / len(similarities)


def greedy_mmr_order(
    candidates: list[dict[str, Any]],
    k: int,
    weight: float = MMR_LAMBDA,
) -> list[dict[str, Any]]:
    remaining = list(candidates)
    selected: list[dict[str, Any]] = []
    while remaining and len(selected) < k:
        if not selected:
            choice = max(remaining, key=lambda item: (item["score"], item["title"]))
        else:
            def objective(item: dict[str, Any]) -> tuple[float, float, str]:
                redundancy = max(
                    feature_jaccard(item.get("features") or {}, picked.get("features") or {})
                    for picked in selected
                )
                return (mmr_score(item["score"], redundancy, weight), item["score"], item["title"])

            choice = max(remaining, key=objective)
        selected.append(choice)
        remaining.remove(choice)
    return selected


def evaluate_profile(profile_data: dict[str, Any], reference_time: datetime, k: int) -> dict[str, Any]:
    watches = profile_data["watches"]
    candidates = profile_data["candidates"]
    all_time, all_time_count = build_all_time_profile(watches)
    recent, recent_count = build_recent_profile(watches, now=reference_time)
    idf = build_local_idf(all_time, watches, candidates)

    scored: list[dict[str, Any]] = []
    for candidate in candidates:
        all_score = score_candidate(all_time, candidate.get("features") or {}, idf)
        recent_score = score_candidate(recent, candidate.get("features") or {}, idf)
        if all_score is None and recent_score is None:
            score = 0.0
        elif all_score is None:
            score = recent_score
        elif recent_score is None:
            score = all_score
        else:
            score = (
                (1.0 - RECENT_ALL_TIME_BLEND) * all_score
                + RECENT_ALL_TIME_BLEND * recent_score
            )
        scored.append({**candidate, "score": float(score or 0.0)})

    relevance_ranked = sorted(
        scored,
        key=lambda item: (-item["score"], str(item["media_type"]), int(item["id"])),
    )
    diversified = greedy_mmr_order(relevance_ranked, k)
    relevance_grades = [int(item["relevance"]) for item in relevance_ranked]
    diversified_grades = [int(item["relevance"]) for item in diversified]
    positive_features = {
        feature_id
        for group in all_time.values()
        for feature_id in group["positive"]
    }
    recommended_features = {
        str(feature_id)
        for item in diversified
        for values in (item.get("features") or {}).values()
        for feature_id in values
    }
    feature_coverage = (
        len(positive_features & recommended_features) / len(positive_features)
        if positive_features else 0.0
    )

    def metrics(grades: list[int], selected: list[dict[str, Any]]) -> dict[str, float]:
        return {
            f"ndcg@{k}": round(ndcg_at_k(grades, k), 4),
            f"precision@{k}": round(precision_at_k(grades, k), 4),
            f"recall@{k}": round(recall_at_k(grades, k), 4),
            "intra_list_diversity": round(intra_list_diversity(selected), 4),
        }

    return {
        "profile_id": profile_data["id"],
        "profiled_watch_count": all_time_count,
        "recent_watch_count": recent_count,
        "candidate_count": len(candidates),
        "relevance_ranking": metrics(relevance_grades, relevance_ranked[:k]),
        "mmr_ranking": metrics(diversified_grades, diversified),
        "positive_feature_coverage_at_k": round(feature_coverage, 4),
        "top_k": [
            {
                "id": int(item["id"]),
                "media_type": item["media_type"],
                "title": item["title"],
                "score": round(item["score"], 6),
                "relevance_judgement": int(item["relevance"]),
            }
            for item in diversified
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run deterministic offline evaluation on synthetic Dex taste profiles.")
    parser.add_argument(
        "--fixtures",
        type=Path,
        default=BACKEND_ROOT / "evaluation" / "recommendation_fixtures.json",
    )
    parser.add_argument("--k", type=int, default=None)
    args = parser.parse_args()

    fixture_data = json.loads(args.fixtures.read_text(encoding="utf-8"))
    reference_time = _datetime(fixture_data["reference_time"]) or datetime.now(timezone.utc)
    k = args.k or int(fixture_data.get("k", 3))
    if k < 1:
        raise SystemExit("--k must be at least 1")

    results = [
        evaluate_profile(profile, reference_time, k)
        for profile in fixture_data["profiles"]
    ]
    metric_keys = [
        f"ndcg@{k}",
        f"precision@{k}",
        f"recall@{k}",
        "intra_list_diversity",
    ]

    def macro_average(section: str, metric: str) -> float:
        values = [result[section][metric] for result in results]
        return round(sum(values) / len(values), 4) if values else 0.0

    print(json.dumps({
        "evaluation_version": fixture_data["evaluation_version"],
        "dataset": "synthetic_predeclared",
        "profile_count": len(results),
        "k": k,
        "scoring": "Taste Engine V2 score_candidate + all-time/recent blend",
        "diversification": f"Greedy MMR with lambda={MMR_LAMBDA}",
        "aggregate_macro_average": {
            section: {
                metric: macro_average(section, metric)
                for metric in metric_keys
            }
            for section in ("relevance_ranking", "mmr_ranking")
        },
        "profiles": results,
        "limitations": [
            "Synthetic relevance judgements are assumptions, not observed user preferences.",
            "This evaluates the deterministic scorer and greedy MMR, not the live TMDB retrieval pipeline.",
            "This does not reproduce random top-k cache sampling or estimate click-through/satisfaction.",
            "Five fixtures are a regression baseline, not statistically significant evidence.",
            "No external network calls or personal user data are used."
        ]
    }, indent=2))


if __name__ == "__main__":
    main()
