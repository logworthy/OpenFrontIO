# Wilderness threshold strategy run (real combat, plains-only, 60s)

## Strategy

- Start sending attacks when internal reserve troops first reach `30,000`.
- Send `10%` of current reserve troops each time reserve reaches the next `+10,000` threshold (`40k`, `50k`, ...).
- Run for `600` ticks (`60s` at `100ms/tick`).

## Outputs

- Summary CSV:
  - `tests/perf/results/wilderness_threshold_10pct_30k_60s_summary.csv`
- Attack-event CSV (all threshold trigger events):
  - `tests/perf/results/wilderness_threshold_10pct_30k_60s_events.csv`

## Run command

```bash
node --import tsx tests/perf/WildernessThresholdAttack.ts \
  > tests/perf/results/wilderness_threshold_10pct_30k_60s_summary.csv \
  2> tests/perf/results/wilderness_threshold_10pct_30k_60s_events.csv
```
