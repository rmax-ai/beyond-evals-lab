import { RefundLimitControl } from "../../src/controls/refund-limit.js";
import { createFixtureState, financeUser, supportUser } from "../../src/domain/fixtures.js";
import type { ControlContext } from "../../src/controls/types.js";

function context(actor: typeof supportUser, amountCents: number): ControlContext {
  return { actor, request: { requestId: "request-1", actorId: actor.id, message: "test" }, proposedCall: { id: "call-1", tool: "createRefund", arguments: { transactionId: "txn-1", amountCents } }, state: createFixtureState(), previousEvents: [] };
}

describe("RefundLimitControl", () => {
  it("allows a support refund within its limit", async () => {
    const actor = { ...supportUser, refundLimitCents: 10_000 };
    expect((await new RefundLimitControl().evaluate(context(actor, 5_000))).decision).toBe("allow");
  });
  it("blocks a support refund over its limit and reports both amounts", async () => {
    const actor = { ...supportUser, refundLimitCents: 10_000 };
    const decision = await new RefundLimitControl().evaluate(context(actor, 500_000));
    expect(decision).toMatchObject({ decision: "block", evidence: { requestedAmountCents: 500_000, refundLimitCents: 10_000 } });
  });
  it("allows a finance refund within its limit", async () => {
    const actor = { ...financeUser, refundLimitCents: 500_000 };
    expect((await new RefundLimitControl().evaluate(context(actor, 50_000))).decision).toBe("allow");
  });
});
