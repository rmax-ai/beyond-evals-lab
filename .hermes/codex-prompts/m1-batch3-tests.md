# Milestone 1, Batch 3: Domain + Tool Tests

You are working in a TypeScript project at /home/rmax-10/src/beyond-evals-lab.

Read SPEC.md (sections 6-8, 20, 24), AGENTS.md, docs/TS_DEVELOPMENT.md, and ALL existing source files in src/domain/ and src/tools/ before writing any tests.

## Context

Batch 1 created the domain model. Batch 2 created the tool implementations. You MUST read the actual source files — do not assume their contents.

## Task

Write comprehensive Vitest tests. Test files mirror the src/ structure.

### test/domain/world-state.test.ts

Test the immutable state utilities:
- `createEmptyState()` returns a valid WorldState with empty arrays
- `cloneState()` produces a deep copy (modifying clone doesn't affect original)
- `applyRefund()` adds the refund and updates the transaction status to "refunded"
- `applyRefund()` does not mutate the original state (immutability check)
- `applyAuditRecord()` adds the record to the state
- Chaining: applyRefund then applyAuditRecord produces correct state

### test/domain/invariants.test.ts

Test state consistency checks:
- `allRefundsHaveTransactions`: passes when refunds match, fails when orphan refund exists
- `noUnrelatedStateChange`: passes when only the target transaction changed, fails when an unrelated transaction changed
- `exactlyOneRefundForTransaction`: passes for exactly one, fails for zero or multiple
- `refundAmountMatches`: passes for exact match, fails for wrong amount

### test/tools/get-transactions.test.ts

- Returns all transactions when no filter
- Returns filtered transactions by customerId
- Returns empty array when no transactions
- Does not mutate state

### test/tools/get-transaction.test.ts

- Returns transaction by ID
- Returns failure for non-existent ID

### test/tools/create-refund.test.ts

- Creates a valid refund for an existing settled transaction
- Returns failure for non-existent transaction
- Returns failure for zero amount
- Returns failure for already-refunded transaction
- Sets initiatedBy correctly from context.actor.id
- Does not mutate the state passed in

### test/tools/get-refund.test.ts

- Returns refund by ID
- Returns failure for non-existent ID

### test/tools/write-audit-record.test.ts

- Creates audit record with correct fields
- Sets actorId from context.actor
- Includes metadata when provided
- Does not mutate state

### test/tools/registry.test.ts

- Registry contains all 5 tools
- Each tool has correct name
- Tool definitions include descriptions

## Conventions

- Use `describe` + `it` blocks
- Use `expect` assertions (vitest globals are configured)
- Import from src files with `.js` extensions
- Use `createFixtureState()` from domain/fixtures for test data
- Tests must be deterministic — no randomness, no timers
- Each test should be independent (create fresh state per test)

## Tools that require special handling

- `create-refund.ts` needs a valid Transaction in state — use `createFixtureState()` which provides settled transactions
- `write-audit-record.ts` can be tested with any valid state
- Read-only tools (get-transactions, get-transaction, get-refund) should verify they don't mutate state by comparing before/after

## Verification

After writing all test files:
1. `pnpm test` must pass all tests
2. `npx tsc --noEmit` must pass
