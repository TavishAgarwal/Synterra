# Synthetic Nation Architecture

## Implemented Runtime

Synthetic Nation currently runs as a React frontend and FastAPI backend. The
frontend posts a city, policy, population, horizon, and seed to `/api/simulate`.
The backend parses the policy, selects a configured city zone, runs the real
`SimulationEngine`, and streams one computed SSE event per day.

## Simulation Loop

1. Load hierarchical zone, city, state, and default configuration.
2. Spawn a reproducible Tier 1 population from zone archetype weights.
3. Build a scale-free, archetype-aware social graph.
4. Compute Tier 1 personality-vector decisions.
5. Collect sentiment broadcasts.
6. Run portable rule-based Tier 2 opinion-leader reasoning.
7. Run portable rule-based Tier 3 policy reasoning.
8. Validate Tier 3 recommendations.
9. Propagate influence and update 90-day in-run memory.
10. Compute metrics and let the Government Agent check thresholds.

## Reproducibility

- The API accepts an integer seed.
- Identical input and seed produce identical engine metrics.
- Different seeds produce different populations and outcomes.
- `SimulationEngine.generate_confidence_intervals()` aggregates multi-seed runs.
- End-to-end tests enforce these properties.

## Security and Cost Controls

- Simulation request sizes and ranges are bounded with Pydantic.
- Known CORS origins and methods are explicitly configured.
- Simulation endpoints have a process-local per-client rate limit.
- Repeated identical simulations use a bounded process-local cache.
- No LLM key is exposed to the frontend.

## Current Scaling Limits

- Tier 1 decisions currently use per-agent Python loops.
- Simulation state, cache, and rate limits are process-local.
- No PostgreSQL, pgvector, Redis, task queue, or worker fleet is implemented.
- The live frontend requests 10,000 agents; API maximum is 10,000.

## Production Roadmap

1. Batch Tier 1 calculations into NumPy arrays.
2. Move runs to background workers with persistent run storage.
3. Use Redis for distributed cache, rate limits, and cancellation.
4. Add authenticated quotas and per-run cost accounting.
5. Integrate and benchmark optional Ollama/OpenAI Tier 2/3 modules.
