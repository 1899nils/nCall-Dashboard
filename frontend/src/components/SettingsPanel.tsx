import { useState } from "react";
import { createSite, deleteSite, resetData, triggerSync } from "../api";
import type { SiteMapping } from "../types";

interface Props {
  sites: SiteMapping[];
  onSitesChanged: () => void;
  onDataChanged: () => void;
}

export default function SettingsPanel({ sites, onSitesChanged, onDataChanged }: Props) {
  const [prefix, setPrefix] = useState("");
  const [siteName, setSiteName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAddSite(e: React.FormEvent) {
    e.preventDefault();
    if (!prefix.trim() || !siteName.trim()) return;
    setBusy("add-site");
    try {
      await createSite(prefix.trim(), siteName.trim());
      setPrefix("");
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
        Ordnet Nebenstellen anhand ihrer Anfangsziffern (Präfix) einem Standort zu. Bei
        überlappenden Präfixen gewinnt der längere. Änderungen wirken sich nur auf neu
        synchronisierte Anrufe aus — nach dem Anpassen ggf. „Vollständigen Import starten"
        nutzen, damit bereits importierte Anrufe neu zugeordnet werden.
      </p>

      <table style={{ marginBottom: 16 }}>
        <thead>
          <tr>
            <th>Präfix (Nebenstelle beginnt mit)</th>
            <th>Standort</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sites.map((s) => (
            <tr key={s.id}>
              <td>{s.prefix}</td>
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
              <td colSpan={3} style={{ color: "var(--text-muted)" }}>
                Noch keine Standorte konfiguriert.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <form onSubmit={handleAddSite} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="filter-field">
          <label htmlFor="new-prefix">Präfix</label>
          <input id="new-prefix" type="text" placeholder="z. B. 10" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
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
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
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
