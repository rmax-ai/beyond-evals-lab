import type { AgentRun, TraceEvent } from "../domain/types.js";
import type { TraceQuery, TraceStore } from "./schema.js";

/**
 * PoC trace persistence adapter. Full runs are explicitly saved by their owner;
 * append supports streaming trace-event capture for the future SQLite adapter.
 */
export class InMemoryTraceStore implements TraceStore {
  private readonly runs = new Map<string, AgentRun>();
  private readonly pendingEvents = new Map<string, TraceEvent[]>();

  constructor(initialRuns: AgentRun[] = []) {
    for (const run of initialRuns) this.saveRun(run);
  }

  async append(event: TraceEvent): Promise<void> {
    const existing = this.runs.get(event.runId);
    if (existing !== undefined) {
      const withoutEvent = existing.trace.filter((candidate) => candidate.id !== event.id);
      this.runs.set(event.runId, { ...existing, trace: [...withoutEvent, structuredClone(event)] });
      return;
    }
    this.pendingEvents.set(event.runId, [...(this.pendingEvents.get(event.runId) ?? []), structuredClone(event)]);
  }

  /** Stores an immutable complete run. */
  async saveRun(run: AgentRun): Promise<void> {
    const pending = this.pendingEvents.get(run.id) ?? [];
    const trace = pending.length === 0 ? run.trace : [...run.trace, ...pending];
    this.runs.set(run.id, structuredClone({ ...run, trace }));
    this.pendingEvents.delete(run.id);
  }

  async loadRun(runId: string): Promise<AgentRun> {
    const run = this.runs.get(runId);
    if (run === undefined) throw new Error(`Trace run not found: ${runId}`);
    return structuredClone(run);
  }

  async query(filter: TraceQuery = {}): Promise<AgentRun[]> {
    let runs = [...this.runs.values()];
    if (filter.runId !== undefined) runs = runs.filter((run) => run.id === filter.runId);
    if (filter.startedAfter !== undefined) runs = runs.filter((run) => run.startedAt >= filter.startedAfter!);
    if (filter.startedBefore !== undefined) runs = runs.filter((run) => run.startedAt <= filter.startedBefore!);
    if (filter.eventTypes !== undefined) runs = runs.filter((run) => run.trace.some((event) => filter.eventTypes!.includes(event.type)));
    if (filter.limit !== undefined) runs = runs.slice(0, filter.limit);
    return structuredClone(runs);
  }
}
