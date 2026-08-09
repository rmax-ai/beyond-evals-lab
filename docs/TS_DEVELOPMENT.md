# TypeScript Development Conventions — Beyond Evals Lab

> Companion to AGENTS.md. Language-specific idioms, error handling, async
> patterns, testing, and tooling.

## Project Setup

```bash
pnpm init
pnpm add -D typescript tsx vitest @types/node
pnpm add zod better-sqlite3 commander @opentelemetry/api
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "test"]
}
```

Key flags:
- `noUncheckedIndexedAccess` — critical for assurance code; prevents `undefined` from array/record access
- `module: "NodeNext"` — native ESM; imports must use `.js` extensions
- `strict: true` — all strict flags enabled

## Module System

Use **ESM** (not CommonJS). Package.json needs `"type": "module"`.

```typescript
// CORRECT — .js extension for ESM resolution
import { WorldState } from "../domain/types.js";

// WRONG — no extension (fails at runtime)
import { WorldState } from "../domain/types";
```

`tsx` handles `.ts` extensions, but `tsc` with NodeNext requires `.js`. Write
imports with `.js` extensions for compatibility with both.

## vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["test/**/*.test.ts"],
  },
});
```

## Error Handling Patterns

### Domain errors as typed results

```typescript
// Prefer this pattern for tools
export type ToolResult<O> =
  | { success: true; output: O }
  | { success: false; error: string };

// NOT thrown exceptions for domain logic
```

### Verification never throws

```typescript
// Verification returns evidence, never throws
async function verifyRefundOutcome(
  run: AgentRun,
  state: WorldState,
  expectation: RefundExpectation
): Promise<VerificationEvidence[]> {
  const evidence: VerificationEvidence[] = [];
  // ... build evidence array
  return evidence;
}
```

## Immutable State Pattern

```typescript
// Tools return NEW state, runtime applies
class CreateRefundTool implements Tool<CreateRefundInput, Refund> {
  async execute(
    input: CreateRefundInput,
    context: ToolExecutionContext
  ): Promise<ToolResult<Refund>> {
    // Read current state (immutable snapshot)
    const { state } = context;

    // Validate
    const transaction = state.transactions.find(t => t.id === input.transactionId);
    if (!transaction) return { success: false, error: "Transaction not found" };

    // Produce output (no mutation yet)
    const refund: Refund = { /* ... */ };

    return { success: true, output: refund };
  }
}

// Runtime applies mutation
function applyMutation(state: WorldState, refund: Refund): WorldState {
  return {
    ...state,
    refunds: [...state.refunds, refund],
    transactions: state.transactions.map(t =>
      t.id === refund.transactionId
        ? { ...t, status: "refunded" as const }
        : t
    ),
  };
}
```

## Zod Patterns

### Tool input validation

```typescript
import { z } from "zod";

export const CreateRefundInputSchema = z.object({
  transactionId: z.string().min(1),
  amountCents: z.number().int().positive(),
});

export type CreateRefundInput = z.infer<typeof CreateRefundInputSchema>;
```

### Parse at boundaries only

```typescript
// In the runtime's executeTool, parse ONCE
const parsed = CreateRefundInputSchema.safeParse(rawInput);
if (!parsed.success) {
  // Return control decision: BLOCK (schema failure)
  return { decision: "block", reason: "Schema validation failed" };
}

// Pass parsed data to tool — tool trusts it
const result = await tool.execute(parsed.data, context);
```

### Don't over-use zod

Zod is for runtime validation at I/O boundaries (CLI args, JSON files, HTTP if
added). Internal interfaces use TypeScript types. Don't wrap every internal
function in zod schemas.

## better-sqlite3 Patterns

```typescript
import Database from "better-sqlite3";

