import type { AssuranceReport } from "./schema.js";

/** Applies explicit assurance policy rules without creating a weighted score. */
export function determineDisposition(
  report: AssuranceReport,
): "acceptable" | "not_acceptable" | "needs_review" {
  if (!report.verification.allRequiredClaimsVerified) return "not_acceptable";
  if (report.trajectory.status === "unacceptable") return "not_acceptable";
  if (report.validation.results.some((result) => result.status === "fail")) return "not_acceptable";
  if (report.residualRisk.some((risk) => risk.severity === "unknown")) return "needs_review";
  return "acceptable";
}
