import type { SyncRun } from "../types";

function formatDateTime(iso?: string | null): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

export default function SyncStatus({ lastRun }: { lastRun: SyncRun | null }) {
  const isError = lastRun?.status === "error";

  return (
    <div style={{ marginBottom: 16, textAlign: "right" }}>
      <div className={`sync-status ${isError ? "error" : ""}`}>
        Letzter Sync: {formatDateTime(lastRun?.finished_at)} ·{" "}
        {lastRun ? `${lastRun.records_synced} neue Anrufe` : "noch kein Lauf"}
        {isError && ` · Fehler: ${lastRun?.error_message}`}
      </div>
    </div>
  );
}
