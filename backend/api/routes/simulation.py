"""Simulation API backed by the real multi-tier simulation engine."""

from __future__ import annotations

import asyncio
import json
import time
import uuid
from collections import defaultdict, deque
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, desc

from backend.api.demo_data import CITIES
from backend.simulation.engine import SimulationEngine, StepResult
from backend.simulation.policy_parser import PolicyParser
from backend.data.database import AsyncSessionLocal, init_db
from backend.data.models import SimulationRun

router = APIRouter()

CityId = Literal["DEL", "MUM", "BLR", "CHN", "HYD", "KOL"]
PolicyText = Annotated[str, Field(min_length=10, max_length=2_000)]

CITY_PRIMARY_ZONES: dict[str, str] = {
    "DEL": "DEL_SHAHDARA",
    "MUM": "MUM_DHARAVI",
    "BLR": "BLR_WHITEFIELD",
    "CHN": "CHN_OMR",
    "HYD": "HYD_HITECH",
    "KOL": "KOL_HOWRAH",
}

CITY_ID_ALIASES: dict[str, CityId] = {
    "DEL": "DEL",
    "DELHI": "DEL",
    "MUM": "MUM",
    "MUMBAI": "MUM",
    "BLR": "BLR",
    "BENGALURU": "BLR",
    "BANGALORE": "BLR",
    "CHN": "CHN",
    "CHENNAI": "CHN",
    "HYD": "HYD",
    "HYDERABAD": "HYD",
    "KOL": "KOL",
    "KOLKATA": "KOL",
}


