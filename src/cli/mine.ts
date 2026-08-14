#!/usr/bin/env tsx
import { Command } from "commander";
import { pathToFileURL } from "node:url";

import { mineTraces } from "../traces/mine.js";
import { DEFAULT_TRACE_DATABASE_PATH, SqliteTraceStore } from "../traces/sqlite.js";

const program = new Command();
program.name("traces-mine").description("Find human-curation candidates in monitored traces.");
program.option("--json", "render candidate fixtures as JSON");
program.option("--database <path>", "SQLite database path", DEFAULT_TRACE_DATABASE_PATH);
program.action(async (options: { database: string; json?: boolean }) => {
  const store = new SqliteTraceStore(options.database);
  try {
    const candidates = await mineTraces(store);
    if (options.json) {
      console.log(JSON.stringify(candidates, null, 2));
      return;
    }
    console.log("TRACE MINING CANDIDATES");
    for (const candidate of candidates) {
      console.log(`  CANDIDATE  ${candidate.reason}  source=${candidate.sourceRunId}`);
    }
    if (candidates.length === 0) console.log("  No candidate traces found.");
    console.log("Candidates require human curation before entering an eval dataset.");
  } finally {
    store.close();
  }
});
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  program.parseAsync().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
