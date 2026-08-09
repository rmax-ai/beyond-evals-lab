import { describe, expect, it } from "vitest";

import { buildAssuranceReport } from "../../src/assurance/build-report.js";
import { determineDisposition } from "../../src/assurance/disposition.js";
import { executeDemoRun } from "../../src/cli/demo.js";

describe("buildAssuranceReport", () => {
  it("keeps successful verification separate from an unacceptable trajectory", async () => {
    const report = await buildAssuranceReport(await executeDemoRun("reckless-first-attempt"));

    expect(report.outcome.status).toBe("success");
    expect(report.verification.allRequiredClaimsVerified).toBe(true);
    expect(report.controls.blockedActions).toBe(1);
    expect(report.trajectory.status).toBe("unacceptable");
    expect(determineDisposition(report)).toBe("not_acceptable");
  });

  it("records a missing audit record as failed verification evidence", async () => {
    const report = await buildAssuranceReport(await executeDemoRun("normal", "Please refund €42.", { suppressAuditWrite: true }));

    expect(report.verification.allRequiredClaimsVerified).toBe(false);
    expect(report.residualRisk.some((risk) => risk.description.includes("required audit record"))).toBe(true);
    expect(determineDisposition(report)).toBe("not_acceptable");
  });
});
