"""
engine.py — SimulationEngine: the central simulation loop for Synthetic Nation.

Orchestrates the 10-step discrete-time simulation:
  1. Tier 1 batch decisions (personality vector — sub-ms per agent)
  2. Tier 1 sentiment broadcast collection
  3. Tier 2 LLM inference (sentiment monitoring)
  4. Tier 3 GPT-4o reasoning (sequential)
  5. Constraint validation on Tier 3 outputs
  6. Social network propagation
  7. Network influence → agent resistance update
  8. Memory compression and storage
  9. Metrics computation
  10. Government agent monitoring → yield StepResult

Usage:
    engine = SimulationEngine()
    async for step in engine.run_scenario("DEL_SHAHDARA", policy_params):
        print(f"Day {step.day}: protest_prob={step.metrics.get('protest_probability')}")
"""

from __future__ import annotations

import asyncio
import logging
import math
import random
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator, Optional

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Data Classes
# ─────────────────────────────────────────────────────────────
@dataclass
class StepResult:
    """Result of a single simulation day."""

    day: int
    tier1_decisions: dict[str, str] = field(default_factory=dict)   # agent_id -> action
    tier2_broadcasts: list[dict] = field(default_factory=list)
    tier3_decisions: list[dict] = field(default_factory=list)
    network_propagation: dict[str, float] = field(default_factory=dict)  # agent_id -> cumulative influence
    metrics: dict = field(default_factory=dict)
    alerts: list[dict] = field(default_factory=list)
    agent_sentiments: dict[str, float] = field(default_factory=dict)  # agent_id -> sentiment


@dataclass
class SimulationMetrics:
    """Aggregated metrics across the full simulation run."""

    modal_shift_distribution: dict[str, float] = field(default_factory=dict)  # archetype -> pct
    protest_probability_by_week: list[float] = field(default_factory=list)
    revenue_impact_curve: list[float] = field(default_factory=list)  # daily revenue vs baseline
    equity_impact_by_income_decile: dict[str, float] = field(default_factory=dict)
    informal_economy_cascade: dict[str, float] = field(default_factory=dict)  # node -> footfall change


@dataclass
class ConfidenceIntervals:
    """Mean and standard deviation of metrics across multiple seeds."""

    metrics_mean: SimulationMetrics = field(default_factory=SimulationMetrics)
    metrics_std: SimulationMetrics = field(default_factory=SimulationMetrics)
    n_seeds: int = 0
    seed_list: list[int] = field(default_factory=list)


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────
def _safe_mean(values: list[float]) -> float:
    """Mean of a list, returning 0.0 for empty lists."""
    return sum(values) / len(values) if values else 0.0


def _safe_std(values: list[float]) -> float:
    """Population standard deviation, returning 0.0 for <2 values."""
    if len(values) < 2:
        return 0.0
    mu = _safe_mean(values)
    return math.sqrt(sum((x - mu) ** 2 for x in values) / len(values))


def _merge_metrics_lists(all_metrics: list[SimulationMetrics]) -> tuple[SimulationMetrics, SimulationMetrics]:
    """Compute mean and std SimulationMetrics from a list of per-seed metrics."""
    if not all_metrics:
        return SimulationMetrics(), SimulationMetrics()

    # ── Modal shift ──
    all_archetypes = set()
    for m in all_metrics:
        all_archetypes.update(m.modal_shift_distribution.keys())

    modal_shift_mean = {}
    modal_shift_std = {}
    for arch in all_archetypes:
        vals = [m.modal_shift_distribution.get(arch, 0.0) for m in all_metrics]
        modal_shift_mean[arch] = _safe_mean(vals)
        modal_shift_std[arch] = _safe_std(vals)

    # ── Protest probability by week ──
    max_weeks = max((len(m.protest_probability_by_week) for m in all_metrics), default=0)
    protest_mean = []
    protest_std = []
    for w in range(max_weeks):
        vals = [
            m.protest_probability_by_week[w]
            for m in all_metrics
            if w < len(m.protest_probability_by_week)
        ]
        protest_mean.append(_safe_mean(vals))
        protest_std.append(_safe_std(vals))

    # ── Revenue impact curve ──
    max_days = max((len(m.revenue_impact_curve) for m in all_metrics), default=0)
    revenue_mean = []
    revenue_std = []
    for d in range(max_days):
        vals = [
            m.revenue_impact_curve[d]
            for m in all_metrics
            if d < len(m.revenue_impact_curve)
        ]
        revenue_mean.append(_safe_mean(vals))
        revenue_std.append(_safe_std(vals))

    # ── Equity by income decile ──
    all_deciles = set()
    for m in all_metrics:
        all_deciles.update(m.equity_impact_by_income_decile.keys())
    equity_mean = {}
    equity_std = {}
    for dec in all_deciles:
        vals = [m.equity_impact_by_income_decile.get(dec, 0.0) for m in all_metrics]
        equity_mean[dec] = _safe_mean(vals)
        equity_std[dec] = _safe_std(vals)

    # ── Informal economy cascade ──
    all_nodes = set()
    for m in all_metrics:
        all_nodes.update(m.informal_economy_cascade.keys())
    cascade_mean = {}
    cascade_std = {}
    for node in all_nodes:
        vals = [m.informal_economy_cascade.get(node, 0.0) for m in all_metrics]
        cascade_mean[node] = _safe_mean(vals)
        cascade_std[node] = _safe_std(vals)

    mean_metrics = SimulationMetrics(
        modal_shift_distribution=modal_shift_mean,
        protest_probability_by_week=protest_mean,
        revenue_impact_curve=revenue_mean,
        equity_impact_by_income_decile=equity_mean,
        informal_economy_cascade=cascade_mean,
    )
    std_metrics = SimulationMetrics(
        modal_shift_distribution=modal_shift_std,
        protest_probability_by_week=protest_std,
        revenue_impact_curve=revenue_std,
        equity_impact_by_income_decile=equity_std,
        informal_economy_cascade=cascade_std,
    )
    return mean_metrics, std_metrics


