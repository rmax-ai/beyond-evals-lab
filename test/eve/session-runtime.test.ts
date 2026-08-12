import { customerUser, sampleTransaction, supportUser } from "../../src/domain/fixtures.js";
import { EveSessionRuntime } from "../../src/eve/session-runtime.js";
import { EveSessionStore } from "../../src/eve/session-store.js";

describe("EveSessionRuntime", () => {
  it("routes getTransactions through the governed runtime and records the pipeline trace", async () => {
    const runtime = new EveSessionRuntime("eve-read-session", supportUser.id);
    runtime.start("List this customer's transactions.");

    const { result } = await runtime.executeToolCall(
      "getTransactions",
      { customerId: customerUser.id },
      "eve-call-read-1",
    );
    const run = runtime.finish();

    expect(result).toEqual({
      success: true,
      output: run.finalState.transactions.filter((transaction) => transaction.customerId === customerUser.id),
    });
    expect(run.trace.map((event) => event.type)).toEqual([
      "request",
      "tool_proposed",
      "control_decision",
      "tool_started",
      "tool_completed",
    ]);
    expect(run.trace.map((event) => event.sequence)).toEqual([1, 2, 3, 4, 5]);
  });

  it("blocks a customer refund at authorization without changing state", async () => {
    const runtime = new EveSessionRuntime("eve-customer-block", customerUser.id);
    const before = runtime.getState();

    const { result, controlDecision } = await runtime.executeToolCall(
      "createRefund",
      { transactionId: sampleTransaction.id, amountCents: 100 },
      "eve-call-customer-refund",
    );

    expect(result).toMatchObject({ success: false });
    expect(controlDecision).toMatchObject({ control: "authorization", decision: "block" });
    expect(runtime.getState()).toEqual(before);
    expect(runtime.finish().trace.map((event) => event.type)).toEqual([
      "tool_proposed",
      "control_decision",
      "tool_failed",
    ]);
  });

  it("enforces refund, schema, and audit-follow-up controls across a support session", async () => {
    const runtime = new EveSessionRuntime("eve-governed-refund", supportUser.id);

    const overLimit = await runtime.executeToolCall(
      "createRefund",
      { transactionId: sampleTransaction.id, amountCents: supportUser.refundLimitCents + 1 },
      "eve-call-over-limit",
    );
    expect(overLimit.result).toMatchObject({ success: false });
    expect(overLimit.controlDecision).toMatchObject({ control: "refund-limit", decision: "block" });

    const invalidInput = await runtime.executeToolCall(
      "createRefund",
      { transactionId: sampleTransaction.id, amountCents: "invalid" },
      "eve-call-invalid-refund",
    );
    expect(invalidInput.result).toMatchObject({ success: false });
    expect(invalidInput.controlDecision).toMatchObject({ control: "schema-validation", decision: "block" });

    const refund = await runtime.executeToolCall(
      "createRefund",
      { transactionId: sampleTransaction.id, amountCents: sampleTransaction.amountCents },
      "eve-call-create-refund",
    );
    expect(refund.result).toMatchObject({ success: true });

    const blockedFollowUp = await runtime.executeToolCall(
      "getTransaction",
      { transactionId: sampleTransaction.id },
      "eve-call-forbidden-follow-up",
    );
    expect(blockedFollowUp.result).toMatchObject({ success: false });
    expect(blockedFollowUp.controlDecision).toMatchObject({ control: "forbidden-actions", decision: "block" });

    const audit = await runtime.executeToolCall(
      "writeAuditRecord",
      {
        action: "refund_created",
        entityType: "refund",
        entityId: "refund-txn-1",
      },
      "eve-call-audit",
    );
    expect(audit.result).toMatchObject({ success: true });
  });

  it("exports an AgentRun using the session ID and immutable state snapshots", async () => {
    const runtime = new EveSessionRuntime("eve-finish-session", supportUser.id);
    runtime.start("Retrieve the transaction.");
    await runtime.executeToolCall(
      "getTransaction",
      { transactionId: sampleTransaction.id },
      "eve-call-finish-read",
    );

    const run = runtime.finish("The transaction is settled.");

    expect(run.id).toBe("eve-finish-session");
    expect(run.initialState.transactions).toContainEqual(sampleTransaction);
    expect(run.initialState).toEqual(run.finalState);
    expect(run.finalState).toEqual(runtime.getState());
    expect(run.trace.map((event) => event.type)).toEqual([
      "request",
      "tool_proposed",
      "control_decision",
      "tool_started",
      "tool_completed",
      "agent_response",
    ]);
  });
});

describe("EveSessionStore", () => {
  it("returns one runtime per session and deletes it on request", () => {
    const store = new EveSessionStore();
    const first = store.getOrCreate("eve-store-session");
    const second = store.getOrCreate("eve-store-session", customerUser.id);

    expect(second).toBe(first);
    expect(store.delete("eve-store-session")).toBe(true);
    expect(store.get("eve-store-session")).toBeUndefined();
  });
});
