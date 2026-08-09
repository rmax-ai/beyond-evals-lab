import { SchemaValidationControl } from "../../src/controls/schema-validation.js";
import { createFixtureState, supportUser } from "../../src/domain/fixtures.js";
import type { ControlContext } from "../../src/controls/types.js";

function context(arguments_: unknown): ControlContext {
  return { actor: supportUser, request: { requestId: "request-1", actorId: supportUser.id, message: "test" }, proposedCall: { id: "call-1", tool: "createRefund", arguments: arguments_ }, state: createFixtureState(), previousEvents: [] };
}
describe("SchemaValidationControl", () => {
  it("allows valid createRefund input", async () => expect((await new SchemaValidationControl().evaluate(context({ transactionId: "txn-1", amountCents: 100 }))).decision).toBe("allow"));
  it.each([{ amountCents: 100 }, { transactionId: "txn-1", amountCents: -1 }, { transactionId: "txn-1", amountCents: "100" }])("blocks invalid createRefund input", async (arguments_) => expect((await new SchemaValidationControl().evaluate(context(arguments_))).decision).toBe("block"));
});
