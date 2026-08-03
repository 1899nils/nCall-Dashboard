import { formatDuration } from "../format";
import type { Call, CallsResponse } from "../types";

const DIRECTION_LABEL: Record<string, string> = {
  in: "Eingehend",
  out: "Ausgehend",
  missed: "Verpasst",
};

const CALL_TYPE_LABEL: Record<string, string> = {
  CfIntern: "Intern weitergeleitet",
  CfExtern: "Extern weitergeleitet",
};

// callType "Normal" covers both a genuine external call and a purely
// internal one (colleague calling colleague) - COMtrexx doesn't
// distinguish those itself, so tell them apart by external_number.
function callTypeLabel(call: Call): string {
  if (!call.call_type) return "–";
  if (call.call_type === "Normal") return call.external_number ? "Extern" : "Intern";
  return CALL_TYPE_LABEL[call.call_type] ?? call.call_type;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

interface Props {
  data: CallsResponse | null;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function CallsTable({ data, page, pageSize, onPageChange }: Props) {
  if (!data) return null;
  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  return (
    <div className="card">
      <p className="chart-title">Einzelgespräche ({data.total})</p>
      <table>
        <thead>
          <tr>
            <th>Datum/Zeit</th>
            <th>Standort</th>
            <th>Nebenstelle</th>
            <th>Richtung</th>
            <th>Anruftyp</th>
            <th>Rufnummer</th>
            <th>Dauer</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((call: Call) => (
            <tr key={call.id}>
              <td>{formatDateTime(call.started_at)}</td>
              <td>{call.site ?? "–"}</td>
              <td>
                {call.internal_number}
                {call.internal_name ? ` (${call.internal_name})` : ""}
              </td>
              <td>
                <span className={`direction-badge ${call.direction}`}>
                  {DIRECTION_LABEL[call.direction] ?? call.direction}
                </span>
              </td>
              <td>{callTypeLabel(call)}</td>
              <td>
                {call.external_number ?? "–"}
                {call.external_name ? ` (${call.external_name})` : ""}
              </td>
              <td>{formatDuration(call.duration_seconds)}</td>
            </tr>
          ))}
          {data.items.length === 0 && (
            <tr>
              <td colSpan={7} style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px" }}>
                Keine Anrufe für die gewählten Filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="pagination">
        <span>
          Seite {page} / {totalPages}
        </span>
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Zurück
        </button>
        <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Weiter
        </button>
      </div>
    </div>
  );
}
