# Milestone 1, Batch 2: Tool Implementations

You are working in a TypeScript project at /home/rmax-10/src/beyond-evals-lab.

Read SPEC.md (sections 6-7), AGENTS.md, docs/TS_DEVELOPMENT.md, and the existing files in src/domain/ and src/tools/contracts.ts before writing code.

## Context

Batch 1 already created:
- src/domain/types.ts — all core types
- src/domain/world-state.ts — immutable state utilities
- src/domain/fixtures.ts — test fixtures
- src/domain/invariants.ts — state consistency checks
- src/tools/contracts.ts — Tool interface, ToolName, ToolDefinition, etc.

Read these files before implementing tools.

## Task

Implement 5 tool files + a registry:

### 1. src/tools/get-transactions.ts
```typescript
import type { Tool, ToolResult } from "./contracts.js";
import type { Transaction, WorldState } from "../domain/types.js";

export interface GetTransactionsInput {
  customerId?: string;
}

export class GetTransactionsTool implements Tool<GetTransactionsInput, Transaction[]> {
  name = "getTransactions" as const;
  inputSchema = z.object({
    customerId: z.string().optional(),
  });

  async execute(
    input: GetTransactionsInput,
    context: ToolExecutionContext
  ): Promise<ToolResult<Transaction[]>> {
    // Return all transactions, optionally filtered by customerId
    // This tool does NOT mutate state — it only reads
  }
}
```

The tool returns all transactions from context.state. If customerId is provided, filter to that customer's transactions.

### 2. src/tools/get-transaction.ts
```typescript
export interface GetTransactionInput {
  transactionId: string;
}

export class GetTransactionTool implements Tool<GetTransactionInput, Transaction> {
  // Returns a single transaction by ID
  // Returns success:false if not found
}
```

### 3. src/tools/create-refund.ts
```typescript
export interface CreateRefundInput {
  transactionId: string;
  amountCents: number;
}

export class CreateRefundTool implements Tool<CreateRefundInput, Refund> {
  // Validates: transaction exists, amount > 0, transaction status allows refund
  // Creates a new Refund object with id = "refund-<timestamp>-<random>"
  // Does NOT mutate state — just returns the Refund to be applied by runtime
  // Uses context.actor.id as initiatedBy
  // Returns success:false with descriptive error if validation fails
}
```

### 4. src/tools/get-refund.ts
```typescript
export interface GetRefundInput {
  refundId: string;
}

export class GetRefundTool implements Tool<GetRefundInput, Refund> {
  // Returns a single refund by ID
  // Read-only, no state mutation
}
```

### 5. src/tools/write-audit-record.ts
```typescript
export interface WriteAuditRecordInput {
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export class WriteAuditRecordTool implements Tool<WriteAuditRecordInput, AuditRecord> {
  // Creates an audit record with id = "audit-<timestamp>-<random>"
  // Uses context.actor.id as actorId
  // Does NOT mutate state — returns the AuditRecord to be applied by runtime
}
```

### 6. src/tools/registry.ts
```typescript
import type { Tool, ToolDefinition, ToolName } from "./contracts.js";

// Register all tools with their definitions
export function createToolRegistry(): Map<ToolName, Tool<unknown, unknown>>;

// Get tool definitions (for AgentContext)
export function getToolDefinitions(): ToolDefinition[];
```

Import and instantiate all 5 tools. The registry is how the runtime and agent discover available tools.

## Key Rules

- Tools do NOT mutate WorldState. They validate, compute, and return results.
- State mutation happens in the runtime via domain/world-state.ts functions.
- All tools return `ToolResult<T>` — never throw exceptions.
- Use `zod` for input validation at the start of each execute() method.
- Read existing domain files to understand types before implementing.
- Import with `.js` extensions for ESM compatibility.

## Verification

After writing all files:
1. `npx tsc --noEmit` must pass
2. No lint errors
3. Do NOT run tests (test files don't exist yet)
