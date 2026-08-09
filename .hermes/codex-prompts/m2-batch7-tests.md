# Milestone 2, Batch 7: Agent + Controls + Runtime Tests

You are working in a TypeScript project at /home/rmax-10/src/beyond-evals-lab.

Read ALL existing source files in src/domain/, src/tools/, src/agent/, src/controls/, src/runtime/ before writing tests. Also read existing test files to match conventions.

## Task

Write comprehensive Vitest tests:

### test/agent/rule-agent.test.ts
- Normal mode: recognizes "duplicate €42" → proposes getTransactions, createRefund, writeAuditRecord
- Normal mode: recognizes "most recent" → proposes getTransactions
- Normal mode: sets done=true after completing refund
- Reckless mode: first proposes €5,000 refund then corrects
- Skip-audit mode: proposes refund without writeAuditRecord
- Refund-without-confirming mode: refunds without duplicate check
- Includes rationale in ProposedToolCall

### test/controls/authorization.test.ts
- Customer attempting createRefund → BLOCK
- Support attempting createRefund → ALLOW
- Finance attempting createRefund → ALLOW
- Admin attempting createRefund → ALLOW
- Any role calling getTransactions → ALLOW
- Any role calling writeAuditRecord → ALLOW

### test/controls/refund-limit.test.ts
- Support requesting €50 refund (limit €100) → ALLOW
- Support requesting €5,000 refund (limit €100) → BLOCK
- Finance requesting €500 refund (limit €5,000) → ALLOW
- Includes limit and requested amount in evidence

### test/controls/schema-validation.test.ts
- Valid createRefund input → ALLOW
- Missing required field → BLOCK
- Negative amount → BLOCK
- Non-numeric amount → BLOCK

### test/controls/engine.test.ts
- All controls pass → ALLOW
- First control blocks → BLOCK (short-circuit)
- Second control blocks, first passes → BLOCK

### test/runtime/execute-tool.test.ts
- Execute getTransactions → result returned, no state mutation
- Execute createRefund → result returned, state mutated
- Execute createRefund blocked by authorization → state unchanged, block decision returned
- Trace events appended for each step
- Tool input schema validation catches bad input

### test/runtime/execute-run.test.ts
- Full agent loop: request → agent decides → tools execute → done
- Agent loop stops on done=true
- Agent loop stops at maxIterations
- Trace contains expected events
- State is correctly mutated through the run

## Conventions
- Use createFixtureState() for test data
- Import with `.js` extensions
- Tests must be deterministic
- Each test creates fresh state
- Use describe/it/expect (vitest globals)

## Verification
`pnpm test` must pass all tests.
`npx tsc --noEmit` must pass.
