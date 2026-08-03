import { formatDuration } from "../format";
import type { StatsSummary } from "../types";

export default function StatTiles({ summary }: { summary: StatsSummary }) {
  const answeredShare =
    summary.total_calls > 0
      ? Math.round(((summary.total_calls - summary.missed_calls) / summary.total_calls) * 100)
      : 0;

  return (
    <div className="stat-tiles">
      <div className="card stat-tile">
        <div className="label">Anrufe gesamt</div>
        <div className="value">{summary.total_calls}</div>
      </div>
      <div className="card stat-tile">
        <div className="label">Verpasste Anrufe</div>
        <div className="value">{summary.missed_calls}</div>
      </div>
      <div className="card stat-tile">
        <div className="label">Erreichbarkeit</div>
        <div className="value">{answeredShare}%</div>
      </div>
      <div className="card stat-tile">
        <div className="label">Ø Gesprächsdauer</div>
        <div className="value">{formatDuration(summary.avg_duration_seconds)}</div>
      </div>
    </div>
  );
}
