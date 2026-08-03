import { useEffect, useState } from "react";
import { fetchCalls, fetchParticipants, fetchSites, fetchSummary, fetchSyncStatus } from "./api";
import CallsPerDayChart from "./components/CallsPerDayChart";
import CallsPerSiteChart from "./components/CallsPerSiteChart";
import CallsTable from "./components/CallsTable";
import FilterBar from "./components/FilterBar";
import ParticipantsTable from "./components/ParticipantsTable";
import SettingsPanel from "./components/SettingsPanel";
import StatTiles from "./components/StatTiles";
import SyncStatus from "./components/SyncStatus";
import { emptyFilters } from "./types";
import type { CallsResponse, Filters, ParticipantsResponse, SiteMapping, StatsSummary, SyncRun } from "./types";

const PAGE_SIZE = 25;

export default function App() {
  const [tab, setTab] = useState<"dashboard" | "settings">("dashboard");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);

  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [calls, setCalls] = useState<CallsResponse | null>(null);
  const [participants, setParticipants] = useState<ParticipantsResponse | null>(null);
  const [sites, setSites] = useState<SiteMapping[]>([]);
  const [lastRun, setLastRun] = useState<SyncRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reloadSites() {
    fetchSites().then(setSites).catch(() => {});
  }

  useEffect(() => {
    reloadSites();
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
    Promise.all([fetchSummary(filters), fetchCalls(filters, page, PAGE_SIZE), fetchParticipants(filters)])
      .then(([s, c, p]) => {
        if (cancelled) return;
        setSummary(s);
        setCalls(c);
        setParticipants(p);
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
    fetchParticipants(filters).then(setParticipants);
  }

  const allSiteNames = Array.from(new Set(sites.map((s) => s.site))).sort();

  return (
    <>
      <h1>nCall Dashboard</h1>
      <p className="subtitle">Anrufstatistik aller Standorte · Auerswald COMtrexx</p>

      <div className="tabs">
        <button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>
          Dashboard
        </button>
        <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>
          Einstellungen
        </button>
      </div>

      {tab === "settings" ? (
        <SettingsPanel sites={sites} onSitesChanged={reloadSites} onDataChanged={refreshAfterSync} />
      ) : (
        <>
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

          <ParticipantsTable data={participants} />

          <CallsTable data={calls} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}
    </>
  );
}
