"""Run a repeatable end-to-end SimulationEngine benchmark."""

from __future__ import annotations

import argparse
import asyncio
import json
import time

from backend.simulation.engine import SimulationEngine


async def run_benchmark(agents: int, days: int, seed: int) -> dict:
    started = time.perf_counter()
    completed_days = 0
    final_metrics: dict = {}
    engine = SimulationEngine()

    async for step in engine.run_scenario(
        "DEL_SHAHDARA",
        {"fare_change_pct": 20.0},
        time_horizon_days=days,
        population_size=agents,
        seed=seed,
    ):
        completed_days += 1
        final_metrics = step.metrics

    elapsed_seconds = time.perf_counter() - started
    return {
        "agents": agents,
        "days_requested": days,
        "days_completed": completed_days,
        "seed": seed,
        "elapsed_seconds": round(elapsed_seconds, 3),
        "agent_days_per_second": round((agents * completed_days) / elapsed_seconds),
        "final_score_inputs": {
            "modal_shift_pct": final_metrics.get("modal_shift_pct"),
            "protest_probability": final_metrics.get("protest_probability"),
            "revenue_impact_pct": final_metrics.get("revenue_impact_pct"),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--agents", type=int, default=10_000)
    parser.add_argument("--days", type=int, default=30)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    if not 100 <= args.agents <= 10_000:
        parser.error("--agents must be between 100 and 10000")
    if not 1 <= args.days <= 90:
        parser.error("--days must be between 1 and 90")

    print(json.dumps(asyncio.run(run_benchmark(args.agents, args.days, args.seed)), indent=2))


if __name__ == "__main__":
    main()
