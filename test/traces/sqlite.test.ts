import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { executeDemoRun } from "../../src/cli/demo.js";
import { SqliteTraceStore } from "../../src/traces/sqlite.js";

describe("SqliteTraceStore", () => {
  let databasePath: string;
  let temporaryDirectory: string;
  let store: SqliteTraceStore;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "beyond-evals-traces-"));
    databasePath = join(temporaryDirectory, "assurance.db");
    store = new SqliteTraceStore(databasePath);
  });

  afterEach(async () => {
    store.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("persists immutable complete runs across store instances", async () => {
    const run = await executeDemoRun();
    await store.saveRun(run);
    store.close();

    store = new SqliteTraceStore(databasePath);
    const loaded = await store.loadRun(run.id);

    expect(loaded).toEqual(run);
    loaded.request.message = "mutated only in the caller";
    expect((await store.loadRun(run.id)).request.message).toBe(run.request.message);
  });

  it("merges streamed events when the complete run is saved", async () => {
    const run = await executeDemoRun();
    const [firstEvent] = run.trace;
    if (firstEvent === undefined) throw new Error("Demo run did not create a trace event");

    await store.append(firstEvent);
    await store.saveRun({ ...run, trace: run.trace.slice(1) });

    expect(await store.loadRun(run.id)).toEqual(run);
  });

  it("filters persisted runs by trace event type", async () => {
    const successfulRun = await executeDemoRun();
    const guardedRun = await executeDemoRun("reckless-first-attempt");
    await store.saveRun(successfulRun);
    await store.saveRun(guardedRun);

    const guardedRuns = await store.query({ eventTypes: ["control_decision"] });
    const allRuns = await store.query({ limit: 10 });

    expect(guardedRuns.map((run) => run.id)).toEqual(
      expect.arrayContaining([successfulRun.id, guardedRun.id]),
    );
    expect(allRuns.map((run) => run.id)).toEqual(expect.arrayContaining([successfulRun.id, guardedRun.id]));
    expect(await store.query({ runId: guardedRun.id })).toEqual([guardedRun]);
  });
});
