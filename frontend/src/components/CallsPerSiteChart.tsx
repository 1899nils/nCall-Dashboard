import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StatsSummary } from "../types";

const SLOTS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
  "var(--series-8)",
];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="custom-tooltip">
      <div>{p.payload.site}</div>
      <div style={{ color: p.payload.color }}>{p.value} Anrufe</div>
    </div>
  );
}

interface Props {
  data: StatsSummary["calls_per_site"];
  allSiteNames: string[]; // fixed, alphabetically sorted — gives each site a stable color
}

export default function CallsPerSiteChart({ data, allSiteNames }: Props) {
  const colorForSite = (site: string) => {
    const idx = allSiteNames.indexOf(site);
    return SLOTS[idx >= 0 ? idx % SLOTS.length : SLOTS.length - 1];
  };

  const chartData = data.map((d) => ({ ...d, color: colorForSite(d.site) }));

  return (
    <div className="card">
      <p className="chart-title">Anrufe pro Standort</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--gridline)" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="site"
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--gridline)" }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
