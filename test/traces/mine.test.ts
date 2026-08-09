import { describe, expect, it } from "vitest";

import { executeDemoRun } from "../../src/cli/demo.js";
import { mineTraces } from "../../src/traces/mine.js";
import { InMemoryTraceStore } from "../../src/traces/trace-store.js";

describe("mineTraces", () => {
  it("creates human-curation candidates for a defective monitored run", async () => {
    const run = await executeDemoRun("skip-audit");
    const candidates = await mineTraces(new InMemoryTraceStore([run]));

    expect(candidates.map((candidate) => candidate.reason)).toEqual(
      expect.arrayContaining(["verification-failure", "trajectory-failure"]),
    );
    expect(candidates.every((candidate) => candidate.status === "candidate")).toBe(true);
    expect(candidates.every((candidate) => candidate.fixture.tags.includes("candidate"))).toBe(true);
  });
});
