#!/usr/bin/env tsx
import { Command } from "commander";
import { pathToFileURL } from "node:url";

import { buildAssuranceReport } from "../assurance/build-report.js";
import { renderAssuranceReport } from "../assurance/render-report.js";
import { executeDemoRun } from "./demo.js";

import type { AgentRun } from "../domain/types.js";

const program = new Command();
program.name("assurance-report").description("Render an assurance report for an AgentRun JSON document.");
program.option("--json", "render JSON instead of the console report");
program.argument("[run-id]", "run ID (requires a persistent trace store, not available in this milestone)");
program.action(async (runId: string | undefined, options: { json?: boolean }) => {
  if (runId !== undefined) {
    throw new Error("Run-ID lookup requires the postponed SQLite trace store. Pipe an AgentRun JSON document instead.");
  }
  const input = await readStdin();
  const run = input.trim() === "" ? await executeDemoRun() : JSON.parse(input) as AgentRun;
  console.log(renderAssuranceReport(await buildAssuranceReport(run), options.json ? "json" : "console"));
});
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  program.parseAsync().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  let input = "";
  for await (const chunk of process.stdin) input += String(chunk);
  return input;
}
