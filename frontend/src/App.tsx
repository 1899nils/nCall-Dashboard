import { useEffect, useState } from "react";
import { fetchCalls, fetchMe, fetchParticipants, fetchSites, fetchSummary, fetchSyncStatus, logout, setUnauthorizedHandler } from "./api";
import CallsPerDayChart from "./components/CallsPerDayChart";
import CallsPerSiteChart from "./components/CallsPerSiteChart";
import CallsTable from "./components/CallsTable";
import FilterBar from "./components/FilterBar";
import LoginForm from "./components/LoginForm";
import ParticipantsTable from "./components/ParticipantsTable";
import SettingsPanel from "./components/SettingsPanel";
import SitePicker from "./components/SitePicker";
import StatTiles from "./components/StatTiles";
import SyncStatus from "./components/SyncStatus";
import { emptyFilters } from "./types";
import type { AppUser, CallsResponse, Filters, ParticipantsResponse, SiteMapping, StatsSummary, SyncRun } from "./types";

const PAGE_SIZE = 25;

export default function App() {
  // undefined = still checking session, null = not logged in
  const [me, setMe] = useState<AppUser | null | undefined>(undefined);
  const [tab, setTab] = useState<"dashboard" | "settings">("dashboard");
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);

  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [calls, setCalls] = useState<CallsResponse | null>(null);
  const [participants, setParticipants] = useState<ParticipantsResponse | null>(null);
  const [sites, setSites] = useState<SiteMapping[]>([]);
  const [lastRun, setLastRun] = useState<SyncRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUnauthorizedHandler(() => setMe(null));
    fetchMe().then(setMe);
  }, []);

  function reloadSites() {
    fetchSites().then(setSites).catch(() => {});
  }

  function reloadSyncStatus() {
    fetchSyncStatus()
      .then((s) => setLastRun(s.last_run))
      .catch(() => {});
  }

  useEffect(() => {
    if (!me) return;
    reloadSites();
    reloadSyncStatus();
  }, [me]);

  useEffect(() => {
    setFilters((f) => ({ ...f, site: selectedSite ? [selectedSite] : [] }));
    setPage(1);
  }, [selectedSite]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    if (!me) return;
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
  }, [filters, page, me]);

  function refreshAfterSync() {
    reloadSyncStatus();
    fetchSummary(filters).then(setSummary);
    fetchCalls(filters, page, PAGE_SIZE).then(setCalls);
    fetchParticipants(filters).then(setParticipants);
  }

  async function handleLogout() {
    await logout();
    setMe(null);
  }

  if (me === undefined) return null;
  if (me === null) return <LoginForm onLoggedIn={setMe} />;

  const allSiteNames = Array.from(new Set(sites.map((s) => s.site))).sort();
  const activeTab = tab === "settings" && !me.is_admin ? "dashboard" : tab;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>nCall Dashboard</h1>
          <p className="subtitle">Anrufstatistik aller Standorte · Auerswald COMtrexx</p>
        </div>
        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "right" }}>
          {me.username}
          <br />
          <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={handleLogout}>
            Abmelden
          </span>
        </div>
      </div>

      <div className="tabs">
        <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>
          Dashboard
        </button>
        {me.is_admin && (
          <button className={activeTab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>
            Einstellungen
          </button>
        )}
      </div>

      {activeTab === "settings" ? (
        <SettingsPanel
          sites={sites}
          lastRun={lastRun}
          currentUser={me}
          onSitesChanged={reloadSites}
          onDataChanged={refreshAfterSync}
        />
      ) : (
        <>
          <SitePicker siteNames={allSiteNames} selected={selectedSite} onSelect={setSelectedSite} />

          <SyncStatus lastRun={lastRun} />

          <FilterBar filters={filters} onChange={setFilters} />

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
