import type { AppUser, CallsResponse, Filters, ParticipantsResponse, SiteMapping, StatsSummary, SyncRun } from "./types";

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 401 && onUnauthorized) onUnauthorized();
  return res;
}

function buildQuery(filters: Filters, extra: Record<string, string | number> = {}): string {
  const params = new URLSearchParams();
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  filters.site.forEach((s) => params.append("site", s));
  filters.direction.forEach((d) => params.append("direction", d));
  filters.call_type.forEach((c) => params.append("call_type", c));
  filters.service_segment.forEach((s) => params.append("service_segment", s));
  if (filters.extension) params.set("extension", filters.extension);
  if (filters.number) params.set("number", filters.number);
  if (filters.min_duration) params.set("min_duration", filters.min_duration);
  Object.entries(extra).forEach(([k, v]) => params.set(k, String(v)));
  return params.toString();
}

export async function fetchCalls(filters: Filters, page: number, pageSize: number): Promise<CallsResponse> {
  const res = await apiFetch(`/api/calls?${buildQuery(filters, { page, page_size: pageSize })}`);
  if (!res.ok) throw new Error("Fehler beim Laden der Anrufe");
  return res.json();
}

export async function fetchSummary(filters: Filters): Promise<StatsSummary> {
  const res = await apiFetch(`/api/stats/summary?${buildQuery(filters)}`);
  if (!res.ok) throw new Error("Fehler beim Laden der Statistik");
  return res.json();
}

export async function fetchParticipants(filters: Filters): Promise<ParticipantsResponse> {
  const res = await apiFetch(`/api/stats/participants?${buildQuery(filters)}`);
  if (!res.ok) throw new Error("Fehler beim Laden der Teilnehmer-Auswertung");
  return res.json();
}

export async function fetchSites(): Promise<SiteMapping[]> {
  const res = await apiFetch(`/api/sites`);
  if (!res.ok) throw new Error("Fehler beim Laden der Standorte");
  return res.json();
}

export async function fetchSyncStatus(): Promise<{ last_run: SyncRun | null; recent_runs: SyncRun[] }> {
  const res = await apiFetch(`/api/sync/status`);
  if (!res.ok) throw new Error("Fehler beim Laden des Sync-Status");
  return res.json();
}

export async function triggerSync(full = false): Promise<SyncRun> {
  const res = await apiFetch(`/api/sync/run?full=${full}`, { method: "POST" });
  if (!res.ok) throw new Error("Sync fehlgeschlagen");
  return res.json();
}

export async function createSite(rangeStart: number, rangeEnd: number, site: string): Promise<SiteMapping> {
  const res = await apiFetch(`/api/sites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ range_start: rangeStart, range_end: rangeEnd, site }),
  });
  if (!res.ok) throw new Error("Standort konnte nicht gespeichert werden");
  return res.json();
}

export async function deleteSite(id: number): Promise<void> {
  const res = await apiFetch(`/api/sites/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Standort konnte nicht gelöscht werden");
}

export async function resetData(): Promise<void> {
  const res = await apiFetch(`/api/admin/reset`, { method: "POST" });
  if (!res.ok) throw new Error("Zurücksetzen fehlgeschlagen");
}

export async function login(username: string, password: string): Promise<AppUser> {
  const res = await fetch(`/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Benutzername oder Passwort falsch");
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`/api/auth/logout`, { method: "POST" });
}

export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await apiFetch(`/api/auth/me/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Passwort konnte nicht geändert werden");
  }
}

export async function fetchMe(): Promise<AppUser | null> {
  const res = await fetch(`/api/auth/me`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchUsers(): Promise<AppUser[]> {
  const res = await apiFetch(`/api/auth/users`);
  if (!res.ok) throw new Error("Fehler beim Laden der Benutzer");
  return res.json();
}

export async function createUser(username: string, password: string, isAdmin: boolean): Promise<AppUser> {
  const res = await apiFetch(`/api/auth/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, is_admin: isAdmin }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Benutzer konnte nicht angelegt werden");
  }
  return res.json();
}

export async function deleteUser(id: number): Promise<void> {
  const res = await apiFetch(`/api/auth/users/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Benutzer konnte nicht gelöscht werden");
  }
}
