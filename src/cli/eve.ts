#!/usr/bin/env tsx
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { Command } from "commander";

import { buildAssuranceReport } from "../assurance/build-report.js";
import { renderAssuranceReport } from "../assurance/render-report.js";

import type { ChildProcess } from "node:child_process";
import type { AgentRun } from "../domain/types.js";

const DEFAULT_PORT = 4311;
const SERVER_READY_TIMEOUT_MS = 30_000;
const SESSION_TIMEOUT_MS = 60_000;
const STREAM_TAIL_SIZE = 20;

interface EveSessionCreated {
  readonly sessionId: string;
  readonly continuationToken: string;
}

interface StreamCollection {
  readonly run: AgentRun;
  readonly tail: string[];
}

const program = new Command();
program.name("demo:eve").description("Run the Eve refund demo and render its assurance report.");
program.option("--port <port>", "port for the temporary Eve dev server", parsePort, DEFAULT_PORT);
program.option("--json", "render the report as JSON instead of the console summary");
program.option("--out <path>", "also write the report JSON to a file");
program.action(async (options: { port: number; json?: boolean; out?: string }) => {
  await runDemo(options.port, options.json === true, options.out);
});

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  program.parseAsync().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

async function runDemo(port: number, json: boolean, outPath?: string): Promise<void> {
  const logDirectory = await mkdtemp(join(tmpdir(), "beyond-evals-eve-"));
  const logPath = join(logDirectory, "eve-dev.log");
  const log = createWriteStream(logPath, { flags: "a" });
  const server = startEveServer(port, log);

  try {
    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForServer(baseUrl, logPath);
    const session = await createSession(baseUrl);
    const collection = await collectRun(baseUrl, session.sessionId);
    const report = await buildAssuranceReport(collection.run);
    if (outPath !== undefined) {
      await writeFile(outPath, JSON.stringify(report, null, 2));
    }
    console.log(renderAssuranceReport(report, json ? "json" : "console"));
  } catch (error) {
    const diagnostics = await readDiagnostics(logPath);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}${diagnostics === "" ? "" : `\nEve dev log (${logPath}):\n${diagnostics}`}`);
  } finally {
    await stopServer(server);
    await new Promise<void>((resolve) => log.end(resolve));
  }
}

function startEveServer(port: number, log: ReturnType<typeof createWriteStream>): ChildProcess {
  // Keyless mock is the default; EVE_DIRECT_OPENAI=1 lets the server inherit a
  // live provider configuration from the parent environment instead.
  const liveDirect = process.env.EVE_DIRECT_OPENAI === "1";
  const server = spawn(process.execPath, ["./node_modules/eve/bin/eve.js", "dev", "--port", String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, ...(liveDirect ? {} : { EVE_MOCK: "1" }) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout?.pipe(log, { end: false });
  server.stderr?.pipe(log, { end: false });
  server.once("error", (error: Error) => log.write(`Unable to start Eve dev server: ${error.message}\n`));
  return server;
}

async function waitForServer(baseUrl: string, logPath: string): Promise<void> {
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;
  let lastError = "no response";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1_000) });
      // Any HTTP response proves the local Eve server has accepted a connection.
      if (response.status >= 100) return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await delay(250);
  }

  const diagnostics = await readDiagnostics(logPath);
  throw new Error(`Timed out waiting for Eve dev server: ${lastError}${diagnostics === "" ? "" : `\n${diagnostics}`}`);
}

async function createSession(baseUrl: string): Promise<EveSessionCreated> {
  const response = await fetch(`${baseUrl}/eve/v1/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message:
        "Please refund transaction txn-1 in full. After the refund flow is "
        + "complete and verified, call export-run to export the run for the "
        + "assurance report. [case: demo-assurance]",
    }),
    signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Eve session creation failed (${response.status}): ${await response.text()}`);
  }

  const payload: unknown = await response.json();
  if (!isSessionCreated(payload)) {
    throw new Error("Eve session creation response did not include sessionId and continuationToken.");
  }
  return payload;
}

async function collectRun(baseUrl: string, sessionId: string): Promise<StreamCollection> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SESSION_TIMEOUT_MS);
  const tail: string[] = [];
  let run: AgentRun | undefined;

  try {
    const response = await fetch(`${baseUrl}/eve/v1/session/${encodeURIComponent(sessionId)}/stream`, {
      signal: controller.signal,
    });
    if (!response.ok || response.body === null) {
      throw new Error(`Eve session stream failed (${response.status}): ${await response.text()}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffered = "";
    let waiting = false;
    while (!waiting) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffered += decoder.decode(chunk.value, { stream: true });
      const lines = buffered.split("\n");
      buffered = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim() === "") continue;
        remember(tail, line);
        const event = parseEvent(line);
        run ??= exportedRun(event);
        if (event.type === "session.waiting") {
          waiting = true;
          break;
        }
      }
    }
    await reader.cancel();

    if (run === undefined) {
      throw new Error(`Eve stream reached its boundary without export-run output. Stream tail:\n${tail.join("\n")}`);
    }
    return { run, tail };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to consume Eve session stream: ${message}\nStream tail:\n${tail.join("\n")}`);
  } finally {
    clearTimeout(timeout);
  }
}

function exportedRun(event: Record<string, unknown>): AgentRun | undefined {
  if (event.type !== "action.result" || !isRecord(event.data) || !isRecord(event.data.result)) {
    return undefined;
  }
  const result = event.data.result;
  if (result.toolName !== "export-run") return undefined;

  if (isAgentRun(result.output)) return result.output;

  // Eve's action result contains the bridge ToolResult. The diagnostic tool's
  // `output` property is the lab AgentRun artifact.
  if (!isRecord(result.output) || result.output.success !== true || !isAgentRun(result.output.output)) {
    return undefined;
  }
  return result.output.output;
}

function parseEvent(line: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(line);
  if (!isRecord(parsed) || typeof parsed.type !== "string") {
    throw new Error(`Invalid Eve stream event: ${line}`);
  }
  return parsed;
}

function isSessionCreated(value: unknown): value is EveSessionCreated {
  return isRecord(value)
    && typeof value.sessionId === "string"
    && typeof value.continuationToken === "string";
}

function isAgentRun(value: unknown): value is AgentRun {
  return isRecord(value)
    && typeof value.id === "string"
    && isRecord(value.request)
    && Array.isArray(value.trace)
    && isRecord(value.initialState)
    && isRecord(value.finalState)
    && typeof value.startedAt === "string"
    && typeof value.completedAt === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function remember(tail: string[], line: string): void {
  tail.push(line);
  if (tail.length > STREAM_TAIL_SIZE) tail.shift();
}

async function stopServer(server: ChildProcess): Promise<void> {
  if (server.exitCode !== null || server.killed) return;
  server.kill("SIGTERM");
}

async function readDiagnostics(logPath: string): Promise<string> {
  try {
    return (await readFile(logPath, "utf8")).trim();
  } catch {
    return "";
  }
}

function parsePort(value: string): number {
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return port;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
