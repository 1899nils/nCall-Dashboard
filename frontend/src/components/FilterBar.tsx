import type { Direction, Filters, SiteMapping } from "../types";

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: "in", label: "Eingehend" },
  { value: "out", label: "Ausgehend" },
  { value: "missed", label: "Verpasst" },
];

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  sites: SiteMapping[];
}

export default function FilterBar({ filters, onChange, sites }: Props) {
  const siteNames = Array.from(new Set(sites.map((s) => s.site))).sort();

  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  return (
    <div className="filter-bar card">
      <div className="filter-field">
        <label htmlFor="date_from">Von</label>
        <input
          id="date_from"
          type="date"
          value={filters.date_from}
          onChange={(e) => onChange({ ...filters, date_from: e.target.value })}
        />
      </div>
      <div className="filter-field">
        <label htmlFor="date_to">Bis</label>
        <input
          id="date_to"
          type="date"
          value={filters.date_to}
          onChange={(e) => onChange({ ...filters, date_to: e.target.value })}
        />
      </div>

      <div className="filter-field">
        <label>Standort</label>
        <div className="chip-group">
          {siteNames.map((site) => (
            <span
              key={site}
              className={`chip ${filters.site.includes(site) ? "active" : ""}`}
              onClick={() => onChange({ ...filters, site: toggle(filters.site, site) })}
            >
              {site}
            </span>
          ))}
        </div>
      </div>

      <div className="filter-field">
        <label>Richtung</label>
        <div className="chip-group">
          {DIRECTIONS.map((d) => (
            <span
              key={d.value}
              className={`chip ${filters.direction.includes(d.value) ? "active" : ""}`}
              onClick={() => onChange({ ...filters, direction: toggle(filters.direction, d.value) })}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>

      <div className="filter-field">
        <label htmlFor="extension">Nebenstelle</label>
        <input
          id="extension"
          type="text"
          placeholder="z. B. 102"
          value={filters.extension}
          onChange={(e) => onChange({ ...filters, extension: e.target.value })}
        />
      </div>

      <div className="filter-field">
        <label htmlFor="number">Rufnummer</label>
        <input
          id="number"
          type="text"
          placeholder="Suche"
          value={filters.number}
          onChange={(e) => onChange({ ...filters, number: e.target.value })}
        />
      </div>

      <div className="filter-field">
        <label htmlFor="min_duration">Min. Dauer (s)</label>
        <input
          id="min_duration"
          type="number"
          min={0}
          value={filters.min_duration}
          onChange={(e) => onChange({ ...filters, min_duration: e.target.value })}
        />
      </div>
    </div>
  );
}