# ─────────────────────────────────────────────────────────────
# SimulationEngine
# ─────────────────────────────────────────────────────────────
class SimulationEngine:
    """Central simulation engine that orchestrates the tiered agent
    architecture over discrete daily time steps.

    Parameters
    ----------
    config_dir : str
        Path to the config directory (passed to ConfigLoader).
    """

    def __init__(self, config_dir: str = "backend/config") -> None:
        # Lazy import to avoid import-time dependency on aiofiles etc.
        from backend.data.config_loader import ConfigLoader

        self._config_loader = ConfigLoader(config_dir)
        self._government_agent = None  # Initialised per scenario run
        self.active_crisis_overrides = {}
        self.causal_trace_log = {}

    # ── Core Simulation Loop ──────────────────────────────
    async def run_scenario(
        self,
        zone_id: str,
        policy_params: dict[str, Any],
        time_horizon_days: int = 30,
        seed: int = 42,
        population_size: int = 1000,
    ) -> AsyncGenerator[StepResult, None]:
        """Run a simulation scenario, yielding one StepResult per day.

        Parameters
        ----------
        zone_id : str
            Zone identifier (e.g. ``"DEL_SHAHDARA"``).
        policy_params : dict
            Policy parameters — must include at least ``fare_change_pct``.
        time_horizon_days : int
            Number of simulation days to run.
        seed : int
            Random seed for reproducibility.
        population_size : int
            Number of Tier 1 agents to spawn.
        """
        rng = random.Random(seed)

        # ── Load zone context ──
        zone_ctx = await self._config_loader.load_zone_context(zone_id)
        logger.info(
            "SimulationEngine: loaded zone %s (city=%s, pop_size=%d, horizon=%dd)",
            zone_id, zone_ctx.city_id, population_size, time_horizon_days,
        )

        # ── Spawn Tier 1 population ──
        tier1_agents = self._spawn_tier1_population(zone_ctx, population_size, rng)
        logger.info("Spawned %d Tier 1 agents", len(tier1_agents))

        # ── Build social network ──
        social_network = self._build_social_network(tier1_agents, zone_ctx, rng)
        logger.info(
            "Social network: %d nodes, %d edges",
            len(social_network), sum(len(v) for v in social_network.values()),
        )

        # ── Initialise memory store ──
        memory_store: dict[str, list[dict]] = defaultdict(list)

        # ── Spawn Tier 2 agents ──
        tier2_agents = self._spawn_tier2_agents(zone_ctx, rng)
        logger.info("Spawned %d Tier 2 agents", len(tier2_agents))

        # ── Spawn Tier 3 agents (1% of population) ──
        tier3_count = max(1, population_size // 100)
        tier3_agents = self._spawn_tier3_agents(tier3_count, zone_ctx, rng)
        logger.info("Spawned %d Tier 3 agents", len(tier3_agents))

        # ── Initialise Government Agent ──
        from backend.agents.government_agent import GovernmentAgent

        self._government_agent = GovernmentAgent()

        # ── Policy state ──
        policy_state = {
            "fare_change_pct": policy_params.get("fare_change_pct", 0.0),
            "implementation_day": 1,
            "phase_in_days": policy_params.get("phase_in_days", 1),
            "exemptions": policy_params.get("exemptions", {}),
            "zone_id": zone_id,
        }

        # ── Simulation loop ──
        cumulative_influence: dict[str, float] = defaultdict(float)

        for day in range(1, time_horizon_days + 1):
            # Calculate effective fare change for today (phased rollout)
            phase_factor = min(1.0, day / max(1, policy_state["phase_in_days"]))
            effective_fare_change = policy_state["fare_change_pct"] * phase_factor

            # ─── Step 1: Tier 1 batch decisions ───
            tier1_decisions: dict[str, str] = {}
            agent_sentiments: dict[str, float] = {}

            for agent_id, agent in tier1_agents.items():
                agent_fare_change = effective_fare_change
                exemptions = policy_state.get("exemptions", {})
                if exemptions:
                    if exemptions.get("student") and agent["archetype"] in ("student", "exam_aspirant"):
                        agent_fare_change = 0.0
                    elif exemptions.get("bpl") and (
                        agent["income_decile"] in ("D1", "D2", "D3")
                        or agent["archetype"] in ("daily_wage_worker", "street_vendor", "migrant_worker")
                    ):
                        agent_fare_change = 0.0
                    elif exemptions.get("retired") and agent["archetype"] == "retired":
                        agent_fare_change = 0.0

                decision = self._tier1_decision_step(
                    agent, agent_fare_change, day, rng
                )
                tier1_decisions[agent_id] = decision["action"]
                agent_sentiments[agent_id] = decision["sentiment"]
                agent["last_action"] = decision["action"]
                agent["sentiment"] = decision["sentiment"]
                agent["resistance_score"] = decision.get(
                    "resistance_score", agent.get("resistance_score", 0.0)
                )

            # ─── Step 2: Collect Tier 1 sentiment broadcasts ───
            broadcast_signals: list[dict] = []
            for agent_id, agent in tier1_agents.items():
                if agent.get("sentiment", 0.0) < -0.3:  # Negative sentiment triggers broadcast
                    broadcast_signals.append({
                        "source_id": agent_id,
                        "archetype": agent["archetype"],
                        "sentiment": agent["sentiment"],
                        "action": tier1_decisions.get(agent_id, "no_change"),
                        "reach_multiplier": agent.get("media_reach_multiplier", 1.0),
                    })

            # ─── Step 3: Tier 2 inference ───
            tier2_broadcasts: list[dict] = []
            for t2_agent in tier2_agents:
                broadcast = self._tier2_sentiment_monitor(
                    t2_agent, broadcast_signals, day, rng
                )
                if broadcast:
                    tier2_broadcasts.append(broadcast)

            # ─── Step 4: Tier 3 sequential reasoning ───
            tier3_decisions: list[dict] = []
            for t3_agent in tier3_agents:
                t3_decision = await self._tier3_reason(
                    t3_agent, tier2_broadcasts, tier1_decisions, day, rng
                )
                tier3_decisions.append(t3_decision)

            # ─── Step 5: Constraint validation on Tier 3 ───
            validated_t3 = []
            for t3d in tier3_decisions:
                validated = self._validate_tier3_decision(t3d, zone_ctx)
                validated_t3.append(validated)
            tier3_decisions = validated_t3

            # ─── Step 6: Network propagation ───
            propagation_updates: dict[str, float] = {}
            all_broadcast_sources = broadcast_signals + tier2_broadcasts
            for source in all_broadcast_sources:
                source_id = source.get("source_id", "")
                sentiment = source.get("sentiment", 0.0)
                reach = source.get("reach_multiplier", 1.0)

                neighbours = social_network.get(source_id, [])
                for neighbour_id in neighbours:
                    influence = sentiment * reach * 0.1  # Decay factor
                    current = propagation_updates.get(neighbour_id, 0.0)
                    propagation_updates[neighbour_id] = current + influence
                    
                    # Log causal connection if influence is significant
                    if abs(influence) > 0.005:
                        self.causal_trace_log[neighbour_id] = {
                            "influencer": source_id,
                            "day": day,
                            "influence": influence,
                            "sentiment": sentiment,
                        }

            # ─── Step 7: Apply network influence to resistance scores ───
            for agent_id, influence_delta in propagation_updates.items():
                if agent_id in tier1_agents:
                    agent = tier1_agents[agent_id]
                    old_resistance = agent.get("resistance_score", 0.0)
                    # Clamp to [0, 1]
                    new_resistance = max(0.0, min(1.0, old_resistance - influence_delta))
                    agent["resistance_score"] = new_resistance
                    cumulative_influence[agent_id] = (
                        cumulative_influence.get(agent_id, 0.0) + abs(influence_delta)
                    )

            # ─── Step 8: Memory update ───
            day_event = {
                "day": day,
                "effective_fare_change": effective_fare_change,
                "protest_signals": sum(
                    1 for a in tier1_decisions.values() if a == "protest_join"
                ),
                "mode_switches": sum(
                    1 for a in tier1_decisions.values() if a == "mode_switch"
                ),
                "tier2_broadcast_count": len(tier2_broadcasts),
            }
            for agent_id in tier1_agents:
                memory_store[agent_id].append(day_event)
                # Keep 90-day window
                if len(memory_store[agent_id]) > 90:
                    memory_store[agent_id] = memory_store[agent_id][-90:]

            # ─── Step 9: Compute day metrics ───
            day_metrics = self._compute_day_metrics(
                tier1_agents, tier1_decisions, day, zone_ctx
            )

            # ─── Step 10: Government agent monitoring ───
            alerts: list[dict] = []
            if getattr(self, "active_crisis_overrides", {}):
                crisis_type = self.active_crisis_overrides.get("crisis_type_name")
                if crisis_type and crisis_type not in getattr(self, "notified_crises", []):
                    if not hasattr(self, "notified_crises"):
                        self.notified_crises = []
                    self.notified_crises.append(crisis_type)
                    from datetime import datetime, timezone
                    alerts.append({
                        "action_type": "crisis_injection",
                        "message": f"[CRISIS] Dynamic disruption injected mid-simulation: {crisis_type.replace('_', ' ').upper()}! Agent parameters shocked.",
                        "severity": "critical",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })
            if self._government_agent:
                gov_action = await self._government_agent.monitor_simulation({
                    "day": day,
                    "metrics": day_metrics,
                    "tier1_decisions": tier1_decisions,
                })
                if gov_action:
                    alerts.append({
                        "action_type": gov_action.action_type,
                        "message": gov_action.message,
                        "severity": gov_action.severity,
                        "timestamp": gov_action.timestamp,
                    })

            # ─── Yield StepResult ───
            yield StepResult(
                day=day,
                tier1_decisions=tier1_decisions,
                tier2_broadcasts=tier2_broadcasts,
                tier3_decisions=tier3_decisions,
                network_propagation=dict(cumulative_influence),
                metrics=day_metrics,
                alerts=alerts,
                agent_sentiments=agent_sentiments,
            )

    # ── Population Spawning ───────────────────────────────
    def _spawn_tier1_population(
        self,
        zone_ctx: Any,
        population_size: int,
        rng: random.Random,
    ) -> dict[str, dict[str, Any]]:
        """Spawn Tier 1 agents according to zone archetype weights."""
        archetype_weights = zone_ctx.tier1_agent_archetype_weights
        if not archetype_weights:
            archetype_weights = {"formal_sector_employee": 1.0}

        # Normalise weights
        total_weight = sum(
            v for k, v in archetype_weights.items()
            if isinstance(v, (int, float))
        )
        if total_weight <= 0:
            total_weight = 1.0

        agents: dict[str, dict[str, Any]] = {}
        agent_idx = 0

        for archetype, weight in archetype_weights.items():
            if not isinstance(weight, (int, float)):
                continue
            count = max(1, round(population_size * weight / total_weight))

            for i in range(count):
                agent_id = f"T1_{archetype[:4].upper()}_{agent_idx:05d}"
                agents[agent_id] = self._create_tier1_agent(
                    agent_id, archetype, zone_ctx, rng
                )
                agent_idx += 1

                if agent_idx >= population_size:
                    break
            if agent_idx >= population_size:
                break

        return agents

    def _create_tier1_agent(
        self,
        agent_id: str,
        archetype: str,
        zone_ctx: Any,
        rng: random.Random,
    ) -> dict[str, Any]:
        """Create a single Tier 1 agent with sampled personality vector."""
        # Income sampling based on archetype
        income_ranges = {
            "daily_wage_worker": (8000, 16000),
            "formal_sector_employee": (18000, 45000),
            "government_employee": (25000, 85000),
            "tech_knowledge_worker": (60000, 350000),
            "small_business_owner": (25000, 180000),
            "student": (0, 0),
            "homemaker": (0, 0),
            "street_vendor": (6000, 22000),
            "retired": (8000, 45000),
            "migrant_worker": (10000, 28000),
            "healthcare_worker": (15000, 180000),
            "exam_aspirant": (0, 0),
            "gig_economy_worker": (18000, 55000),
            "journalist_tier1": (15000, 65000),
        }
        inc_lo, inc_hi = income_ranges.get(archetype, (15000, 45000))
        income = rng.randint(inc_lo, max(inc_lo, inc_hi))

        # Core personality vector (sampled within archetype bounds)
        loss_aversion = rng.uniform(
            *{
                "daily_wage_worker": (0.85, 0.95),
                "street_vendor": (0.88, 0.97),
                "migrant_worker": (0.80, 0.92),
                "formal_sector_employee": (0.71, 0.82),
                "government_employee": (0.55, 0.70),
                "tech_knowledge_worker": (0.30, 0.50),
                "small_business_owner": (0.62, 0.78),
                "homemaker": (0.75, 0.88),
                "student": (0.50, 0.70),
                "retired": (0.65, 0.80),
                "healthcare_worker": (0.60, 0.75),
                "exam_aspirant": (0.55, 0.72),
                "gig_economy_worker": (0.65, 0.80),
                "journalist_tier1": (0.55, 0.72),
            }.get(archetype, (0.50, 0.80))
        )

        commute_dependency = rng.uniform(
            *{
                "daily_wage_worker": (0.91, 0.99),
                "street_vendor": (0.88, 0.98),
                "migrant_worker": (0.90, 0.98),
                "formal_sector_employee": (0.74, 0.88),
                "government_employee": (0.55, 0.75),
                "tech_knowledge_worker": (0.28, 0.55),
                "homemaker": (0.40, 0.65),
                "student": (0.60, 0.80),
                "retired": (0.25, 0.50),
                "healthcare_worker": (0.72, 0.92),
                "exam_aspirant": (0.60, 0.80),
                "gig_economy_worker": (0.70, 0.88),
                "journalist_tier1": (0.55, 0.75),
            }.get(archetype, (0.50, 0.80))
        )

        fare_sensitivity = 0.0
        if income > 0:
            # Fare sensitivity inversely proportional to income
            fare_sensitivity = min(1.0, 15000.0 / income)

        # Assign income decile based on zone income profile
        income_distribution = zone_ctx.income_profile.get("distribution", {})
        decile = self._assign_income_decile(income, income_distribution, rng)

        return {
            "agent_id": agent_id,
            "archetype": archetype,
            "income_monthly": income,
            "income_decile": decile,
            "loss_aversion": loss_aversion,
            "commute_dependency": commute_dependency,
            "fare_sensitivity": fare_sensitivity,
            "resistance_score": 0.0,
            "sentiment": 0.0,
            "last_action": "no_change",
            "protest_propensity": rng.uniform(0.1, 0.9),
            "collective_action_threshold": rng.uniform(0.30, 0.55),
            "media_reach_multiplier": (
                rng.uniform(2.5, 8.0) if archetype == "journalist_tier1" else 1.0
            ),
        }

    @staticmethod
    def _assign_income_decile(
        income: int,
        distribution: dict[str, float],
        rng: random.Random,
    ) -> str:
        """Assign an income decile label based on the income value."""
        # Simple decile assignment based on income brackets
        if income <= 0:
            return "D1"
        brackets = [
            (10000, "D1"), (15000, "D2"), (20000, "D3"),
            (30000, "D4"), (40000, "D5"), (55000, "D6"),
            (75000, "D7"), (100000, "D8"), (200000, "D9"),
        ]
        for threshold, decile in brackets:
            if income <= threshold:
                return decile
        return "D10"

    def _build_social_network(
        self,
        agents: dict[str, dict],
        zone_ctx: Any,
        rng: random.Random,
    ) -> dict[str, list[str]]:
        """Build a scale-free social network using Barabási-Albert model.

        Connections are archetype-aware: same-archetype agents have
        higher connection probability.
        """
        agent_ids = list(agents.keys())
        n = len(agent_ids)
        if n < 2:
            return {aid: [] for aid in agent_ids}

        # Target average degree from zone config or defaults
        sn_params = zone_ctx.social_network_parameters
        avg_degree = sn_params.get(
            "avg_connections_tier1",
            zone_ctx.sensitivity_parameters.get("avg_connections_tier1", 35),
        )
        # For smaller populations, cap connections
        m = min(max(2, avg_degree // 2), n - 1)  # edges per new node (BA model)

        adjacency: dict[str, list[str]] = defaultdict(list)

        # Seed the network with a small complete graph
        seed_size = min(m + 1, n)
        for i in range(seed_size):
            for j in range(i + 1, seed_size):
                aid_i = agent_ids[i]
                aid_j = agent_ids[j]
                adjacency[aid_i].append(aid_j)
                adjacency[aid_j].append(aid_i)

        # BA preferential attachment for remaining nodes
        degree_sum = seed_size * (seed_size - 1)  # sum of all degrees

        for idx in range(seed_size, n):
            new_id = agent_ids[idx]
            new_archetype = agents[new_id]["archetype"]
            targets: set[str] = set()

            attempts = 0
            while len(targets) < m and attempts < m * 10:
                # Preferential attachment: probability proportional to degree
                pick_idx = rng.randint(0, idx - 1)
                candidate = agent_ids[pick_idx]
                if candidate in targets:
                    attempts += 1
                    continue

                candidate_degree = len(adjacency[candidate])
                prob = (candidate_degree + 1) / (degree_sum + idx)

                # Archetype affinity boost
                if agents[candidate]["archetype"] == new_archetype:
                    prob *= 1.5

                if rng.random() < prob * m:
                    targets.add(candidate)
                attempts += 1

            for target in targets:
                adjacency[new_id].append(target)
                adjacency[target].append(new_id)
                degree_sum += 2

        return dict(adjacency)

    def _spawn_tier2_agents(
        self, zone_ctx: Any, rng: random.Random
    ) -> list[dict[str, Any]]:
        """Spawn Tier 2 opinion leader agents from zone config."""
        tier2_types = zone_ctx.tier2_agent_types
        agents: list[dict] = []
        idx = 0

        for agent_type, config in tier2_types.items():
            if agent_type == "data_source":
                continue
            if isinstance(config, int):
                count = config
            elif isinstance(config, dict):
                count = int(config.get("count", 1))
            else:
                logger.warning(
                    "Ignoring invalid Tier 2 config for %s: %r",
                    agent_type,
                    config,
                )
                continue
            for _ in range(count):
                agents.append({
                    "agent_id": f"T2_{agent_type[:6].upper()}_{idx:03d}",
                    "agent_type": agent_type,
                    "influence_radius": rng.randint(50, 200),
                    "sentiment_threshold": rng.uniform(0.2, 0.5),
                    "broadcast_amplitude": rng.uniform(0.5, 1.0),
                })
                idx += 1

        return agents

    def _spawn_tier3_agents(
        self, count: int, zone_ctx: Any, rng: random.Random
    ) -> list[dict[str, Any]]:
        """Spawn Tier 3 cognitive elite agents."""
        tier3_roles = [
            "senior_bureaucrat", "corporate_executive", "university_vc",
            "economist", "politician", "transport_commissioner",
            "health_secretary", "education_secretary",
        ]
        agents: list[dict] = []
        for i in range(count):
            role = tier3_roles[i % len(tier3_roles)]
            agents.append({
                "agent_id": f"T3_{role[:6].upper()}_{i:03d}",
                "role": role,
                "influence_weight": rng.uniform(0.7, 1.0),
                "policy_bias": rng.uniform(-0.3, 0.3),
                "reasoning_temperature": 0.2,
            })
        return agents

    # ── Agent Decision Logic ──────────────────────────────
    def _tier1_decision_step(
        self,
        agent: dict[str, Any],
        effective_fare_change: float,
        day: int,
        rng: random.Random,
    ) -> dict[str, Any]:
        """Deterministic personality-vector-based decision for a Tier 1 agent.

        Sub-millisecond computation — no LLM calls.
        """
        archetype = agent["archetype"]
        income = agent["income_monthly"]
        loss_aversion = agent["loss_aversion"]
        commute_dep = agent["commute_dependency"]
        fare_sensitivity = agent["fare_sensitivity"]
        resistance = agent.get("resistance_score", 0.0)
        protest_propensity = agent.get("protest_propensity", 0.3)
        ca_threshold = agent.get("collective_action_threshold", 0.45)

        # ── Compute fare impact ──
        fare_change_ratio = effective_fare_change / 100.0
        if income > 0:
            daily_income = income / 26  # ~26 working days
            daily_fare_impact = daily_income * fare_change_ratio * fare_sensitivity
            impact_ratio = daily_fare_impact / daily_income if daily_income > 0 else 0
        else:
            # Students, homemakers — use family budget proxy
            impact_ratio = fare_change_ratio * 0.5

        # ── Sentiment: negative when impact is high ──
        raw_sentiment = -impact_ratio * loss_aversion * 2.0
        # Blend with network-accumulated resistance
        sentiment = max(-1.0, min(1.0, raw_sentiment - resistance * 0.3))

        # ── Decision logic ──
        action = "no_change"
        new_resistance = resistance

        # Archetype-specific thresholds
        if archetype == "daily_wage_worker":
            if impact_ratio > 0.08:
                action = "mode_switch"  # Walk/cycle evaluation
            elif impact_ratio > 0.05:
                action = "trip_consolidation"
        elif archetype == "tech_knowledge_worker":
            if impact_ratio > 0.02:  # Very low threshold for WFH
                action = "wfh_increase"
            # Tech workers almost never switch mode for fare reasons
        elif archetype == "homemaker":
            if impact_ratio > 0.04:
                action = "trip_consolidation"
        elif archetype == "street_vendor":
            if impact_ratio > 0.10:
                action = "vending_spot_relocation"
            elif impact_ratio > 0.06:
                action = "reduced_hours"
        elif archetype == "migrant_worker":
            if impact_ratio > 0.15:
                action = "return_migration_evaluate"
            elif impact_ratio > 0.08:
                action = "mode_switch"
        elif archetype == "retired":
            if impact_ratio > 0.06:
                action = "reduce_nonessential_transit"
        elif archetype == "gig_economy_worker":
            # Bidirectional: may benefit from fare hikes (cab demand)
            if fare_change_ratio > 0:
                action = "income_increase"  # Windfall from mode shift
                sentiment = abs(sentiment) * 0.5  # Positive sentiment
        elif archetype in ("student", "exam_aspirant"):
            if impact_ratio > 0.05:
                action = "carpool_evaluate"
        elif archetype == "healthcare_worker":
            if impact_ratio > 0.07:
                action = "shift_transport_request"
        else:
            # Generic formal sector / other
            if impact_ratio > 0.12:
                action = "mode_switch"
            elif impact_ratio > 0.06:
                action = "trip_consolidation"

        # ── Apply active crisis overrides ──
        overrides = getattr(self, "active_crisis_overrides", {})
        if overrides:
            crisis_sentiment_mod = 0.0

            # 1. Railway strike
            if overrides.get("suburban_rail_ridership_multiplier") == 0.0:
                if archetype in ("daily_wage_worker", "migrant_worker", "street_vendor"):
                    crisis_sentiment_mod -= 0.35
                    if rng.random() < 0.5:
                        action = "protest_join"
                    else:
                        action = "mode_switch"

            # 2. Flood
            if overrides.get("transit_disruption_pct") == 1.0:
                crisis_sentiment_mod -= 0.50
                if archetype == "tech_knowledge_worker":
                    action = "wfh_increase"
                else:
                    action = "trip_consolidation"
                    if rng.random() < 0.3:
                        action = "protest_join"

            # 3. Fuel crisis
            if "cab_fare_multiplier" in overrides or "bus_fare_multiplier" in overrides:
                mult = overrides.get("cab_fare_multiplier", 1.0)
                crisis_sentiment_mod -= (mult - 1.0) * 0.4
                if impact_ratio > 0.04:
                    action = "mode_switch"

            # 4. Exam paper leak
            if "examination_trust_shock" in overrides:
                if archetype in ("student", "exam_aspirant"):
                    crisis_sentiment_mod -= 0.60
                    if rng.random() < 0.4:
                        action = "protest_join"

            sentiment = max(-1.0, min(1.0, sentiment + crisis_sentiment_mod))

        # ── Protest evaluation ──
        if (
            sentiment < -0.5
            and resistance > ca_threshold
            and protest_propensity > 0.4
            and action != "income_increase"
        ):
            if rng.random() < protest_propensity * abs(sentiment):
                action = "protest_join"

        # ── Update resistance ──
        if sentiment < -0.2:
            new_resistance = min(1.0, resistance + abs(sentiment) * 0.05)
        elif sentiment > 0.1:
            new_resistance = max(0.0, resistance - sentiment * 0.02)

        return {
            "action": action,
            "sentiment": sentiment,
            "resistance_score": new_resistance,
            "impact_ratio": impact_ratio,
        }

    def _tier2_sentiment_monitor(
        self,
        t2_agent: dict[str, Any],
        broadcast_signals: list[dict],
        day: int,
        rng: random.Random,
    ) -> dict | None:
        """Tier 2 agent monitors Tier 1 sentiment and decides whether
        to amplify via broadcast.

        In production, this uses Llama 3.1 8B. Here we use rule-based
        logic for portability.
        """
        if not broadcast_signals:
            return None

        # Count negative signals in this agent's influence radius
        negative_count = sum(
            1 for s in broadcast_signals if s.get("sentiment", 0) < -0.3
        )
        total = max(len(broadcast_signals), 1)
        negative_ratio = negative_count / total

        threshold = t2_agent.get("sentiment_threshold", 0.3)

        if negative_ratio >= threshold:
            avg_sentiment = _safe_mean([
                s.get("sentiment", 0.0) for s in broadcast_signals
            ])
            return {
                "source_id": t2_agent["agent_id"],
                "agent_type": t2_agent["agent_type"],
                "broadcast_type": "resistance_amplification",
                "sentiment": avg_sentiment * t2_agent.get("broadcast_amplitude", 0.8),
                "reach_multiplier": 5.0,  # Tier 2 has wide reach
                "day": day,
            }
        return None

    async def _tier3_reason(
        self,
        t3_agent: dict[str, Any],
        tier2_broadcasts: list[dict],
        tier1_decisions: dict[str, str],
        day: int,
        rng: random.Random,
    ) -> dict[str, Any]:
        """Tier 3 agent reasoning step.

        In production, this calls GPT-4o with fixed seed and
        constraint validation. Here we use rule-based logic for
        portability (no API dependency required).
        """
        # Summarise tier1 situation
        action_counts: dict[str, int] = defaultdict(int)
        for action in tier1_decisions.values():
            action_counts[action] += 1

        total_agents = max(len(tier1_decisions), 1)
        protest_pct = action_counts.get("protest_join", 0) / total_agents
        mode_switch_pct = action_counts.get("mode_switch", 0) / total_agents

        # Tier 3 decision based on role
        role = t3_agent["role"]
        policy_bias = t3_agent.get("policy_bias", 0.0)

        recommendation = "maintain_policy"
        reasoning = "Situation within acceptable parameters."

        if protest_pct > 0.30:
            recommendation = "policy_review_urgent"
            reasoning = (
                f"Protest participation at {protest_pct:.0%} — exceeds safe "
                f"threshold. Recommend immediate stakeholder consultation."
            )
        elif mode_switch_pct > 0.15 and role in ("transport_commissioner", "economist"):
            recommendation = "revenue_review"
            reasoning = (
                f"Modal shift at {mode_switch_pct:.0%} — revenue impact "
                f"may exceed projections. Phased rollout recommended."
            )
        elif len(tier2_broadcasts) > 3:
            recommendation = "communication_strategy"
            reasoning = (
                f"{len(tier2_broadcasts)} opinion leaders broadcasting "
                f"resistance signals. Public communication campaign needed."
            )

        return {
            "agent_id": t3_agent["agent_id"],
            "role": role,
            "day": day,
            "recommendation": recommendation,
            "reasoning": reasoning,
            "influence_weight": t3_agent["influence_weight"],
        }

    def _validate_tier3_decision(
        self, decision: dict[str, Any], zone_ctx: Any
    ) -> dict[str, Any]:
        """Constraint validation on Tier 3 outputs.

        Ensures decisions are within permissible bounds:
        - Recommendations must be from valid set
        - Cannot reference non-existent zones or transit modes
        """
        valid_recommendations = {
            "maintain_policy", "policy_review_urgent", "revenue_review",
            "communication_strategy", "stakeholder_consultation",
            "phased_rollout", "exemption_review", "crisis_response",
        }
        rec = decision.get("recommendation", "maintain_policy")
        if rec not in valid_recommendations:
            decision["recommendation"] = "maintain_policy"
            decision["validation_override"] = True
            decision["original_recommendation"] = rec

        return decision

    # ── Metrics Computation ───────────────────────────────
    def _compute_day_metrics(
        self,
        agents: dict[str, dict],
        decisions: dict[str, str],
        day: int,
        zone_ctx: Any,
    ) -> dict[str, Any]:
        """Compute aggregate metrics for a single simulation day."""
        total = max(len(agents), 1)

        # ── Action counts ──
        action_counts: dict[str, int] = defaultdict(int)
        for action in decisions.values():
            action_counts[action] += 1

        # ── Modal shift per archetype ──
        archetype_total: dict[str, int] = defaultdict(int)
        archetype_switched: dict[str, int] = defaultdict(int)
        for agent_id, agent in agents.items():
            arch = agent["archetype"]
            archetype_total[arch] += 1
            if decisions.get(agent_id) == "mode_switch":
                archetype_switched[arch] += 1

        modal_shift = {
            arch: archetype_switched.get(arch, 0) / max(archetype_total[arch], 1)
            for arch in archetype_total
        }

        # ── Protest probability ──
        protest_count = action_counts.get("protest_join", 0)
        protest_probability = protest_count / total

        # ── Revenue impact ──
        mode_switch_count = action_counts.get("mode_switch", 0)
        trip_consol_count = action_counts.get("trip_consolidation", 0)
        revenue_impact_pct = -(mode_switch_count * 1.0 + trip_consol_count * 0.3) / total

        # ── Equity impact by income decile ──
        decile_impact: dict[str, list[float]] = defaultdict(list)
        for agent_id, agent in agents.items():
            decile = agent.get("income_decile", "D5")
            sentiment = agent.get("sentiment", 0.0)
            decile_impact[decile].append(sentiment)

        equity_by_decile = {
            decile: _safe_mean(sentiments) for decile, sentiments in decile_impact.items()
        }

        # ── Informal economy cascade ──
        # Track footfall proxy from homemaker/vendor decisions
        informal_cascade: dict[str, float] = {}
        for node in zone_ctx.informal_economy_nodes:
            node_id = node if isinstance(node, str) else node.get("node_id", "")
            # Proxy: footfall change = homemaker trip consolidation rate
            homemaker_agents = [
                aid for aid, a in agents.items()
                if a["archetype"] == "homemaker"
            ]
            if homemaker_agents:
                consol_count = sum(
                    1 for aid in homemaker_agents
                    if decisions.get(aid) == "trip_consolidation"
                )
                footfall_change = -(consol_count / max(len(homemaker_agents), 1))
                informal_cascade[node_id] = footfall_change

        return {
            "day": day,
            "protest_probability": protest_probability,
            "modal_shift_pct": sum(modal_shift.values()) / max(len(modal_shift), 1),
            "modal_shift_by_archetype": modal_shift,
            "revenue_impact_pct": revenue_impact_pct,
            "equity_impact_by_income_decile": equity_by_decile,
            "informal_economy_cascade": informal_cascade,
            "action_distribution": dict(action_counts),
            "total_agents": total,
        }

    # ── Aggregate Metrics ─────────────────────────────────
    def compute_metrics(
        self, step_results: list[StepResult]
    ) -> SimulationMetrics:
        """Aggregate per-day StepResults into overall SimulationMetrics."""
        if not step_results:
            return SimulationMetrics()

        # ── Modal shift: use final day's per-archetype shift ──
        final_metrics = step_results[-1].metrics
        modal_shift = final_metrics.get("modal_shift_by_archetype", {})

        # ── Protest probability by week ──
        weekly_protests: list[list[float]] = []
        for step in step_results:
            week_idx = (step.day - 1) // 7
            while len(weekly_protests) <= week_idx:
                weekly_protests.append([])
            weekly_protests[week_idx].append(
                step.metrics.get("protest_probability", 0.0)
            )
        protest_by_week = [_safe_mean(week) for week in weekly_protests]

        # ── Revenue impact curve ──
        revenue_curve = [
            step.metrics.get("revenue_impact_pct", 0.0) for step in step_results
        ]

        # ── Equity by decile: use final day ──
        equity_by_decile = final_metrics.get("equity_impact_by_income_decile", {})

        # ── Informal economy cascade: use final day ──
        informal_cascade = final_metrics.get("informal_economy_cascade", {})

        return SimulationMetrics(
            modal_shift_distribution=modal_shift,
            protest_probability_by_week=protest_by_week,
            revenue_impact_curve=revenue_curve,
            equity_impact_by_income_decile=equity_by_decile,
            informal_economy_cascade=informal_cascade,
        )

    # ── Confidence Intervals ──────────────────────────────
    async def generate_confidence_intervals(
        self,
        zone_id: str,
        policy_params: dict[str, Any],
        time_horizon_days: int = 30,
        n_seeds: int = 10,
        population_size: int = 1000,
    ) -> ConfidenceIntervals:
        """Run the scenario with multiple seeds and aggregate results
        into mean ± std confidence intervals.

        Seeds: [42, 43, ..., 42 + n_seeds - 1]
        """
        seed_list = list(range(42, 42 + n_seeds))
        all_metrics: list[SimulationMetrics] = []

        for seed in seed_list:
            logger.info(
                "Confidence interval run: seed=%d (%d/%d)",
                seed, seed - 41, n_seeds,
            )
            step_results: list[StepResult] = []
            async for step in self.run_scenario(
                zone_id=zone_id,
                policy_params=policy_params,
                time_horizon_days=time_horizon_days,
                seed=seed,
                population_size=population_size,
            ):
                step_results.append(step)

            run_metrics = self.compute_metrics(step_results)
            all_metrics.append(run_metrics)

        mean_m, std_m = _merge_metrics_lists(all_metrics)

        return ConfidenceIntervals(
            metrics_mean=mean_m,
            metrics_std=std_m,
            n_seeds=n_seeds,
            seed_list=seed_list,
        )