const db = new Database("traces/assurance.db");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Prepared statements for performance
const insertEvent = db.prepare(`
  INSERT INTO trace_events (id, run_id, sequence, event_type, payload_json, timestamp)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Use transactions for atomicity
const appendTrace = db.transaction((events: TraceEvent[]) => {
  for (const event of events) {
    insertEvent.run(
      event.id, event.runId, event.sequence,
      event.type, JSON.stringify(event.data), event.timestamp
    );
  }
});
```

## Testing Patterns

### Deterministic Domain Tests

```typescript
import { describe, it, expect } from "vitest";

describe("createRefund", () => {
  it("creates exactly one refund", async () => {
    const state = createFixtureState();
    const tool = new CreateRefundTool();
    const result = await tool.execute(
      { transactionId: "txn-1", amountCents: 4200 },
      { state, actor: supportUser, requestId: "req-1" }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.amountCents).toBe(4200);
      expect(result.output.transactionId).toBe("txn-1");
    }
  });

  it("fails for non-existent transaction", async () => {
    const state = createFixtureState();
    const tool = new CreateRefundTool();
    const result = await tool.execute(
      { transactionId: "txn-nonexistent", amountCents: 4200 },
      { state, actor: supportUser, requestId: "req-1" }
    );

    expect(result.success).toBe(false);
  });
});
```

### Verifier Tests (Synthetic Runs)

```typescript
describe("verifyRefundOutcome", () => {
  it("reports claim failure for missing audit record", async () => {
    // Construct a synthetic run where refund exists but audit doesn't
    const run = createSyntheticRun({ missingAudit: true });
    const evidence = await verifyRefundOutcome(run, run.finalState, {
      transactionId: "txn-1",
      amountCents: 4200,
      auditRequired: true,
    });

    const auditClaim = evidence.find(e => e.claim === "audit record exists");
    expect(auditClaim?.status).toBe("failed");
  });
});
```

### Eval Harness Tests (Fixed Dataset)

```typescript
describe("EvalRunner", () => {
  it("computes correct verified_outcome_rate", async () => {
    const dataset: EvalCase[] = [
      /* 4 cases, 3 pass verification */
    ];
    const runner = new EvalRunner(/* ... */);
    const report = await runner.runDataset(dataset, ruleAgent);

    expect(report.metrics.verified_outcome_rate).toBe(0.75);
    expect(report.cases).toBe(4);
  });
});
```

## CLI Patterns (Commander)

```typescript
import { Command } from "commander";

const program = new Command();

program
  .name("beyond-evals-lab")
  .description("Agent assurance PoC");

program
  .command("demo")
  .argument("<scenario>", "Demo scenario to run")
  .action(async (scenario: string) => {
    switch (scenario) {
      case "success": return runDemoA();
      case "trajectory-failure": return runDemoB();
      // ...
    }
  });

program.parse();
```

## Package.json Scripts

```json
{
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "eval": "tsx src/cli/eval.ts",
    "demo:success": "tsx src/cli/demo.ts success",
    "demo:trajectory-failure": "tsx src/cli/demo.ts trajectory-failure",
    "demo:verification-failure": "tsx src/cli/demo.ts verification-failure",
    "demo:validation-failure": "tsx src/cli/demo.ts validation-failure",
    "demo:control-block": "tsx src/cli/demo.ts control-block",
    "demo:feedback-loop": "tsx src/cli/demo.ts feedback-loop",
    "traces:mine": "tsx src/cli/mine.ts",
    "assurance:report": "tsx src/cli/report.ts"
  }
}
```

## Common Pitfalls

### noUncheckedIndexedAccess

With `noUncheckedIndexedAccess: true`, array access and record lookups return
`T | undefined`. Always handle the undefined case:

```typescript
const transaction = state.transactions.find(t => t.id === id);
if (!transaction) return { success: false, error: "not found" };
// transaction is now Transaction (narrowed)
```

### better-sqlite3 and ARM64

`better-sqlite3` requires native compilation. On ARM64 (Apple Silicon, some
Linux), ensure build-essential and python3 are available. The package ships
prebuilds for common platforms.

### ESM import extensions

Forgetting `.js` extensions in relative imports is the #1 runtime failure mode
when using `tsc --noEmit` or running compiled output. Configure the linter
(if using biome or eslint) to enforce extensions.

### Zod + TypeScript strict

Zod's `.parse()` throws `ZodError`. Use `.safeParse()` for control flow:

```typescript
const parsed = Schema.safeParse(input);
if (!parsed.success) {
  return { decision: "block", reason: parsed.error.message };
}
const valid = parsed.data; // correctly typed
```

## Biome (if used instead of ESLint/Prettier)

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "formatter": {
    "indentStyle": "space",
    "lineWidth": 100
  },
  "linter": {
    "rules": {
      "correctness": { "all": true },
      "suspicious": { "all": true }
    }
  }
}
```