class SimulationRequest(BaseModel):
    city_id: CityId = "DEL"
    policy_text: PolicyText = (
        "Indian Railways increases suburban fares by 20% effective from next month"
    )
    time_horizon_days: Annotated[int, Field(ge=1, le=90)] = 30
    population_size: Annotated[int, Field(ge=100, le=10_000)] = 10_000
    seed: Annotated[int, Field(ge=0, le=2_147_483_647)] = 42

    @field_validator("city_id", mode="before")
    @classmethod
    def normalize_city_id(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = value.strip().replace("-", "_").upper()
            return CITY_ID_ALIASES.get(normalized, normalized)
        return value


class CounterfactualRequest(BaseModel):
    base_simulation_id: Annotated[str, Field(min_length=4, max_length=64)]
    branch_point_day: Annotated[int, Field(ge=0, le=90)] = 0
    modified_policy_text: PolicyText = (
        "Indian Railways increases suburban fares by 10% effective from next month"
    )
    seed: Annotated[int, Field(ge=0, le=2_147_483_647)] = 43


class CrisisRequest(BaseModel):
    crisis_type: Literal["flood", "railway_strike", "fuel_crisis", "pandemic", "exam_leak"]


_simulations: dict[str, dict] = {}
_active_engines: dict[str, SimulationEngine] = {}
_request_windows: dict[str, deque[float]] = defaultdict(deque)
_cache: dict[str, list[dict]] = {}
_MAX_STORED_RUNS = 100
_MAX_CACHE_ENTRIES = 32


def _enforce_rate_limit(request: Request, limit: int = 20, window_seconds: int = 60) -> None:
    client = request.client.host if request.client else "unknown"
    now = time.monotonic()
    window = _request_windows[client]
    while window and now - window[0] > window_seconds:
        window.popleft()
    if len(window) >= limit:
        raise HTTPException(status_code=429, detail="Simulation rate limit exceeded")
    window.append(now)


def _cache_key(request: SimulationRequest) -> str:
    return "|".join(
        [
            request.city_id,
            request.policy_text.strip().lower(),
            str(request.time_horizon_days),
            str(request.population_size),
            str(request.seed),
        ]
    )


def _trim_store(store: dict, max_entries: int) -> None:
    while len(store) > max_entries:
        store.pop(next(iter(store)))


async def _policy_params(policy_text: str) -> tuple[dict, dict]:
    parsed = await PolicyParser(openai_api_key=None).parse(policy_text)
    magnitude = float(parsed.magnitude)
    text_lower = policy_text.lower()
    if (
        any(word in text_lower for word in ("wage +", "wage increase", "increases mgnrega"))
        or ("mgnrega" in text_lower and "wage" in text_lower and "increase" in text_lower)
    ):
        magnitude = -15.0
    elif "waive" in text_lower:
        magnitude = -8.0
    elif "free" in text_lower:
        magnitude = -11.0
    elif magnitude == 0 and any(word in text_lower for word in ("fuel", "petrol", "diesel")):
        magnitude = 15.0
    elif magnitude == 0 and "odd-even" in text_lower:
        magnitude = 18.0
    elif magnitude == 0 and any(word in text_lower for word in ("online", "biometric")):
        magnitude = 8.0
    elif magnitude == 0 and any(word in text_lower for word in ("removed", "return to office")):
        magnitude = 12.0

    # Parse active exemptions
    exemptions = {}
    if any(word in text_lower for word in ("exempt", "concession", "relief for", "free for")):
        if "student" in text_lower or "aspirant" in text_lower:
            exemptions["student"] = True
        if any(word in text_lower for word in ("bpl", "low income", "poor", "vulnerable", "daily wage")):
            exemptions["bpl"] = True
        if any(word in text_lower for word in ("senior", "retire", "elderly", "aged")):
            exemptions["retired"] = True

    params = {
        "fare_change_pct": magnitude,
        "phase_in_days": max(1, min(parsed.timeline_days, 90)) if "phase" in text_lower else 1,
        "policy_type": parsed.policy_type,
        "exemptions": exemptions,
    }
    metadata = {
        "policy_type": parsed.policy_type,
        "magnitude": magnitude,
        "timeline_days": parsed.timeline_days,
        "affected_modes": parsed.affected_modes,
        "affected_population_segments": parsed.affected_population_segments,
        "exemptions": exemptions,
    }
    return params, metadata


def _agent_feed(step: StepResult, zone_id: str) -> list[dict]:
    feed = []
    for agent_id, action in list(step.tier1_decisions.items())[:8]:
        sentiment = step.agent_sentiments.get(agent_id, 0.0)
        if action == "protest_join":
            decision_type = "resistance"
        elif action == "no_change":
            decision_type = "adaptation"
        elif sentiment < -0.3:
            decision_type = "stress"
        else:
            decision_type = "adaptation"
        feed.append(
            {
                "name": agent_id,
                "zone": zone_id,
                "decision": action.replace("_", " "),
                "type": decision_type,
            }
        )
    for broadcast in step.tier2_broadcasts[:3]:
        feed.append(
            {
                "name": broadcast["source_id"],
                "zone": zone_id,
                "decision": broadcast["broadcast_type"].replace("_", " "),
                "type": "broadcast",
            }
        )
    return feed


def _network_sample(step: StepResult, zone_id: str) -> list[dict]:
    nodes = []
    
    # 1. Tier 1 agents
    t1_ids = list(step.tier1_decisions.keys())[:40]
    for aid in t1_ids:
        action = step.tier1_decisions.get(aid, "no_change")
        sentiment = step.agent_sentiments.get(aid, 0.0)
        parts = aid.split("_")
        arch = parts[1] if len(parts) > 1 else "formal"
        nodes.append({
            "id": aid,
            "archetype": arch.replace("_", " ").title(),
            "sentiment": sentiment,
            "tier": 1,
            "action": action,
        })
        
    # 2. Tier 2 agents
    for t2 in step.tier2_broadcasts[:7]:
        nodes.append({
            "id": t2.get("source_id", "T2_AGENT"),
            "archetype": t2.get("agent_type", "Opinion Leader").replace("_", " ").title(),
            "sentiment": t2.get("sentiment", 0.0),
            "tier": 2,
            "action": "broadcast",
        })
        
    # 3. Tier 3 agents
    for t3 in step.tier3_decisions[:3]:
        nodes.append({
            "id": t3.get("agent_id", "T3_AGENT"),
            "archetype": t3.get("role", "Cognitive Elite").replace("_", " ").title(),
            "sentiment": -0.1 if "review" in t3.get("recommendation", "") else 0.1,
            "tier": 3,
            "action": t3.get("recommendation", "maintain_policy"),
        })
        
    return nodes


def _score_run(final_metrics: dict, magnitude: float) -> int:
    modal_shift = final_metrics.get("modal_shift_pct", 0.0)
    protest = final_metrics.get("protest_probability", 0.0)
    revenue_loss = abs(min(0.0, final_metrics.get("revenue_impact_pct", 0.0)))
    equity = final_metrics.get("equity_impact_by_income_decile", {})
    lower_decile_harm = abs(min(0.0, sum(equity.get(f"D{i}", 0.0) for i in range(1, 4)) / 3))
    magnitude_penalty = min(abs(magnitude) / 100.0, 1.0) * 8
    return round(
        max(
            0,
            min(
                100,
                92
                - modal_shift * 120
                - protest * 100
                - revenue_loss * 70
                - lower_decile_harm * 60
                - magnitude_penalty,
            ),
        )
    )


def _recommendations(final_metrics: dict, score: int) -> dict:
    modal_shift = final_metrics.get("modal_shift_pct", 0.0)
    equity = final_metrics.get("equity_impact_by_income_decile", {})
    lower_harm = abs(min(0.0, sum(equity.get(f"D{i}", 0.0) for i in range(1, 4)) / 3))
    necessary = []
    if lower_harm > 0.05:
        necessary.append(
            {
                "title": "Protect lower-income households",
                "scoreDelta": 10,
                "explanation": "Targeted exemptions remove the largest measured equity penalty.",
                "affects": "Income deciles D1-D3",
            }
        )
    if modal_shift > 0.10:
        necessary.append(
            {
                "title": "Phase implementation over 60 days",
                "scoreDelta": 8,
                "explanation": "A phased rollout reduces abrupt mode switching and revenue loss.",
                "affects": "Transit-dependent citizens",
            }
        )
    improvements = [
        {
            "title": "Publish a measurable review trigger",
            "scoreDelta": 5,
            "explanation": "Commit to revisiting the policy when computed harm thresholds are crossed.",
            "affects": "All affected groups",
        },
        {
            "title": "Add a citizen feedback channel",
            "scoreDelta": 4,
            "explanation": "Ground observations can be compared with simulated outcomes during rollout.",
            "affects": "Government monitoring",
        },
    ]
    excellence = [
        {
            "title": "Run a counterfactual pilot",
            "scoreDelta": 4,
            "explanation": "Compare the current policy with a lower-magnitude or phased alternative.",
            "affects": "Policy design team",
        }
    ]
    return {
        "necessary": necessary,
        "improvements": improvements,
        "excellence": excellence,
        "revisedScore": min(95, score + sum(item["scoreDelta"] for item in necessary)),
        "goldScore": min(
            98,
            score
            + sum(item["scoreDelta"] for item in necessary + improvements + excellence),
        ),
    }


def _summary(final_metrics: dict, score: int, recommendations: dict) -> dict:
    modal_shift = final_metrics.get("modal_shift_pct", 0.0)
    protest = final_metrics.get("protest_probability", 0.0)
    revenue = final_metrics.get("revenue_impact_pct", 0.0)
    by_archetype = final_metrics.get("modal_shift_by_archetype", {})
    most_affected = max(by_archetype, key=by_archetype.get) if by_archetype else "none"
    verdict = "Apply as-is" if score >= 80 else "Apply with changes" if score >= 55 else "Redesign recommended"
    return {
        "score": score,
        "verdict": verdict,
        "impact_cards": [
            {"category": "MODAL SHIFT", "value": f"{modal_shift:.1%}", "color": "#ffb347", "explanation": "Share of agents changing their travel behaviour."},
            {"category": "PROTEST PROBABILITY", "value": f"{protest:.1%}", "color": "#ff0055" if protest > 0.35 else "#ffb347", "explanation": "Observed protest participation signal in the final simulation step."},
            {"category": "REVENUE IMPACT", "value": f"{revenue:+.1%}", "color": "#1aad6e" if revenue >= 0 else "#ff0055", "explanation": "Estimated change from mode switching and trip consolidation."},
            {"category": "MOST AFFECTED", "value": most_affected.replace("_", " ").title(), "color": "#e2e2e8", "explanation": "Archetype with the largest computed modal shift."},
        ],
        "why_this_score": [
            f"The score is computed from final-day modal shift ({modal_shift:.1%}), protest signals ({protest:.1%}), revenue impact ({revenue:+.1%}), and lower-income equity impact.",
            "Every displayed metric came from the selected city configuration, submitted policy text, population size, and random seed.",
        ],
        "validation_note": "Computed engine output. Treat as a stress-test signal, not a prediction or implementation approval.",
        "recommendations": recommendations,
    }


async def _compute_run(simulation_request: SimulationRequest, sim_id: str) -> list[dict]:
    params, policy_metadata = await _policy_params(simulation_request.policy_text)
    zone_id = CITY_PRIMARY_ZONES[simulation_request.city_id]
    engine = SimulationEngine()
    _active_engines[sim_id] = engine
    
    # Pre-configure engine identifiers for overrides
    engine.active_crisis_overrides["city_id"] = simulation_request.city_id
    
    events: list[dict] = []
    final_metrics: dict = {}
    
    metrics_history = []
    alerts = []
    agent_feed = []

    # Save initial simulation state to SQLite DB
    async with AsyncSessionLocal() as session:
        db_run = SimulationRun(
            simulation_id=sim_id,
            city_id=simulation_request.city_id,
            policy_text=simulation_request.policy_text,
            time_horizon_days=simulation_request.time_horizon_days,
            population_size=simulation_request.population_size,
            seed=simulation_request.seed,
            status="running",
        )
        session.add(db_run)
        await session.commit()

    try:
        async for step in engine.run_scenario(
            zone_id,
            params,
            time_horizon_days=simulation_request.time_horizon_days,
            population_size=simulation_request.population_size,
            seed=simulation_request.seed,
        ):
            final_metrics = step.metrics
            feed_entry = _agent_feed(step, zone_id)
            
            metrics_history.append(step.metrics)
            alerts.extend(step.alerts)
            agent_feed.extend(feed_entry)

            # Limit feed list to latest 50 to avoid massive log payloads
            if len(agent_feed) > 50:
                agent_feed = agent_feed[-50:]

            events.append(
                {
                    "event": "day_update",
                    "simulation_id": sim_id,
                    "computed": True,
                    "day": step.day,
                    "metrics": step.metrics,
                    "alerts": step.alerts,
                    "agent_feed": feed_entry,
                    "tier2_broadcast_count": len(step.tier2_broadcasts),
                    "tier3_decisions": step.tier3_decisions[:5],
                    "network_sample": _network_sample(step, zone_id),
                }
            )

        score = _score_run(final_metrics, policy_metadata["magnitude"])
        recommendations = _recommendations(final_metrics, score)
        summary_data = _summary(final_metrics, score, recommendations)
        
        events.append(
            {
                "event": "sim_complete",
                "simulation_id": sim_id,
                "computed": True,
                "metrics": final_metrics,
                "policy": policy_metadata,
                "summary": summary_data,
            }
        )

        # Write completed runs to SQLite DB
        async with AsyncSessionLocal() as session:
            db_run = await session.get(SimulationRun, sim_id)
            if db_run:
                db_run.status = "complete"
                db_run.score = score
                db_run.verdict = summary_data["verdict"]
                db_run.metrics_history_json = json.dumps(metrics_history)
                db_run.alerts_json = json.dumps(alerts)
                db_run.agent_feed_json = json.dumps(agent_feed)
                db_run.summary_json = json.dumps(summary_data)
                db_run.causal_trace_json = json.dumps(getattr(engine, "causal_trace_log", {}))
                await session.commit()

        return events
    except Exception as exc:
        async with AsyncSessionLocal() as session:
            db_run = await session.get(SimulationRun, sim_id)
            if db_run:
                db_run.status = "error"
                await session.commit()
        raise exc
    finally:
        _active_engines.pop(sim_id, None)


@router.get("/cities")
async def list_cities():
    return {"cities": CITIES}


@router.get("/simulations")
async def list_simulations():
    """List past completed runs from database."""
    await init_db()
    async with AsyncSessionLocal() as session:
        statement = select(SimulationRun).order_by(desc(SimulationRun.created_at)).limit(30)
        result = await session.execute(statement)
        runs = result.scalars().all()
        return {"simulations": [run.to_dict() for run in runs]}


@router.get("/simulations/{simulation_id}")
async def get_simulation(simulation_id: str):
    # Try local cache
    simulation = _simulations.get(simulation_id)
    if simulation:
        return simulation

    # Query DB
    await init_db()
    async with AsyncSessionLocal() as session:
        db_run = await session.get(SimulationRun, simulation_id)
        if not db_run:
            raise HTTPException(status_code=404, detail="Simulation not found")
            
        data = db_run.to_dict()
        
        # Format database record to mimic standard cached event output
        metrics = data["metrics_history"][-1] if data["metrics_history"] else {}
        policy_params, policy_meta = await _policy_params(data["policy_text"])
        
        return {
            "event": "sim_complete",
            "simulation_id": data["simulation_id"],
            "computed": True,
            "metrics": metrics,
            "metrics_history": data["metrics_history"],
            "policy": policy_meta,
            "summary": data["summary"] or {},
            "request": {
                "city_id": data["city_id"],
                "policy_text": data["policy_text"],
                "time_horizon_days": data["time_horizon_days"],
                "population_size": data["population_size"],
                "seed": data["seed"],
            }
        }


@router.post("/simulate")
async def run_simulation(simulation_request: SimulationRequest, request: Request):
    _enforce_rate_limit(request)
    await init_db()
    sim_id = str(uuid.uuid4())[:8]
    cache_key = _cache_key(simulation_request)

    async def event_stream():
        yield f"data: {json.dumps({'event': 'sim_start', 'simulation_id': sim_id, 'computed': True, **simulation_request.model_dump()})}\n\n"
        try:
            events = _cache.get(cache_key)
            if events is None:
                events = await _compute_run(simulation_request, sim_id)
                _cache[cache_key] = events
                _trim_store(_cache, _MAX_CACHE_ENTRIES)
            for cached_event in events:
                if await request.is_disconnected():
                    break
                event = {**cached_event, "simulation_id": sim_id}
                yield f"data: {json.dumps(event)}\n\n"
                await asyncio.sleep(0)
            if events:
                _simulations[sim_id] = {**events[-1], "request": simulation_request.model_dump()}
                _trim_store(_simulations, _MAX_STORED_RUNS)
        except Exception:
            yield f"data: {json.dumps({'event': 'sim_error', 'simulation_id': sim_id, 'message': 'Simulation could not be completed'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/counterfactual")
