import type { AgentRun, TraceEvent } from "../domain/types.js";

// SQLite schema (requires better-sqlite3 — postponed until the native build
// dependency is available). The in-memory adapter has the same public contract.
export const TRACE_DDL = `
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  request_json TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT
);
CREATE TABLE IF NOT EXISTS trace_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL,
  data_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS assurance_reports (
  run_id TEXT PRIMARY KEY,
  report_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS eval_candidates (
  id TEXT PRIMARY KEY,
  source_run_id TEXT NOT NULL,
  candidate_json TEXT NOT NULL,
  status TEXT NOT NULL
);
`;

export interface TraceQuery {
  runId?: string;
  eventTypes?: TraceEvent["type"][];
  startedAfter?: string;
  startedBefore?: string;
  limit?: number;
}

export interface TraceStore {
  append(event: TraceEvent): Promise<void>;
  loadRun(runId: string): Promise<AgentRun>;
  query(filter: TraceQuery): Promise<AgentRun[]>;
}
