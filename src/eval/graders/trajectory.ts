import { analyzeTrajectory } from "../../trajectory/analyze-trajectory.js";

import type { AgentRun } from "../../domain/types.js";
import type { EvalCase } from "../types.js";
import type { Grade, Grader } from "./grader.js";

export class TrajectoryGrader implements Grader {
  name = "trajectory-grader";

  async grade(run: AgentRun, _task: EvalCase): Promise<Grade> {
    const analysis = await analyzeTrajectory(run);
    return {
      grader: this.name,
      dimension: "trajectory",
      status: analysis.status === "acceptable" ? "pass" : "fail",
      evidence: analysis.findings.map((finding) => ({
        type: "derived" as const,
        reference: finding.rule,
        value: finding.description,
      })),
    };
  }
}
