#!/usr/bin/env tsx
import { Command } from "commander";
import { pathToFileURL } from "node:url";

import { executeDemoRun } from "./demo.js";
import { mineTraces } from "../traces/mine.js";
import { InMemoryTraceStore } from "../traces/trace-store.js";

const program = new Command();
program.name("traces-mine").description("Find human-curation candidates in monitored traces.");
program.option("--json", "render candidate fixtures as JSON");
program.action(async (options: { json?: boolean }) => {
  // SQLite persistence is deliberately postponed. Seed a representative defective
  // run so the command remains executable and demonstrates the mining contract.
  const store = new InMemoryTraceStore([await executeDemoRun("skip-audit")]);
  const candidates = await mineTraces(store);
  if (options.json) {
    console.log(JSON.stringify(candidates, null, 2));
    return;
  }
  console.log("TRACE MINING CANDIDATES");
  for (const candidate of candidates) {
    console.log(`  CANDIDATE  ${candidate.reason}  source=${candidate.sourceRunId}`);
  }
  console.log("Candidates require human curation before entering an eval dataset.");
});
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  program.parseAsync().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
