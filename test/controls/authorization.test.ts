import { AuthorizationControl } from "../../src/controls/authorization.js";
import { createFixtureState, customerUser, financeUser, adminUser, supportUser } from "../../src/domain/fixtures.js";
import type { ControlContext } from "../../src/controls/types.js";

function context(actor = supportUser, tool: "createRefund" | "getTransactions" | "writeAuditRecord" = "createRefund"): ControlContext {
  return { actor, request: { requestId: "request-1", actorId: actor.id, message: "test" }, proposedCall: { id: "call-1", tool, arguments: tool === "createRefund" ? { transactionId: "txn-1", amountCents: 100 } : {} }, state: createFixtureState(), previousEvents: [] };
}

describe("AuthorizationControl", () => {
  it("blocks customers from creating refunds", async () => expect((await new AuthorizationControl().evaluate(context(customerUser))).decision).toBe("block"));
  it.each([supportUser, financeUser, adminUser])("allows %s to create refunds", async (actor) => expect((await new AuthorizationControl().evaluate(context(actor))).decision).toBe("allow"));
  it.each([customerUser, supportUser, financeUser, adminUser])("allows %s to get transactions and write audit records", async (actor) => {
    const control = new AuthorizationControl();
    expect((await control.evaluate(context(actor, "getTransactions"))).decision).toBe("allow");
    expect((await control.evaluate(context(actor, "writeAuditRecord"))).decision).toBe("allow");
  });
});
