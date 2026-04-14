# Wilderness threshold strategy matrix (real combat, plains-only, 60s)

## Strategy set (12 total)

Threshold progressions:

- `same`: `30k, 40k, 50k, ...` (step `10k`)
- `doubling`: `30k, 50k, 70k, ...` (step `20k`)
- `halving`: `35k, 40k, 45k, ...` (step `5k`)

Attack percents:

- `1%`, `5%`, `10%`, `20%`

Total strategies = `3 * 4 = 12`.

All runs simulate `600` ticks (`60s` at `100ms/tick`).

## Outputs

- Summary CSV:
  - `tests/perf/results/wilderness_threshold_matrix_60s_summary.csv`
- Attack-event CSV (all trigger events for all strategies):
  - `tests/perf/results/wilderness_threshold_matrix_60s_events.csv`
- Scatter plot SVG:
  - `tests/perf/results/wilderness_threshold_matrix_60s_scatter.svg`

Summary includes:

- `troops_attacking_tick600`
- `reserve_troops_tick600`
- `total_troops_tick600` (= attacking + reserve)
- `total_area_tick600`
- `troop_cap_tick600`

## Run command

```bash
node --import tsx tests/perf/WildernessThresholdAttack.ts \
  > tests/perf/results/wilderness_threshold_matrix_60s_summary.csv \
  2> tests/perf/results/wilderness_threshold_matrix_60s_events.csv

node --import tsx tests/perf/WildernessThresholdScatter.ts
```
