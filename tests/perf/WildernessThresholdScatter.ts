import fs from "fs";
import path from "path";

type Row = {
  strategy: string;
  progression: "same" | "doubling" | "halving";
  attack_percent: number;
  total_troops_tick600: number;
  troop_cap_tick600: number;
};

const inputPath = path.resolve(
  "tests/perf/results/wilderness_threshold_matrix_60s_summary.csv",
);
const outputPath = path.resolve(
  "tests/perf/results/wilderness_threshold_matrix_60s_scatter.svg",
);

const csv = fs.readFileSync(inputPath, "utf8").trim();
const [headerLine, ...lines] = csv.split("\n");
const headers = headerLine.split(",");

const rows: Row[] = lines.map((line) => {
  const values = line.split(",");
  const rec = Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  return {
    strategy: rec.strategy,
    progression: rec.progression as Row["progression"],
    attack_percent: Number(rec.attack_percent),
    total_troops_tick600: Number(rec.total_troops_tick600),
    troop_cap_tick600: Number(rec.troop_cap_tick600),
  };
});

const width = 980;
const height = 700;
const margin = { top: 50, right: 40, bottom: 90, left: 100 };
const plotW = width - margin.left - margin.right;
const plotH = height - margin.top - margin.bottom;

const xs = rows.map((r) => r.troop_cap_tick600);
const ys = rows.map((r) => r.total_troops_tick600);

const minX = Math.min(...xs);
const maxX = Math.max(...xs);
const minY = 0;
const maxY = Math.max(...ys);

const padX = (maxX - minX) * 0.06;
const padY = (maxY - minY) * 0.08;

const domainX = [minX - padX, maxX + padX] as const;
const domainY = [Math.max(0, minY - padY), maxY + padY] as const;

const xScale = (v: number) =>
  margin.left + ((v - domainX[0]) / (domainX[1] - domainX[0])) * plotW;
const yScale = (v: number) =>
  margin.top + (1 - (v - domainY[0]) / (domainY[1] - domainY[0])) * plotH;

const progressionHue: Record<Row["progression"], number> = {
  same: 220, // blue
  doubling: 25, // orange
  halving: 135, // green
};

const lightnessByPercent: Record<number, number> = {
  1: 74,
  5: 61,
  10: 49,
  20: 37,
};

const colorFor = (r: Row) =>
  `hsl(${progressionHue[r.progression]} 78% ${lightnessByPercent[r.attack_percent]}%)`;

const ticks = 6;
const xTicks = Array.from(
  { length: ticks + 1 },
  (_, i) => domainX[0] + (i * (domainX[1] - domainX[0])) / ticks,
);
const yTicks = Array.from(
  { length: ticks + 1 },
  (_, i) => domainY[0] + (i * (domainY[1] - domainY[0])) / ticks,
);

const formatK = (value: number) => `${(value / 10_000).toFixed(1)}k`;

const grid = [
  ...xTicks.map((t) => {
    const x = xScale(t);
    return `<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${height - margin.bottom}" stroke="#e5e7eb" stroke-width="1" />`;
  }),
  ...yTicks.map((t) => {
    const y = yScale(t);
    return `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />`;
  }),
].join("\n");

const axes = `
<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="#111827" stroke-width="2" />
<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="#111827" stroke-width="2" />
`;

const xLabels = xTicks
  .map((t) => {
    const x = xScale(t);
    return `<text x="${x}" y="${height - margin.bottom + 24}" text-anchor="middle" font-size="12" fill="#374151">${formatK(t)}</text>`;
  })
  .join("\n");

const yLabels = yTicks
  .map((t) => {
    const y = yScale(t);
    return `<text x="${margin.left - 12}" y="${y + 4}" text-anchor="end" font-size="12" fill="#374151">${formatK(t)}</text>`;
  })
  .join("\n");

const points = rows
  .map((r) => {
    const cx = xScale(r.troop_cap_tick600);
    const cy = yScale(r.total_troops_tick600);
    return `<circle cx="${cx}" cy="${cy}" r="6.5" fill="${colorFor(r)}" stroke="#0f172a" stroke-width="0.8"><title>${r.strategy}: cap=${r.troop_cap_tick600.toFixed(1)}, total=${r.total_troops_tick600}</title></circle>`;
  })
  .join("\n");

const progressionLegend = (["same", "doubling", "halving"] as const)
  .map((p, idx) => {
    const y = 86 + idx * 24;
    return `<circle cx="${width - 200}" cy="${y}" r="6" fill="hsl(${progressionHue[p]} 78% 52%)" /><text x="${width - 186}" y="${y + 4}" font-size="12" fill="#111827">${p}</text>`;
  })
  .join("\n");

const percentLegend = [1, 5, 10, 20]
  .map((pct, idx) => {
    const y = 182 + idx * 24;
    return `<circle cx="${width - 200}" cy="${y}" r="6" fill="hsl(220 78% ${lightnessByPercent[pct]}%)" /><text x="${width - 186}" y="${y + 4}" font-size="12" fill="#111827">${pct}%</text>`;
  })
  .join("\n");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Troop cap vs current troops scatter plot">
  <rect x="0" y="0" width="${width}" height="${height}" fill="white" />
  ${grid}
  ${axes}
  ${xLabels}
  ${yLabels}
  ${points}

  <text x="${margin.left + plotW / 2}" y="${height - 30}" text-anchor="middle" font-size="16" font-weight="600" fill="#111827">Troop Cap</text>
  <text x="26" y="${margin.top + plotH / 2}" transform="rotate(-90, 26, ${margin.top + plotH / 2})" text-anchor="middle" font-size="16" font-weight="600" fill="#111827">Current Troops</text>

  <text x="${width - 230}" y="58" font-size="13" font-weight="700" fill="#111827">Progression (hue)</text>
  ${progressionLegend}

  <text x="${width - 230}" y="154" font-size="13" font-weight="700" fill="#111827">Attack % (lightness)</text>
  ${percentLegend}
</svg>
`;

fs.writeFileSync(outputPath, svg, "utf8");
console.log(`wrote ${outputPath}`);
