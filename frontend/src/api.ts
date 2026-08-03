import type { CallsResponse, Filters, SiteMapping, StatsSummary, SyncRun } from "./types";

function buildQuery(filters: Filters, extra: Record<string, string | number> = {}): string {
  const params = new URLSearchParams();
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  filters.site.forEach((s) => params.append("site", s));
  filters.direction.forEach((d) => params.append("direction", d));
  if (filters.extension) params.set("extension", filters.extension);
  if (filters.number) params.set("number", filters.number);
  if (filters.min_duration) params.set("min_duration", filters.min_duration);
  Object.entries(extra).forEach(([k, v]) => params.set(k, String(v)));
  return params.toString();
}

export async function fetchCalls(filters: Filters, page: number, pageSize: number): Promise<CallsResponse> {
  const res = await fetch(`/api/calls?${buildQuery(filters, { page, page_size: pageSize })}`);
  if (!res.ok) throw new Error("Fehler beim Laden der Anrufe");
  return res.json();
}

export async function fetchSummary(filters: Filters): Promise<StatsSummary> {
  const res = await fetch(`/api/stats/summary?${buildQuery(filters)}`);
  if (!res.ok) throw new Error("Fehler beim Laden der Statistik");
  return res.json();
}

export async function fetchSites(): Promise<SiteMapping[]> {
  const res = await fetch(`/api/sites`);
  if (!res.ok) throw new Error("Fehler beim Laden der Standorte");
  return res.json();
}

export async function fetchSyncStatus(): Promise<{ last_run: SyncRun | null; recent_runs: SyncRun[] }> {
  const res = await fetch(`/api/sync/status`);
  if (!res.ok) throw new Error("Fehler beim Laden des Sync-Status");
  return res.json();
}

export async function triggerSync(full = false): Promise<SyncRun> {
  const res = await fetch(`/api/sync/run?full=${full}`, { method: "POST" });
  if (!res.ok) throw new Error("Sync fehlgeschlagen");
  return res.json();
}

export async function createSite(prefix: string, site: string): Promise<SiteMapping> {
  const res = await fetch(`/api/sites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, site }),
  });
  if (!res.ok) throw new Error("Standort konnte nicht gespeichert werden");
  return res.json();
}

export async function deleteSite(id: number): Promise<void> {
  const res = await fetch(`/api/sites/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Standort konnte nicht gelöscht werden");
}

export async function resetData(): Promise<void> {
  const res = await fetch(`/api/admin/reset`, { method: "POST" });
  if (!res.ok) throw new Error("Zurücksetzen fehlgeschlagen");
}
