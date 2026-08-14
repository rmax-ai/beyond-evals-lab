import { describe, expect, it } from "vitest";
import { MockLanguageModelV4 } from "ai/test";

import { buildAssuranceReport } from "../../src/assurance/build-report.js";
import { explainAssuranceReport } from "../../src/assurance/explain-report.js";
import { executeDemoRun } from "../../src/cli/demo.js";

const NARRATIVE = "The refund completed and every check passed.";

function cannedModel(text: string): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 50, text: 50, reasoning: undefined },
      },
      warnings: [],
    },
  });
}

describe("explainAssuranceReport", () => {
  it("places the trimmed model narrative after a deterministic audit checklist", async () => {
    const report = await buildAssuranceReport(await executeDemoRun());

    const markdown = await explainAssuranceReport(report, cannedModel(`\n${NARRATIVE}\n`));

    expect(markdown).toContain(`# Assurance audit: \`${report.runId}\``);
    expect(markdown).toContain("## 1. Deterministic verdict and status summary");
    expect(markdown).toContain("## 2. Deterministic evidence and claim checklist");
    expect(markdown).toContain("### Validation checks");
    expect(markdown).toContain("### Outcome evidence");
    expect(markdown).toContain("## 3. Controls, trajectory, and residual risk");
    expect(markdown).toContain("## 4. AI explanatory narrative (non-authoritative)");
    expect(markdown).toContain(NARRATIVE);
    expect(markdown.indexOf("## 4. AI explanatory narrative (non-authoritative)")).toBeLessThan(
      markdown.indexOf(NARRATIVE),
    );
  });

  it("grounds the explanation in the report JSON and the policy-derived disposition", async () => {
    const report = await buildAssuranceReport(await executeDemoRun("reckless-first-attempt"));
    const model = cannedModel(NARRATIVE);

    await explainAssuranceReport(report, model);

    expect(model.doGenerateCalls).toHaveLength(1);
    const prompt = JSON.stringify(model.doGenerateCalls[0]?.prompt);
    expect(prompt).toContain(report.runId);
    expect(prompt).toContain("Derived disposition: not_acceptable");
  });

  it("instructs the model to keep the dimensions separate instead of scoring", async () => {
    const report = await buildAssuranceReport(await executeDemoRun());
    const model = cannedModel(NARRATIVE);

    await explainAssuranceReport(report, model);

    const system = JSON.stringify(model.doGenerateCalls[0]?.prompt);
    expect(system).toContain("Never merge them into a single score");
    expect(system).toContain("Derived disposition: acceptable");
  });

  it("makes failed deterministic claims and their evidence references visible before the narrative", async () => {
    const report = await buildAssuranceReport(await executeDemoRun("normal", "Please refund €42.", {
      suppressAuditWrite: true,
    }));

    const markdown = await explainAssuranceReport(report, cannedModel(NARRATIVE));

    expect(markdown).toContain("**FAILED** — `required audit record exists`");
    expect(markdown).toContain("Verifier: `verify-refund-outcome`; confidence: `deterministic`.");
    expect(markdown).toContain("Evidence: `world_state:auditRecords[refund_created]`.");
    expect(markdown).toContain("**PASS** — `duplicate-suspicion`");
    expect(markdown).toContain("**Deterministic disposition: NOT ACCEPTABLE.**");
  });
});
