import { generateText } from "ai";

import { determineDisposition } from "./disposition.js";

import type { LanguageModel } from "ai";
import type { AssuranceReport } from "./schema.js";
import type { EvidenceReference } from "../verification/types.js";

const SYSTEM_PROMPT = `You explain assurance reports for a single agent run to humans.

You receive one structured JSON assurance report plus its policy-derived
disposition. Write only the explanatory narrative that will appear after a
deterministic audit checklist.

Rules:
- Use only facts present in the JSON report and the provided disposition. \
Never invent events, numbers, or causes.
- Keep the assurance dimensions separate: controls, verification, validation, \
trajectory, outcome, residual risk. Never merge them into a single score, \
grade, or percentage.
- Do not change, restate as a new verdict, or contradict the deterministic \
disposition and checklist that precede your narrative.
- Write two to four short paragraphs for a reader who is not an assurance \
specialist. Refer to relevant verification claims, control names, validation \
rules, or trajectory rules using their exact names from the report.
- Do not add headings, a title, tables, checklists, recommendations, or \
facts not present in the report.
- When evidence is empty or a status is "unknown", say so plainly instead of \
speculating.`;

/**
 * Renders an audit-friendly Markdown report. Deterministic report data appears
 * before the non-authoritative AI narrative so a reviewer can check every
 * narrative statement against the source evidence.
 */
export async function explainAssuranceReport(
  report: AssuranceReport,
  model: LanguageModel,
): Promise<string> {
  const { text } = await generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt: [
      `Derived disposition: ${determineDisposition(report)}`,
      "",
      "Assurance report JSON:",
      "```json",
      JSON.stringify(report, null, 2),
      "```",
      "",
      "Render the Markdown explanation.",
    ].join("\n"),
  });
  return [
    renderDeterministicAudit(report),
    "",
    "## 4. AI explanatory narrative (non-authoritative)",
    "",
    text.trim(),
  ].join("\n");
}

function renderDeterministicAudit(report: AssuranceReport): string {
  const disposition = determineDisposition(report).replaceAll("_", " ").toUpperCase();
  const verification = report.verification.allRequiredClaimsVerified ? "PASS" : "FAIL";
  const validation = report.validation.results.some((result) => result.status === "fail") ? "FAIL" : "PASS";
  const outcome = report.outcome.status.toUpperCase();
  const trajectory = report.trajectory.status.toUpperCase();
  const controls = report.controls.blockedActions === 0
    ? "PASS (no actions blocked)"
    : `FAIL (${report.controls.blockedActions} action${report.controls.blockedActions === 1 ? "" : "s"} blocked)`;

  return [
    `# Assurance audit: \`${report.runId}\``,
    "",
    `> **Deterministic disposition: ${disposition}.** The sections through residual risk are derived directly from the AssuranceReport.`,
    "> The AI narrative is explanatory only; any statement not supported by the deterministic checklist below should be treated as unsupported.",
    "",
    "## 1. Deterministic verdict and status summary",
    "",
    "| Dimension | Status |",
    "| --- | --- |",
    `| Outcome | ${outcome} |`,
    `| Verification | ${verification} |`,
    `| Validation | ${validation} |`,
    `| Controls | ${controls} |`,
    `| Trajectory | ${trajectory} |`,
    `| Disposition | ${disposition} |`,
    "",
    "## 2. Deterministic evidence and claim checklist",
    "",
    "### Verification claims",
    ...renderVerificationChecklist(report),
    "",
    "### Validation checks",
    ...renderValidationChecklist(report),
    "",
    "### Outcome evidence",
    ...renderOutcomeEvidence(report),
    "",
    "## 3. Controls, trajectory, and residual risk",
    "",
    "### Controls",
    ...renderControls(report),
    "",
    "### Trajectory",
    ...renderTrajectory(report),
    "",
    "### Residual risk",
    ...renderResidualRisk(report),
  ].join("\n");
}

function renderVerificationChecklist(report: AssuranceReport): string[] {
  if (report.verification.evidence.length === 0) {
    return ["No verification claims were available for this run."];
  }
  return report.verification.evidence.flatMap((item) => [
    `- ${checkmark(item.status)} **${item.status.toUpperCase()}** — \`${item.claim}\``,
    `  - Verifier: \`${item.verifier}\`; confidence: \`${item.confidence}\`.`,
    ...renderEvidence(item.evidence),
  ]);
}

function renderValidationChecklist(report: AssuranceReport): string[] {
  if (report.validation.results.length === 0) return ["No validation checks were available for this run."];
  return report.validation.results.flatMap((result) => [
    `- ${validationMark(result.status)} **${result.status.toUpperCase()}** — \`${result.rule}\`: ${result.explanation}`,
    ...renderEvidence(result.evidence),
  ]);
}

function renderOutcomeEvidence(report: AssuranceReport): string[] {
  if (report.outcome.evidence.length === 0) return ["No outcome evidence was available for this run."];
  return renderEvidence(report.outcome.evidence).map((line) => line.replace("  - ", "- "));
}

function renderControls(report: AssuranceReport): string[] {
  if (report.controls.decisions.length === 0) return ["No control decisions were recorded."];
  return report.controls.decisions.map((decision) =>
    `- **${decision.decision.toUpperCase()}** — \`${decision.control}\`: ${decision.reason}`,
  );
}

function renderTrajectory(report: AssuranceReport): string[] {
  if (report.trajectory.findings.length === 0) return [`Status: **${report.trajectory.status.toUpperCase()}**; no trajectory findings.`];
  return [
    `Status: **${report.trajectory.status.toUpperCase()}**.`,
    ...report.trajectory.findings.flatMap((finding) => [
      `- **${finding.severity.toUpperCase()}** — \`${finding.rule}\`: ${finding.description}`,
      ...renderEvidence(finding.evidence),
    ]),
  ];
}

function renderResidualRisk(report: AssuranceReport): string[] {
  if (report.residualRisk.length === 0) return ["No residual risks were identified."];
  return report.residualRisk.map((risk) =>
    `- **${(risk.severity ?? "unknown").toUpperCase()}** — ${risk.description}`,
  );
}

function renderEvidence(evidence: EvidenceReference[]): string[] {
  if (evidence.length === 0) return ["  - Evidence: none recorded."];
  return evidence.map((item) => `  - Evidence: \`${item.type}:${item.reference}\`.`);
}

function checkmark(status: "verified" | "failed" | "unknown"): string {
  if (status === "verified") return "[x]";
  if (status === "failed") return "[!]";
  return "[?]";
}

function validationMark(status: "pass" | "fail" | "unknown"): string {
  if (status === "pass") return "[x]";
  if (status === "fail") return "[!]";
  return "[?]";
}
