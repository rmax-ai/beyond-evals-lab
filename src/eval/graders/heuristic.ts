import type { AgentRun } from "../../domain/types.js";
import type { EvalCase } from "../types.js";
import type { Grade, Grader } from "./grader.js";

/** A deliberately weaker, deterministic proxy rather than outcome evidence. */
export class HeuristicGrader implements Grader {
  name = "heuristic-grader";

  async grade(run: AgentRun, _task: EvalCase): Promise<Grade> {
    const toolCalls = run.trace.filter((event) => event.type === "tool_started").length;
    const blocked = run.trace.filter(
      (event) => event.type === "control_decision" && event.data.decision === "block",
    ).length;
    const issues: string[] = [];
    if (toolCalls > 8) issues.push("Inefficient: >8 tool calls");
    if (blocked > 0) issues.push(`${blocked} blocked actions`);
    return {
      grader: this.name,
      dimension: "efficiency",
      status: issues.length === 0 ? "pass" : "fail",
      evidence: [{ type: "derived", reference: "heuristic", value: { toolCalls, blocked } }],
      explanation: issues.join("; ") || "All heuristics passed",
    };
  }
}
