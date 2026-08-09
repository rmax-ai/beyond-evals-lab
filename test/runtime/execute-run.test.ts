import type { Agent, AgentContext, AgentDecision } from "../../src/agent/agent.js";
import { RuleBasedRefundAgent } from "../../src/agent/rule-agent.js";
import { AuthorizationControl } from "../../src/controls/authorization.js";
import { GuardrailEngine } from "../../src/controls/engine.js";
import { RefundLimitControl } from "../../src/controls/refund-limit.js";
import { SchemaValidationControl } from "../../src/controls/schema-validation.js";
import { createFixtureState } from "../../src/domain/fixtures.js";
import { executeRun } from "../../src/runtime/execute-run.js";

function engine(): GuardrailEngine { return new GuardrailEngine([new AuthorizationControl(), new RefundLimitControl(), new SchemaValidationControl()]); }
const request = { requestId: "request-1", actorId: "user-support-1", message: "Please refund €42." };

describe("executeRun", () => {
  it("runs the complete request-agent-tool loop and mutates state", async () => {
    const run = await executeRun(request, createFixtureState(), new RuleBasedRefundAgent(), engine());
    expect(run.finalState.refunds).toHaveLength(1);
    expect(run.finalState.transactions[0]?.status).toBe("refunded");
    expect(run.finalState.auditRecords).toHaveLength(1);
    expect(run.trace.some((event) => event.type === "agent_response")).toBe(true);
  });

  it("stops once an agent returns done", async () => {
    const agent: Agent = { async decide(_context: AgentContext): Promise<AgentDecision> { return { done: true, message: "done", toolCalls: [] }; } };
    const run = await executeRun(request, createFixtureState(), agent, engine());
    expect(run.trace.filter((event) => event.type === "agent_decision")).toHaveLength(1);
    expect(run.trace.map((event) => event.type)).toEqual(["request", "agent_decision", "agent_response"]);
  });

  it("stops at the maximum iteration count", async () => {
    const agent: Agent = { async decide(_context: AgentContext): Promise<AgentDecision> { return { done: false, toolCalls: [] }; } };
    const run = await executeRun(request, createFixtureState(), agent, engine(), 3);
    expect(run.trace.filter((event) => event.type === "agent_decision")).toHaveLength(3);
  });

  it("records expected request, decision, tool, control, and completion events", async () => {
    const run = await executeRun(request, createFixtureState(), new RuleBasedRefundAgent(), engine());
    const types = run.trace.map((event) => event.type);
    expect(types).toContain("request"); expect(types).toContain("agent_decision");
    expect(types).toContain("tool_proposed"); expect(types).toContain("control_decision");
    expect(types).toContain("tool_completed"); expect(types).toContain("agent_response");
  });
});
