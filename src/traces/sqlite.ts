import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import Database from "better-sqlite3";

import { TRACE_DDL } from "./schema.js";

import type { AgentRun, TraceEvent } from "../domain/types.js";
import type { TraceQuery, TraceStore } from "./schema.js";

export const DEFAULT_TRACE_DATABASE_PATH = resolve("traces", "assurance.db");

interface StoredRunRow {
  id: string;
  request_json: string;
  initial_state_json: string | null;
  final_state_json: string | null;
  usage_json: string | null;
  started_at: string;
  completed_at: string;
}

interface StoredEventRow {
  id: string;
  run_id: string;
  sequence: number;
  timestamp: string;
  type: TraceEvent["type"];
  data_json: string;
}

/** Durable trace store for local monitoring and run-ID report lookup. */
export class SqliteTraceStore implements TraceStore {
  private readonly database: Database.Database;

  constructor(databasePath = DEFAULT_TRACE_DATABASE_PATH) {
    const resolvedPath = databasePath === ":memory:" ? databasePath : resolve(databasePath);
    if (resolvedPath !== ":memory:") mkdirSync(dirname(resolvedPath), { recursive: true });
    this.database = new Database(resolvedPath);
    this.database.pragma("journal_mode = WAL");
    this.migrate();
  }

  async append(event: TraceEvent): Promise<void> {
    this.insertEvent(event);
  }

  async saveRun(run: AgentRun): Promise<void> {
    const save = this.database.transaction((agentRun: AgentRun) => {
      const existingEvents = this.selectEvents(agentRun.id);
      const events = mergeEvents(existingEvents, agentRun.trace);
      this.database.prepare(`
        INSERT INTO runs (
          id, request_json, initial_state_json, final_state_json, usage_json,
          started_at, completed_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          request_json = excluded.request_json,
          initial_state_json = excluded.initial_state_json,
          final_state_json = excluded.final_state_json,
          usage_json = excluded.usage_json,
          started_at = excluded.started_at,
          completed_at = excluded.completed_at,
          status = excluded.status
      `).run(
        agentRun.id,
        JSON.stringify(agentRun.request),
        JSON.stringify(agentRun.initialState),
        JSON.stringify(agentRun.finalState),
        agentRun.usage === undefined ? null : JSON.stringify(agentRun.usage),
        agentRun.startedAt,
        agentRun.completedAt,
        "completed",
      );
      this.database.prepare("DELETE FROM trace_events WHERE run_id = ?").run(agentRun.id);
      for (const event of events) this.insertEvent(event);
    });
    save(run);
  }

  async loadRun(runId: string): Promise<AgentRun> {
    const row = this.database.prepare(`
      SELECT id, request_json, initial_state_json, final_state_json, usage_json, started_at, completed_at
      FROM runs WHERE id = ?
    `).get(runId) as StoredRunRow | undefined;
    if (row === undefined) throw new Error(`Trace run not found: ${runId}`);
    return this.hydrateRun(row);
  }

  async query(filter: TraceQuery = {}): Promise<AgentRun[]> {
    const clauses: string[] = [];
    const parameters: unknown[] = [];
    if (filter.runId !== undefined) {
      clauses.push("r.id = ?");
      parameters.push(filter.runId);
    }
    if (filter.startedAfter !== undefined) {
      clauses.push("r.started_at >= ?");
      parameters.push(filter.startedAfter);
    }
    if (filter.startedBefore !== undefined) {
      clauses.push("r.started_at <= ?");
      parameters.push(filter.startedBefore);
    }
    if (filter.eventTypes !== undefined && filter.eventTypes.length > 0) {
      clauses.push(`EXISTS (
        SELECT 1 FROM trace_events event_filter
        WHERE event_filter.run_id = r.id
          AND event_filter.type IN (${filter.eventTypes.map(() => "?").join(", ")})
      )`);
      parameters.push(...filter.eventTypes);
    }
    const where = clauses.length === 0 ? "" : `WHERE ${clauses.join(" AND ")}`;
    const limit = filter.limit === undefined ? "" : " LIMIT ?";
    if (filter.limit !== undefined) parameters.push(filter.limit);
    const rows = this.database.prepare(`
      SELECT r.id, r.request_json, r.initial_state_json, r.final_state_json, r.usage_json,
             r.started_at, r.completed_at
      FROM runs r
      ${where}
      ORDER BY r.started_at ASC, r.id ASC${limit}
    `).all(...parameters) as StoredRunRow[];
    return rows.map((row) => this.hydrateRun(row));
  }

  close(): void {
    this.database.close();
  }

  private migrate(): void {
    this.database.exec(TRACE_DDL);
    const columns = this.database.prepare("PRAGMA table_info(runs)").all() as Array<{ name: string }>;
    const existing = new Set(columns.map((column) => column.name));
    if (!existing.has("initial_state_json")) this.database.exec("ALTER TABLE runs ADD COLUMN initial_state_json TEXT");
    if (!existing.has("final_state_json")) this.database.exec("ALTER TABLE runs ADD COLUMN final_state_json TEXT");
    if (!existing.has("usage_json")) this.database.exec("ALTER TABLE runs ADD COLUMN usage_json TEXT");
  }

  private insertEvent(event: TraceEvent): void {
    this.database.prepare(`
      INSERT INTO trace_events (id, run_id, sequence, timestamp, type, data_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        run_id = excluded.run_id,
        sequence = excluded.sequence,
        timestamp = excluded.timestamp,
        type = excluded.type,
        data_json = excluded.data_json
    `).run(event.id, event.runId, event.sequence, event.timestamp, event.type, JSON.stringify(event.data));
  }

  private selectEvents(runId: string): TraceEvent[] {
    const rows = this.database.prepare(`
      SELECT id, run_id, sequence, timestamp, type, data_json
      FROM trace_events WHERE run_id = ? ORDER BY sequence ASC, id ASC
    `).all(runId) as StoredEventRow[];
    return rows.map(toTraceEvent);
  }

  private hydrateRun(row: StoredRunRow): AgentRun {
    if (row.initial_state_json === null || row.final_state_json === null) {
      throw new Error(`Trace run ${row.id} lacks the state snapshots required for assurance analysis`);
    }
    return {
      id: row.id,
      request: JSON.parse(row.request_json),
      initialState: JSON.parse(row.initial_state_json),
      finalState: JSON.parse(row.final_state_json),
      trace: this.selectEvents(row.id),
      startedAt: row.started_at,
      completedAt: row.completed_at,
      ...(row.usage_json === null ? {} : { usage: JSON.parse(row.usage_json) }),
    } as AgentRun;
  }
}

function toTraceEvent(row: StoredEventRow): TraceEvent {
  return {
    id: row.id,
    runId: row.run_id,
    sequence: row.sequence,
    timestamp: row.timestamp,
    type: row.type,
    data: JSON.parse(row.data_json),
  };
}

function mergeEvents(existing: TraceEvent[], current: TraceEvent[]): TraceEvent[] {
  const events = new Map<string, TraceEvent>();
  for (const event of [...existing, ...current]) events.set(event.id, structuredClone(event));
  return [...events.values()].sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
}
