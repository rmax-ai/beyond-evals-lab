import type { AgentRun, TraceEvent } from "../domain/types.js";

// The SQLite store persists both the immutable run snapshots and their ordered
// trace events. The in-memory adapter implements the same contract for tests.
export const TRACE_DDL = `
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  request_json TEXT NOT NULL,
  initial_state_json TEXT NOT NULL,
  final_state_json TEXT NOT NULL,
  usage_json TEXT,
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
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at);
CREATE INDEX IF NOT EXISTS idx_trace_events_run_sequence ON trace_events(run_id, sequence);
CREATE INDEX IF NOT EXISTS idx_trace_events_type ON trace_events(type);
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
  saveRun(run: AgentRun): Promise<void>;
  loadRun(runId: string): Promise<AgentRun>;
  query(filter: TraceQuery): Promise<AgentRun[]>;
}
