# Milestone 1, Batch 1: Domain Model + Tool Contracts

You are working in a TypeScript project at /home/rmax-10/src/beyond-evals-lab.

Read SPEC.md, AGENTS.md, and docs/TS_DEVELOPMENT.md for conventions before writing any code.

## Task

Implement the domain model and tool contracts. Create the following files:

### 1. src/domain/types.ts
All core domain types. These are the foundation of the entire project.

```typescript
export type UserRole = "customer" | "support" | "finance" | "admin";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  refundLimitCents: number;
}

export interface Transaction {
  id: string;
  customerId: string;
  amountCents: number;
  currency: "EUR";
  createdAt: string;
  merchantReference: string;
  fingerprint: string;
  status: "settled" | "refunded" | "partially_refunded";
}

export interface Refund {
  id: string;
  transactionId: string;
  amountCents: number;
  initiatedBy: string;
  createdAt: string;
}

export interface AuditRecord {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface WorldState {
  users: User[];
  transactions: Transaction[];
  refunds: Refund[];
  auditRecords: AuditRecord[];
}
```

Also add these types used across the system:

```typescript
export interface AgentRequest {
  requestId: string;
  actorId: string;
  message: string;
}

export interface ProposedToolCall {
  id: string;
  tool: ToolName;
  arguments: unknown;
  rationale?: string;
}

export interface AgentDecision {
  message?: string;
  toolCalls: ProposedToolCall[];
  done: boolean;
}

export interface ToolObservation {
  toolCallId: string;
  toolName: string;
  result: unknown;
  timestamp: string;
}

export interface AgentContext {
  request: AgentRequest;
  visibleToolDefinitions: ToolDefinition[];
  observations: ToolObservation[];
}
```

### 2. src/domain/world-state.ts
Utility functions for immutable WorldState operations:

```typescript
// Create an empty world state
export function createEmptyState(): WorldState;

// Create an immutable clone of the state
export function cloneState(state: WorldState): WorldState;

// Apply a refund to the state (returns NEW state, does not mutate)
export function applyRefund(state: WorldState, refund: Refund): WorldState;

// Apply an audit record to the state
export function applyAuditRecord(state: WorldState, record: AuditRecord): WorldState;
```

These are the ONLY functions that produce new WorldState snapshots. Tools call these; they do not directly construct WorldState objects.

### 3. src/domain/fixtures.ts
Sample data for tests and demos. Create at minimum:

```typescript
export const supportUser: User;     // role: support, refundLimitCents: 10000
export const financeUser: User;     // role: finance, refundLimitCents: 500000
export const adminUser: User;       // role: admin, refundLimitCents: 2000000
export const customerUser: User;    // role: customer, refundLimitCents: 0

// A settled transaction for 4200 cents (€42.00)
export const sampleTransaction: Transaction;

// A complete fixture state with users + 3 transactions
export function createFixtureState(): WorldState;
```

### 4. src/domain/invariants.ts
State consistency checks used by verification:

```typescript
// Check that every refund references an existing transaction
export function allRefundsHaveTransactions(state: WorldState): boolean;

// Check that no transaction was modified except through refund
export function noUnrelatedStateChange(before: WorldState, after: WorldState, expectedRefundId: string): boolean;

// Check that exactly one refund exists for a given transaction
export function exactlyOneRefundForTransaction(state: WorldState, transactionId: string): boolean;

// Check that refund amount matches expected
export function refundAmountMatches(state: WorldState, refundId: string, expectedAmountCents: number): boolean;
```

### 5. src/tools/contracts.ts
Tool interfaces and types:

```typescript
export type ToolName = "getTransactions" | "getTransaction" | "createRefund" | "getRefund" | "writeAuditRecord";

export interface ToolDefinition {
  name: ToolName;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type ToolResult<O> =
  | { success: true; output: O }
  | { success: false; error: string };

export interface ToolExecutionContext {
  state: WorldState;
  actor: User;
  requestId: string;
}

export interface Tool<I, O> {
  name: ToolName;
  inputSchema: z.ZodType<I>;
  execute(input: I, context: ToolExecutionContext): Promise<ToolResult<O>>;
}
```

Use zod for the inputSchema. Import `z` from "zod".

## Conventions (from AGENTS.md)
- Use `interface` for public APIs (not `type`)
- No `any` without a comment
- Import with `.js` extensions for ESM
- Files: kebab-case
- Interfaces: PascalCase

## Verification
After writing all files, verify:
1. `npx tsc --noEmit` passes (types check)
2. No lint errors

Do NOT run vitest (no test files exist yet). Do NOT modify package.json, tsconfig.json, or any config files.
