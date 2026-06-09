# Performance Benchmarks

The benchmark invokes the same `SimulationEngine` used by `/api/simulate`. It
builds the population and social network, then completes every requested day.

Run:

```bash
python3 -m backend.benchmarks.engine_benchmark --agents 10000 --days 30 --seed 42
```

Observed on the current development machine on 2026-06-09:

| Agents | Days | Result | Wall time |
|---:|---:|---|---:|
| 10,000 | 30 | 30 days completed | 2.23-3.05 seconds |

Results vary by machine. This is evidence for the 10,000-agent demo scale only;
it is not a claim of production concurrency or 100,000-agent capacity. API state,
rate limits, and cache remain process-local.
