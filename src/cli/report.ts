#!/usr/bin/env tsx
import { Command, Option } from "commander";
import { pathToFileURL } from "node:url";

import { openai } from "@ai-sdk/openai";

import { buildAssuranceReport } from "../assurance/build-report.js";
import { explainAssuranceReport } from "../assurance/explain-report.js";
import { renderAssuranceReport } from "../assurance/render-report.js";
import { executeDemoRun } from "./demo.js";
import { DEFAULT_TRACE_DATABASE_PATH, SqliteTraceStore } from "../traces/sqlite.js";

import type { AgentRun } from "../domain/types.js";
import type { AssuranceReport } from "../assurance/schema.js";

// Matches the direct OpenAI model wired for live Eve runs in agent/agent.ts.
const DEFAULT_EXPLANATION_MODEL = "gpt-5.6-luna";

interface ReportOptions {
  database: string;
  json?: boolean;
  markdown?: boolean;
}

const program = new Command();
program.name("assurance-report").description("Render an assurance report for an AgentRun JSON document.");
program.option("--json", "render JSON instead of the console report");
program.addOption(new Option(
  "--markdown",
  "render an LLM-generated, human-friendly Markdown explanation (requires OPENAI_API_KEY)",
).conflicts("json"));
program.option("--database <path>", "SQLite database path", DEFAULT_TRACE_DATABASE_PATH);
program.argument("[run-id]", "run ID from the SQLite trace store");
program.action(async (runId: string | undefined, options: ReportOptions) => {
  if (runId !== undefined) {
    const store = new SqliteTraceStore(options.database);
    try {
      const run = await store.loadRun(runId);
      console.log(await renderReport(await buildAssuranceReport(run), options));
    } finally {
      store.close();
    }
    return;
  }
  const input = await readStdin();
  const run = input.trim() === "" ? await executeDemoRun() : JSON.parse(input) as AgentRun;
  console.log(await renderReport(await buildAssuranceReport(run), options));
});
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  program.parseAsync().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

async function renderReport(report: AssuranceReport, options: ReportOptions): Promise<string> {
  if (options.markdown === true) return renderMarkdownExplanation(report);
  return renderAssuranceReport(report, options.json === true ? "json" : "console");
}

// The Markdown explanation is the only LLM-dependent rendering; every other
// format stays keyless and deterministic.
async function renderMarkdownExplanation(report: AssuranceReport): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    throw new Error(
      "--markdown generates its explanation with an LLM and requires OPENAI_API_KEY. "
      + `Set ASSURANCE_REPORT_MODEL to override the default model (${DEFAULT_EXPLANATION_MODEL}).`,
    );
  }
  return explainAssuranceReport(report, openai(process.env.ASSURANCE_REPORT_MODEL ?? DEFAULT_EXPLANATION_MODEL));
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  let input = "";
  for await (const chunk of process.stdin) input += String(chunk);
  return input;
}
