import { useState } from "react";
import { changeOwnPassword } from "../api";

export default function ChangePasswordForm({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== newPasswordRepeat) {
      setError("Die beiden neuen Passwörter stimmen nicht überein.");
      return;
    }
    setBusy(true);
    try {
      await changeOwnPassword(currentPassword, newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 340, marginLeft: "auto", marginBottom: 16 }}>
      <p className="chart-title" style={{ marginBottom: 10 }}>Passwort ändern</p>
      {done ? (
        <p style={{ fontSize: "0.85rem" }}>
          Passwort geändert.{" "}
          <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={onClose}>
            Schließen
          </span>
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="filter-field">
            <label htmlFor="current-password">Aktuelles Passwort</label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="filter-field">
            <label htmlFor="new-password-1">Neues Passwort</label>
            <input
              id="new-password-1"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="filter-field">
            <label htmlFor="new-password-2">Neues Passwort wiederholen</label>
            <input
              id="new-password-2"
              type="password"
              value={newPasswordRepeat}
              onChange={(e) => setNewPasswordRepeat(e.target.value)}
            />
          </div>
          {error && <p style={{ color: "var(--status-critical)", fontSize: "0.85rem", margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Speichere…" : "Speichern"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: "var(--page)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 14px", cursor: "pointer" }}
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
