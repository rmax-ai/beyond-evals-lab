import { AuthorizationControl } from "../../src/controls/authorization.js";
import { GuardrailEngine } from "../../src/controls/engine.js";
import { SchemaValidationControl } from "../../src/controls/schema-validation.js";
import { createFixtureState, customerUser, supportUser } from "../../src/domain/fixtures.js";
import { cloneState } from "../../src/domain/world-state.js";
import { executeTool } from "../../src/runtime/execute-tool.js";
import type { TraceEvent } from "../../src/domain/types.js";

function harness(actor = supportUser, controls = [new AuthorizationControl(), new SchemaValidationControl()]) {
  const state = createFixtureState();
  const events: Pick<TraceEvent, "type" | "data">[] = [];
  return {
    state,
    events,
    context: { state, actor, requestId: "request-1", guardrailEngine: new GuardrailEngine(controls), controlEvents: [] },
    appendEvent: (type: TraceEvent["type"], data: Record<string, unknown>): void => { events.push({ type, data }); },
  };
}

describe("executeTool", () => {
  it("returns getTransactions without mutating state", async () => {
    const test = harness(); const before = cloneState(test.state);
    const execution = await executeTool("getTransactions", {}, test.context, test.appendEvent);
    expect(execution.result).toMatchObject({ success: true, output: test.state.transactions });
    expect(execution.newState).toBeUndefined(); expect(test.state).toEqual(before);
  });

  it("returns a createRefund result and an immutable mutated state", async () => {
    const test = harness();
    const execution = await executeTool("createRefund", { transactionId: "txn-1", amountCents: 4_200 }, test.context, test.appendEvent);
    expect(execution.result.success).toBe(true);
    expect(execution.newState?.refunds).toHaveLength(1);
    expect(execution.newState?.transactions[0]?.status).toBe("refunded");
    expect(test.state.refunds).toHaveLength(0);
  });

  it("returns the authorization block without changing state", async () => {
    const test = harness(customerUser); const before = cloneState(test.state);
    const execution = await executeTool("createRefund", { transactionId: "txn-1", amountCents: 100 }, test.context, test.appendEvent);
    expect(execution.controlDecision).toMatchObject({ control: "authorization", decision: "block" });
    expect(execution.newState).toBeUndefined(); expect(test.state).toEqual(before);
  });

  it("appends proposal, control, start, and completion trace events", async () => {
    const test = harness();
    await executeTool("getTransactions", {}, test.context, test.appendEvent);
    expect(test.events.map((event) => event.type)).toEqual(["tool_proposed", "control_decision", "tool_started", "tool_completed"]);
  });

  it("returns a schema block for bad tool input", async () => {
    const test = harness();
    const execution = await executeTool("createRefund", { transactionId: "txn-1", amountCents: "bad" }, test.context, test.appendEvent);
    expect(execution.controlDecision).toMatchObject({ control: "schema-validation", decision: "block" });
    expect(execution.result).toMatchObject({ success: false });
    expect(test.events.at(-1)?.type).toBe("tool_failed");
  });
});
