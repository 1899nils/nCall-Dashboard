import { useState } from "react";
import { triggerSync } from "../api";
import type { SyncRun } from "../types";

function formatDateTime(iso?: string | null): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

interface Props {
  lastRun: SyncRun | null;
  onSynced: () => void;
}

export default function SyncStatus({ lastRun, onSynced }: Props) {
  const [running, setRunning] = useState(false);

  async function handleSync() {
    setRunning(true);
    try {
      await triggerSync();
      onSynced();
    } finally {
      setRunning(false);
    }
  }

  const isError = lastRun?.status === "error";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <button className="primary" onClick={handleSync} disabled={running}>
        {running ? "Synchronisiere…" : "Jetzt synchronisieren"}
      </button>
      <div className={`sync-status ${isError ? "error" : ""}`}>
        Letzter Sync: {formatDateTime(lastRun?.finished_at)} ·{" "}
        {lastRun ? `${lastRun.records_synced} neue Anrufe` : "noch kein Lauf"}
        {isError && ` · Fehler: ${lastRun?.error_message}`}
      </div>
    </div>
  );
}
