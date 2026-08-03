import { useEffect, useState } from "react";
import { createUser, deleteUser, fetchUsers } from "../api";
import type { AppUser } from "../types";

export default function UsersPanel({ currentUser }: { currentUser: AppUser }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function reload() {
    fetchUsers().then(setUsers).catch(() => {});
  }

  useEffect(reload, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy("add-user");
    setMessage(null);
    try {
      await createUser(username.trim(), password, isAdmin);
      setUsername("");
      setPassword("");
      setIsAdmin(false);
      reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(id: number) {
    setBusy(`delete-${id}`);
    setMessage(null);
    try {
      await deleteUser(id);
      reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <h2>Benutzer</h2>
      <p className="chart-title" style={{ marginBottom: 12 }}>
        Zugriff auf dieses Dashboard. Admins sehen zusätzlich diesen Einstellungen-Tab.
      </p>

      <table style={{ marginBottom: 16 }}>
        <thead>
          <tr>
            <th>Benutzername</th>
            <th>Rolle</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.is_admin ? "Admin" : "Standard"}</td>
              <td>
                {u.id !== currentUser.id && (
                  <button
                    className="primary"
                    style={{ background: "var(--status-critical)" }}
                    disabled={busy === `delete-${u.id}`}
                    onClick={() => handleDelete(u.id)}
                  >
                    Entfernen
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={handleAdd} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="filter-field">
          <label htmlFor="new-username">Benutzername</label>
          <input id="new-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="filter-field">
          <label htmlFor="new-password">Passwort</label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="new-is-admin">Admin</label>
          <input
            id="new-is-admin"
            type="checkbox"
            style={{ width: 20, height: 20 }}
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
          />
        </div>
        <button className="primary" type="submit" disabled={busy === "add-user"}>
          Benutzer anlegen
        </button>
      </form>
      {message && <p className="chart-title" style={{ marginTop: 12, color: "var(--status-critical)" }}>{message}</p>}
    </>
  );
}
