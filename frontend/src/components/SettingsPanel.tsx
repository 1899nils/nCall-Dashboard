import { useState } from "react";
import { createSite, deleteSite, resetData, triggerSync } from "../api";
import type { SiteMapping, SyncRun } from "../types";

function formatDateTime(iso?: string | null): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

interface Props {
  sites: SiteMapping[];
  lastRun: SyncRun | null;
  onSitesChanged: () => void;
  onDataChanged: () => void;
}

export default function SettingsPanel({ sites, lastRun, onSitesChanged, onDataChanged }: Props) {
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [siteName, setSiteName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAddSite(e: React.FormEvent) {
    e.preventDefault();
    const start = parseInt(rangeStart, 10);
    const end = parseInt(rangeEnd, 10);
    if (Number.isNaN(start) || Number.isNaN(end) || !siteName.trim()) return;
    if (end < start) {
      setMessage("„Bis“ muss größer oder gleich „Von“ sein.");
      return;
    }
    setBusy("add-site");
    try {
      await createSite(start, end, siteName.trim());
      setRangeStart("");
      setRangeEnd("");
      setSiteName("");
      onSitesChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleDeleteSite(id: number) {
    setBusy(`delete-${id}`);
    try {
      await deleteSite(id);
      onSitesChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleReset() {
    if (!confirm("Wirklich ALLE bisher importierten Anrufdaten unwiderruflich löschen? Die Standort-Zuordnung bleibt erhalten.")) {
      return;
    }
    setBusy("reset");
    setMessage(null);
    try {
      await resetData();
      onDataChanged();
      setMessage("Anrufdaten wurden zurückgesetzt.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleSync() {
    setBusy("sync");
    setMessage(null);
    try {
      const run = await triggerSync(false);
      onDataChanged();
      if (run.status === "success") {
        setMessage(`Sync abgeschlossen: ${run.records_synced} neue Anrufe.`);
      } else {
        setMessage(`Sync fehlgeschlagen: ${run.error_message}`);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleFullSync() {
    setBusy("full-sync");
    setMessage(null);
    try {
      const run = await triggerSync(true);
      onDataChanged();
      if (run.status === "success") {
        setMessage(`Vollständiger Import abgeschlossen: ${run.records_synced} neue Anrufe.`);
      } else {
        setMessage(`Import fehlgeschlagen: ${run.error_message}`);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card settings-panel">
      <h2>Standorte</h2>
      <p className="chart-title" style={{ marginBottom: 12 }}>
        Ordnet einen numerischen Nebenstellen-Bereich (von/bis, jeweils inklusive) einem
        Standort zu, z. B. 800-899. Bei überlappenden Bereichen gewinnt der schmalere.
        Änderungen wirken sich nur auf neu synchronisierte Anrufe aus — nach dem Anpassen ggf.
        „Vollständigen Import starten" nutzen, damit bereits importierte Anrufe neu zugeordnet
        werden.
      </p>

      <table style={{ marginBottom: 16 }}>
        <thead>
          <tr>
            <th>Von</th>
            <th>Bis</th>
            <th>Standort</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sites.map((s) => (
            <tr key={s.id}>
              <td>{s.range_start}</td>
              <td>{s.range_end}</td>
              <td>{s.site}</td>
              <td>
                <button
                  className="primary"
                  style={{ background: "var(--status-critical)" }}
                  disabled={busy === `delete-${s.id}`}
                  onClick={() => handleDeleteSite(s.id)}
                >
                  Entfernen
                </button>
              </td>
            </tr>
          ))}
          {sites.length === 0 && (
            <tr>
              <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                Noch keine Standorte konfiguriert.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <form onSubmit={handleAddSite} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="filter-field">
          <label htmlFor="new-range-start">Von</label>
          <input
            id="new-range-start"
            type="number"
            placeholder="z. B. 800"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="new-range-end">Bis</label>
          <input
            id="new-range-end"
            type="number"
            placeholder="z. B. 899"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="new-site">Standortname</label>
          <input id="new-site" type="text" placeholder="z. B. Zentrale" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
        </div>
        <button className="primary" type="submit" disabled={busy === "add-site"}>
          Hinzufügen
        </button>
      </form>

      <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid var(--gridline)" }} />

      <h2>Datenverwaltung</h2>
      <p className="chart-title" style={{ marginBottom: 12 }}>
        Letzter Sync: {formatDateTime(lastRun?.finished_at)} ·{" "}
        {lastRun ? `${lastRun.records_synced} neue Anrufe` : "noch kein Lauf"}
        {lastRun?.status === "error" && ` · Fehler: ${lastRun.error_message}`}
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        <button className="primary" disabled={busy === "sync"} onClick={handleSync}>
          {busy === "sync" ? "Synchronisiere…" : "Jetzt synchronisieren"}
        </button>
        <button className="primary" disabled={busy === "full-sync"} onClick={handleFullSync}>
          {busy === "full-sync" ? "Importiere…" : "Vollständigen Import starten"}
        </button>
        <button
          className="primary"
          style={{ background: "var(--status-critical)" }}
          disabled={busy === "reset"}
          onClick={handleReset}
        >
          {busy === "reset" ? "Lösche…" : "Alle Anrufdaten löschen"}
        </button>
      </div>
      {message && <p className="chart-title" style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}
