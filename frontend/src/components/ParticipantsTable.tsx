import { formatDuration } from "../format";
import type { ParticipantsResponse } from "../types";

export default function ParticipantsTable({ data }: { data: ParticipantsResponse | null }) {
  if (!data) return null;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <p className="chart-title">Teilnehmer-Auswertung ({data.total} Anrufe in aktueller Filterung)</p>
      <table>
        <thead>
          <tr>
            <th>Teilnehmer</th>
            <th>Anzahl</th>
            <th>Anteil</th>
            <th>Gesamtzeit</th>
            <th>Ø Dauer</th>
          </tr>
        </thead>
        <tbody>
          {data.participants.map((p) => (
            <tr key={p.name}>
              <td>{p.name}</td>
              <td>{p.count}</td>
              <td>{p.share_percent.toFixed(1)} %</td>
              <td>{formatDuration(p.total_duration_seconds)}</td>
              <td>{formatDuration(p.avg_duration_seconds)}</td>
            </tr>
          ))}
          {data.participants.length === 0 && (
            <tr>
              <td colSpan={5} style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px" }}>
                Keine Anrufe für die gewählten Filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
