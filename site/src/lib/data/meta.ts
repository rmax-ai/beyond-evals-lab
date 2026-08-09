export const PROJECT_VERSION = "v0.1.0";
export const REPO_URL = "https://github.com/rmax-ai/beyond-evals-lab";
export const STACK = [
  "TypeScript",
  "pnpm",
  "Vitest",
  "zod",
  "commander",
  "@opentelemetry/api",
] as const;

export const DEMOS = [
  { name: "demo:success", label: "Correct execution" },
  { name: "demo:trajectory-failure", label: "Outcome pass, trajectory fail" },
  { name: "demo:verification-failure", label: "Verification failure" },
  { name: "demo:validation-failure", label: "Verification pass, validation fail" },
  { name: "demo:control-block", label: "Guardrail block" },
  { name: "demo:feedback-loop", label: "Production → regression" },
] as const;

export const EXPERIMENTS = [
  {
    num: 1,
    title: "Tests are not the opposite of evals",
    commands: ["pnpm test", "pnpm eval"],
    insight:
      "Vitest deterministically establishes properties of implementation components. The eval harness runs tasks sampled from an empirical task distribution. Some eval graders are deterministic. Determinism does not distinguish tests from evals.",
  },
  {
    num: 2,
    title: "Verify one run",
    commands: ["pnpm demo:success"],
    insight:
      "`verifyRefundOutcome()` establishes evidence for a specific execution. This is verification — claims about what happened in one run.",
  },
  {
    num: 3,
    title: "Evaluate many runs",
    commands: ["pnpm eval"],
    insight:
      "The same verifier now contributes to `verified_outcome_rate`. Same function, different epistemic role. Verification = one run. Evaluation = population estimate.",
  },
  {
    num: 4,
    title: "Correct outcome, unacceptable path",
    commands: ["pnpm demo:trajectory-failure"],
    insight:
      "The agent produced the correct refund but attempted a prohibited action first. Outcome-only evaluation would have missed this.",
  },
  {
    num: 5,
    title: "Verification is not validation",
    commands: ["pnpm demo:validation-failure"],
    insight:
      "The system correctly executed a refund it should never have chosen. Verification asks 'was this executed correctly?' Validation asks 'should this have been done at all?'",
  },
  {
    num: 6,
    title: "Guardrails are not verification",
    commands: ["pnpm demo:control-block"],
    insight:
      "A control asks: May this action execute? A verifier asks: What actually happened? Neither replaces the other.",
  },
  {
    num: 7,
    title: "Production creates future evals",
    commands: ["pnpm demo:feedback-loop", "pnpm traces:mine"],
    insight:
      "Production traces become the empirical task distribution for future evaluations. The human curation step is preserved deliberately.",
  },
] as const;

export const METRICS = [
  { label: "Tests", value: "91", desc: "across 22 test files", status: "pass" },
  { label: "Verified Outcome Rate", value: "90.0%", desc: "deterministic claims per run", status: "pass" },
  { label: "Validation Pass Rate", value: "85.0%", desc: "business-intent rules", status: "pass" },
  { label: "Outcome Success Rate", value: "65.0%", desc: "over 20 eval cases", status: "warn" },
  { label: "Trajectory Acceptability", value: "40.0%", desc: "path analysis", status: "fail" },
  { label: "Disagreement Cases", value: "8", desc: "Outcome PASS / Trajectory FAIL", status: "info" },
] as const;

export const CONCEPTUAL_MAP = [
  { mechanism: "Test", question: "Does this software property hold?", scope: "implementation" },
  { mechanism: "Control", question: "Is this proposed action permitted?", scope: "pre-action" },
  { mechanism: "Verification", question: "What can we establish about this execution?", scope: "one run" },
  { mechanism: "Trajectory", question: "Was the path acceptable?", scope: "one run" },
  { mechanism: "Validation", question: "Was this behavior appropriate?", scope: "scenario/system" },
  { mechanism: "Monitoring", question: "What is happening in deployed executions?", scope: "production" },
  { mechanism: "Eval", question: "How does behavior vary across a task distribution?", scope: "population" },
  { mechanism: "Assurance", question: "What evidence supports the claims we care about?", scope: "system-level" },
] as const;

export const KEY_DECISIONS = [
  "Same verifier function, two roles — runtime assurance and eval grading",
  "Claim-oriented verification — structured evidence per claim, not a boolean",
  "No aggregate quality score — dimensions reported separately",
  "Controls + verification are complementary — prevent vs. detect",
  "Human curation in the feedback loop — observed behavior ≠ expected behavior",
] as const;
