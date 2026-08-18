import type { CallType, Direction, Filters, ServiceSegment } from "../types";

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: "in", label: "Eingehend" },
  { value: "out", label: "Ausgehend" },
  { value: "missed", label: "Verpasst" },
];

const CALL_TYPES: { value: CallType; label: string }[] = [
  { value: "external", label: "Extern" },
  { value: "internal", label: "Intern" },
  { value: "internal_forwarded", label: "Intern weitergeleitet" },
  { value: "external_forwarded", label: "Extern weitergeleitet" },
];

const SERVICE_SEGMENTS: { value: ServiceSegment; label: string }[] = [
  { value: "opening_hours", label: "Öffnungszeiten" },
  { value: "closed_hours", label: "Außerhalb Öffnungszeiten" },
  { value: "business", label: "Mo–Fr 08–17" },
  { value: "off_hours", label: "Mo–Fr außerhalb" },
  { value: "weekend", label: "Wochenende" },
];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function presetRange(daysBack: number): { date_from: string; date_to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (daysBack - 1));
  return { date_from: toDateStr(from), date_to: toDateStr(to) };
}

const DATE_PRESETS: { label: string; days: number }[] = [
  { label: "Heute", days: 1 },
  { label: "Letzte 7 Tage", days: 7 },
  { label: "Letzte 30 Tage", days: 30 },
];

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export default function FilterBar({ filters, onChange }: Props) {
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
        <label>Schnellauswahl</label>
        <div className="chip-group">
          {DATE_PRESETS.map((p) => {
            const range = presetRange(p.days);
            const active = filters.date_from === range.date_from && filters.date_to === range.date_to;
            return (
              <span
                key={p.label}
                className={`chip ${active ? "active" : ""}`}
                onClick={() => onChange({ ...filters, ...range })}
              >
                {p.label}
              </span>
            );
          })}
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
        <label>Anruftyp</label>
        <div className="chip-group">
          {CALL_TYPES.map((c) => (
            <span
              key={c.value}
              className={`chip ${filters.call_type.includes(c.value) ? "active" : ""}`}
              onClick={() => onChange({ ...filters, call_type: toggle(filters.call_type, c.value) })}
            >
              {c.label}
            </span>
          ))}
        </div>
      </div>

      <div className="filter-field">
        <label>Servicezeit</label>
        <div className="chip-group">
          {SERVICE_SEGMENTS.map((s) => (
            <span
              key={s.value}
              className={`chip ${filters.service_segment.includes(s.value) ? "active" : ""}`}
              onClick={() =>
                onChange({ ...filters, service_segment: toggle(filters.service_segment, s.value) })
              }
            >
              {s.label}
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
