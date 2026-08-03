import { useEffect, useState } from "react";
import { fetchCalls, fetchSites, fetchSummary, fetchSyncStatus } from "./api";
import CallsPerDayChart from "./components/CallsPerDayChart";
import CallsPerSiteChart from "./components/CallsPerSiteChart";
import CallsTable from "./components/CallsTable";
import FilterBar from "./components/FilterBar";
import StatTiles from "./components/StatTiles";
import SyncStatus from "./components/SyncStatus";
import { emptyFilters } from "./types";
import type { CallsResponse, Filters, SiteMapping, StatsSummary, SyncRun } from "./types";

const PAGE_SIZE = 25;

export default function App() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);

  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [calls, setCalls] = useState<CallsResponse | null>(null);
  const [sites, setSites] = useState<SiteMapping[]>([]);
  const [lastRun, setLastRun] = useState<SyncRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSites().then(setSites).catch(() => {});
    fetchSyncStatus()
      .then((s) => setLastRun(s.last_run))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([fetchSummary(filters), fetchCalls(filters, page, PAGE_SIZE)])
      .then(([s, c]) => {
        if (cancelled) return;
        setSummary(s);
        setCalls(c);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [filters, page]);

  function refreshAfterSync() {
    fetchSyncStatus().then((s) => setLastRun(s.last_run));
    fetchSummary(filters).then(setSummary);
    fetchCalls(filters, page, PAGE_SIZE).then(setCalls);
  }

  const allSiteNames = Array.from(new Set(sites.map((s) => s.site))).sort();

  return (
    <>
      <h1>nCall Dashboard</h1>
      <p className="subtitle">Anrufstatistik aller Standorte · Auerswald COMtrexx</p>

      <SyncStatus lastRun={lastRun} onSynced={refreshAfterSync} />

      <FilterBar filters={filters} onChange={setFilters} sites={sites} />

      {error && (
        <div className="card" style={{ marginBottom: 16, color: "var(--status-critical)" }}>
          {error}
        </div>
      )}

      {summary && (
        <>
          <StatTiles summary={summary} />
          <div className="charts-row">
            <CallsPerDayChart data={summary.calls_per_day} />
            <CallsPerSiteChart data={summary.calls_per_site} allSiteNames={allSiteNames} />
          </div>
        </>
      )}

      <CallsTable data={calls} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </>
  );
}
