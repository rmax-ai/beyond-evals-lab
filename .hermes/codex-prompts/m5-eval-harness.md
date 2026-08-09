# Milestone 5: Eval Harness

You are working in a TypeScript project at /home/rmax-10/src/beyond-evals-lab.

Read SPEC.md §10-11, AGENTS.md, and ALL existing source files. src/eval/types.ts partially exists — expand it.

## Context
- Milestone 4 complete: trajectory + validation, 88 tests
- datasets/core.json has 20 eval cases
- verifyRefundOutcome() is the central reusable verifier

## Task

### 1. Complete src/eval/types.ts

```typescript
export interface EvalCase {
  id: string;
  description: string;
  initialState: string | WorldState;  // "fixture:default" or inline state
  request: AgentRequest;
  expectations: {
    outcome?: RefundExpectation;
    requiredTools?: ToolName[];
    forbiddenTools?: ToolName[];
    expectedControls?: { control: string; decision: "allow" | "block" }[];
    validationRules?: string[];
    trajectoryExpectations?: Record<string, unknown>;
  };
  tags: string[];
}

export interface EvalCaseMetrics {
  taskSuccess: boolean;
  verifiedOutcome: boolean;
  trajectoryAcceptable: boolean;
  validationPassed: boolean;
  policyViolations: number;
  policyBlocks: number;
  toolCallCount: number;
  latencyMs: number;
  estimatedCostUsd?: number;
}

export interface EvalCaseResult {
  caseId: string;
  metrics: EvalCaseMetrics;
  run: AgentRun;
  verificationEvidence: VerificationEvidence[];
  trajectoryAnalysis: TrajectoryAnalysis;
  validationResults: ValidationResult[];
}

export interface EvalReport {
  dataset: string;
  cases: number;
  metrics: {
    task_success_rate: number;
    verified_outcome_rate: number;
    trajectory_acceptability_rate: number;
    validation_pass_rate: number;
    policy_block_rate: number;
    mean_tool_calls: number;
    p95_tool_calls: number;
    mean_latency_ms: number;
  };
  disagreements: {
    outcome_pass_trajectory_fail: number;
    verification_pass_validation_fail: number;
    outcome_pass_verification_fail: number;
  };
  results: EvalCaseResult[];
}
```

### 2. src/eval/graders/grader.ts

```typescript
export interface Grade {
  grader: string;
  dimension: string;
  status: "pass" | "fail" | "unknown";
  score?: number;
  evidence: EvidenceReference[];
  explanation?: string;
}

export interface Grader {
  name: string;
  grade(run: AgentRun, task: EvalCase): Promise<Grade>;
}
```

### 3. src/eval/graders/deterministic.ts

The critical demonstration: deterministic code AS an eval grader.

```typescript
export class RefundOutcomeGrader implements Grader {
  name = "refund-outcome-grader";
  
  async grade(run: AgentRun, task: EvalCase): Promise<Grade> {
    const evidence = await verifyRefundOutcome(
      run,
      run.finalState,
      task.expectations.outcome!
    );
    
    return {
      grader: this.name,
      dimension: "outcome",
      status: evidence.every(e => e.status === "verified") ? "pass" : "fail",
      evidence: flattenEvidence(evidence),
    };
  }
}
```

This is THE demonstration that verifyRefundOutcome() works in both runtime and eval contexts.

### 4. src/eval/graders/trajectory.ts

```typescript
export class TrajectoryGrader implements Grader {
  name = "trajectory-grader";
  
  async grade(run: AgentRun, task: EvalCase): Promise<Grade> {
    const analysis = await analyzeTrajectory(run);
    return {
      grader: this.name,
      dimension: "trajectory",
      status: analysis.status === "acceptable" ? "pass" : "fail",
      evidence: analysis.findings.map(f => ({ type: "derived" as const, reference: f.rule, value: f.description })),
    };
  }
}
```

### 5. src/eval/graders/heuristic.ts

```typescript
export class HeuristicGrader implements Grader {
  name = "heuristic-grader";
  
  async grade(run: AgentRun, task: EvalCase): Promise<Grade> {
    // Check tool call efficiency
    // Check for duplicate reads
    // Check for blocked actions
    const toolCalls = run.trace.filter(e => e.type === "tool_started").length;
    const blocked = run.trace.filter(e => e.type === "control_decision" && e.data.decision === "block").length;
    
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
```

### 6. src/eval/datasets.ts

```typescript
// Load eval cases from JSON, resolve "fixture:*" references to actual WorldState
export function loadDataset(path: string): EvalCase[];
export function resolveFixture(name: string): WorldState;
```

### 7. src/eval/runner.ts

```typescript
export class EvalRunner {
  constructor(private graders: Grader[]) {}
  
  async runCase(evalCase: EvalCase, agent: Agent): Promise<EvalCaseResult> {
    // 1. Resolve initialState
    // 2. Run executeRun()
    // 3. Run all graders
    // 4. Run verification
    // 5. Run trajectory analysis  
    // 6. Run validation
    // 7. Compute metrics
    // 8. Return EvalCaseResult
  }
  
  async runDataset(dataset: EvalCase[], agent: Agent): Promise<EvalReport> {
    // Run all cases, aggregate results
    // Compute rates, disagreements
  }
}
```

### 8. src/eval/aggregate.ts

```typescript
export function aggregateResults(results: EvalCaseResult[]): EvalReport["metrics"] & { disagreements: EvalReport["disagreements"] };
```

### 9. src/cli/eval.ts — Eval CLI

```typescript
#!/usr/bin/env tsx
import { Command } from "commander";

const program = new Command();
program.name("eval").description("Run eval harness");

program
  .argument("[dataset]", "Dataset name", "core")
  .action(async (dataset: string) => {
    const cases = loadDataset(`datasets/${dataset}.json`);
    const agent = new RuleBasedRefundAgent();
    const runner = new EvalRunner([
      new RefundOutcomeGrader(),
      new TrajectoryGrader(),
      new HeuristicGrader(),
    ]);
    const report = await runner.runDataset(cases, agent);
    console.log(formatReport(report));
  });

program.parse();
```

Format output like SPEC.md §22:
```
BEYOND EVALS LAB
Dataset: core
Cases: 20

Outcome
  success rate                    90.0%
...
Important disagreements
  Outcome PASS / Trajectory FAIL       4
  Verification PASS / Validation FAIL  3
```

## Verification
1. `npx tsc --noEmit` passes
2. `pnpm eval` runs against datasets/core.json (20 cases)
3. Reports all dimensions separately
4. Shows disagreements section
5. No aggregate "agent quality" score
