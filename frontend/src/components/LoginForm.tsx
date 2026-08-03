import { useState } from "react";
import { login } from "../api";
import type { AppUser } from "../types";

export default function LoginForm({ onLoggedIn }: { onLoggedIn: (user: AppUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(username, password);
      onLoggedIn(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 340, margin: "80px auto" }}>
      <h1 style={{ textAlign: "center" }}>nCall Dashboard</h1>
      <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="filter-field">
          <label htmlFor="login-username">Benutzername</label>
          <input
            id="login-username"
            type="text"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="login-password">Passwort</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p style={{ color: "var(--status-critical)", fontSize: "0.85rem", margin: 0 }}>{error}</p>}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? "Anmelden…" : "Anmelden"}
        </button>
      </form>
    </div>
  );
}
