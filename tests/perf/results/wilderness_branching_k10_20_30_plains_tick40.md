# Wilderness branching simulation (plains-only, tick 40 snapshot)

- Decision ticks: 10, 20, 30
- Action set per decision: 0%, 1%, 10%, 20%, 30% of current reserve troops
- Total paths: 5^3 = 125
- Evaluation tick: 40
- Metrics captured at tick 40:
  - `troops_attacking_tick40` (sum of outgoing attack troops)
  - `reserve_troops_tick40` (player reserve troops)
  - `total_area_tick40` (player owned tiles)

## Run command

```bash
npx tsx tests/perf/WildernessAttackBranching.ts > tests/perf/results/wilderness_branching_k10_20_30_plains_tick40.csv
```

## Runtime observed

- Simulated 125 paths in ~0.76s (~6.10ms/path) on this environment.

## Notes

- The script uses `big_plains` and ensures the player owns one seed land tile before decisions begin.
- CSV output is deterministic for this setup.