async def run_counterfactual(counterfactual: CounterfactualRequest, request: Request):
    _enforce_rate_limit(request)
    base = _simulations.get(counterfactual.base_simulation_id)
    if not base:
        # Check SQLite
        await init_db()
        async with AsyncSessionLocal() as session:
            db_run = await session.get(SimulationRun, counterfactual.base_simulation_id)
            if db_run:
                base = {
                    "request": {
                        "city_id": db_run.city_id,
                        "policy_text": db_run.policy_text,
                        "time_horizon_days": db_run.time_horizon_days,
                        "population_size": db_run.population_size,
                        "seed": db_run.seed
                    }
                }
    
    if not base:
        raise HTTPException(status_code=404, detail="Base simulation not found")
        
    base_request = base["request"]
    modified = SimulationRequest(
        **{
            **base_request,
            "policy_text": counterfactual.modified_policy_text,
            "seed": counterfactual.seed,
        }
    )
    return await run_simulation(modified, request)


@router.post("/simulations/{simulation_id}/inject-crisis")
async def inject_crisis(simulation_id: str, crisis_req: CrisisRequest):
    engine = _active_engines.get(simulation_id)
    if not engine:
        raise HTTPException(
            status_code=404, 
            detail="Active simulation not found or already completed."
        )
    
    from backend.agents.redteam_agent import RedTeamAgent
    red_agent = RedTeamAgent()
    
    # Get active city and construct parameters
    city_id = engine.active_crisis_overrides.get("city_id", "DEL")
    zone_id = CITY_PRIMARY_ZONES.get(city_id, "DEL_SHAHDARA")
    
    mock_state = {
        "active_zones": [zone_id],
        "zone_context": {
            zone_id: {
                "geography": {"elevation_category": "low"},
                "commute_profile": {"suburban_rail_share": 0.3},
                "tier1_agent_archetype_weights": {"student": 0.2, "exam_aspirant": 0.2}
            }
        }
    }
    
    crisis_info = await red_agent.inject_crisis(crisis_req.crisis_type, mock_state)
    
    # Apply overriding values to engine parameters
    overrides = {**crisis_info.modified_params, "crisis_type_name": crisis_req.crisis_type}
    engine.active_crisis_overrides.update(overrides)
    
    return {
        "success": True, 
        "crisis": crisis_req.crisis_type, 
        "affected_zones": crisis_info.affected_zones
    }
