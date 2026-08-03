export type Direction = "in" | "out" | "missed";

export interface Call {
  id: number;
  external_id: string;
  started_at: string;
  duration_seconds: number;
  direction: Direction;
  internal_number: string;
  internal_name?: string | null;
  external_number?: string | null;
  external_name?: string | null;
  site?: string | null;
}

export interface CallsResponse {
  items: Call[];
  total: number;
  page: number;
  page_size: number;
}

export interface StatsSummary {
  total_calls: number;
  missed_calls: number;
  avg_duration_seconds: number;
  calls_per_day: { date: string; count: number }[];
  calls_per_site: { site: string; count: number }[];
  top_numbers: { number: string; count: number }[];
}

export interface SiteMapping {
  id: number;
  prefix: string;
  site: string;
}

export interface SyncRun {
  id: number;
  started_at: string;
  finished_at?: string | null;
  status: "running" | "success" | "error";
  records_synced: number;
  error_message?: string | null;
}

export interface Filters {
  date_from: string;
  date_to: string;
  site: string[];
  direction: Direction[];
  extension: string;
  number: string;
  min_duration: string;
}

export const emptyFilters: Filters = {
  date_from: "",
  date_to: "",
  site: [],
  direction: [],
  extension: "",
  number: "",
  min_duration: "",
};
