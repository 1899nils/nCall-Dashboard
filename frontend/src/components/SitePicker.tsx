interface Props {
  siteNames: string[];
  selected: string | null;
  onSelect: (site: string) => void;
}

export default function SitePicker({ siteNames, selected, onSelect }: Props) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <p className="chart-title" style={{ marginBottom: 10 }}>Standort auswählen</p>
      <div className="chip-group" style={{ maxWidth: "none" }}>
        {siteNames.map((site) => (
          <span
            key={site}
            className={`chip ${selected === site ? "active" : ""}`}
            onClick={() => onSelect(site)}
          >
            {site}
          </span>
        ))}
        {siteNames.length === 0 && (
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Noch keine Standorte konfiguriert — unter „Einstellungen" anlegen.
          </span>
        )}
      </div>
    </div>
  );
}
