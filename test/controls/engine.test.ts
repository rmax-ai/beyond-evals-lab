import { GuardrailEngine } from "../../src/controls/engine.js";
import { createFixtureState, supportUser } from "../../src/domain/fixtures.js";
import type { Control, ControlContext } from "../../src/controls/types.js";

const context: ControlContext = { actor: supportUser, request: { requestId: "request-1", actorId: supportUser.id, message: "test" }, proposedCall: { id: "call-1", tool: "getTransactions", arguments: {} }, state: createFixtureState(), previousEvents: [] };
function control(name: string, decision: "allow" | "block", calls: string[]): Control { return { name, async evaluate() { calls.push(name); return { control: name, decision, reason: name }; } }; }
describe("GuardrailEngine", () => {
  it("allows when all controls pass", async () => { const calls: string[] = []; expect((await new GuardrailEngine([control("one", "allow", calls), control("two", "allow", calls)]).evaluate(context)).decision).toBe("allow"); expect(calls).toEqual(["one", "two"]); });
  it("short-circuits when the first control blocks", async () => { const calls: string[] = []; expect((await new GuardrailEngine([control("one", "block", calls), control("two", "allow", calls)]).evaluate(context)).control).toBe("one"); expect(calls).toEqual(["one"]); });
  it("returns the second block after the first passes", async () => { const calls: string[] = []; expect((await new GuardrailEngine([control("one", "allow", calls), control("two", "block", calls)]).evaluate(context)).control).toBe("two"); expect(calls).toEqual(["one", "two"]); });
});
