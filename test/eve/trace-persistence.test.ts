import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { persistEveRun } from "../../src/cli/eve.js";
import { supportUser } from "../../src/domain/fixtures.js";
import { EveSessionRuntime } from "../../src/eve/session-runtime.js";
import { mineTraces } from "../../src/traces/mine.js";
import { SqliteTraceStore } from "../../src/traces/sqlite.js";

describe("Eve trace persistence", () => {
  let temporaryDirectory: string | undefined;

  afterEach(async () => {
    if (temporaryDirectory !== undefined) {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("stores an exported Eve run for assurance reporting and trace mining", async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "beyond-evals-eve-traces-"));
    const databasePath = join(temporaryDirectory, "assurance.db");
    const runtime = new EveSessionRuntime("eve-persisted-run", supportUser.id);
    runtime.start("Refund more than my approval limit.");
    await runtime.executeToolCall(
      "createRefund",
      { transactionId: "txn-1", amountCents: supportUser.refundLimitCents + 1 },
      "eve-persisted-call",
    );
    const run = runtime.finish("The request was blocked.");

    await persistEveRun(run, databasePath);

    const store = new SqliteTraceStore(databasePath);
    try {
      expect(await store.loadRun(run.id)).toEqual(run);
      const candidates = await mineTraces(store);
      expect(candidates).toEqual(expect.arrayContaining([
        expect.objectContaining({ sourceRunId: run.id, reason: "control-block" }),
      ]));
    } finally {
      store.close();
    }
  });
});
