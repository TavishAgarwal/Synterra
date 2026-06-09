"""End-to-end tests for the runnable simulation engine and public API."""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from backend.api.main import app
from backend.api.routes.simulation import _policy_params
from backend.simulation.engine import SimulationEngine


async def _run_engine(seed: int, fare_change_pct: float = 20.0) -> list[dict]:
    engine = SimulationEngine()
    results = []
    async for step in engine.run_scenario(
        "DEL_SHAHDARA",
        {"fare_change_pct": fare_change_pct},
        time_horizon_days=3,
        population_size=120,
        seed=seed,
    ):
        results.append(step.metrics)
    return results


def _sse_events(body: str) -> list[dict]:
    return [
        json.loads(chunk.removeprefix("data: "))
        for chunk in body.split("\n\n")
        if chunk.startswith("data: ")
    ]


@pytest.mark.asyncio
async def test_engine_completes_and_is_reproducible():
    first = await _run_engine(seed=42)
    repeated = await _run_engine(seed=42)

    assert len(first) == 3
    assert first == repeated
    assert first[-1]["total_agents"] == 120


@pytest.mark.asyncio
async def test_engine_changes_with_seed_and_policy():
    baseline = await _run_engine(seed=42, fare_change_pct=20.0)
    changed_seed = await _run_engine(seed=43, fare_change_pct=20.0)
    changed_policy = await _run_engine(seed=42, fare_change_pct=5.0)

    assert baseline != changed_seed
    assert baseline != changed_policy


@pytest.mark.asyncio
async def test_demo_policy_semantics_produce_distinct_magnitudes():
    policies = [
        "Increase Delhi Metro fares by 20%",
        "Make public buses free for women",
        "Move government services online using biometric verification",
        "Increase petrol and diesel prices",
        "Remove work from home and require return to office",
        "Introduce an odd-even traffic restriction",
        "Waive electricity bills for low income households",
        "Increase MGNREGA wage for rural workers",
    ]
    magnitudes = [(await _policy_params(policy))[1]["magnitude"] for policy in policies]

    assert len(set(magnitudes)) == len(policies)


def test_simulation_api_streams_computed_engine_results():
    client = TestClient(app)
    response = client.post(
        "/api/simulate",
        json={
            "city_id": "DEL",
            "policy_text": "Increase Delhi Metro fares by 20%",
            "time_horizon_days": 2,
            "population_size": 120,
            "seed": 42,
        },
    )
    events = _sse_events(response.text)

    assert response.status_code == 200
    assert [event["event"] for event in events] == [
        "sim_start",
        "day_update",
        "day_update",
        "sim_complete",
    ]
    assert events[1]["computed"] is True
    assert events[1]["metrics"]["total_agents"] == 120


def test_simulation_api_accepts_city_name_aliases():
    client = TestClient(app)
    response = client.post(
        "/api/simulate",
        json={
            "city_id": "MUMBAI",
            "policy_text": "Increase petrol and diesel prices by 15 per litre",
            "time_horizon_days": 1,
            "population_size": 120,
            "seed": 42,
        },
    )
    events = _sse_events(response.text)

    assert response.status_code == 200
    assert events[0]["city_id"] == "MUM"
    assert events[-1]["event"] == "sim_complete"


def test_simulation_request_validation():
    client = TestClient(app)
    response = client.post(
        "/api/simulate",
        json={
            "city_id": "NOT_REAL",
            "policy_text": "x",
            "time_horizon_days": -1,
            "population_size": -5,
        },
    )
    assert response.status_code == 422


def test_counterfactual_runs_from_completed_simulation():
    client = TestClient(app)
    base_response = client.post(
        "/api/simulate",
        json={
            "city_id": "DEL",
            "policy_text": "Increase Delhi Metro fares by 20%",
            "time_horizon_days": 2,
            "population_size": 120,
            "seed": 42,
        },
    )
    base_events = _sse_events(base_response.text)
    base_id = base_events[-1]["simulation_id"]

    response = client.post(
        "/api/counterfactual",
        json={
            "base_simulation_id": base_id,
            "modified_policy_text": "Increase Delhi Metro fares by 20% phased over 60 days",
            "seed": 43,
        },
    )
    events = _sse_events(response.text)

    assert response.status_code == 200
    assert events[-1]["event"] == "sim_complete"
    assert events[-1]["summary"]["score"] > base_events[-1]["summary"]["score"]
