import { createFixtureState, supportUser } from "../../src/domain/fixtures.js";
import { cloneState } from "../../src/domain/world-state.js";
import { WriteAuditRecordTool } from "../../src/tools/write-audit-record.js";

describe("WriteAuditRecordTool", () => {
  it("creates an audit record with the requested fields", async () => {
    const result = await new WriteAuditRecordTool().execute(
      { action: "refund_created", entityType: "refund", entityId: "refund-1" },
      { state: createFixtureState(), actor: supportUser, requestId: "request-1" },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toMatchObject({
        action: "refund_created",
        entityType: "refund",
        entityId: "refund-1",
        metadata: {},
      });
      expect(result.output.id).toMatch(/^audit-/);
      expect(result.output.createdAt).toEqual(expect.any(String));
    }
  });

  it("sets actorId from the execution context", async () => {
    const result = await new WriteAuditRecordTool().execute(
      { action: "refund_created", entityType: "refund", entityId: "refund-1" },
      { state: createFixtureState(), actor: supportUser, requestId: "request-1" },
    );

    expect(result.success).toBe(true);
    if (result.success) expect(result.output.actorId).toBe(supportUser.id);
  });

  it("includes supplied metadata", async () => {
    const metadata = { requestId: "request-1", reason: "duplicate charge" };
    const result = await new WriteAuditRecordTool().execute(
      { action: "refund_created", entityType: "refund", entityId: "refund-1", metadata },
      { state: createFixtureState(), actor: supportUser, requestId: "request-1" },
    );

    expect(result.success).toBe(true);
    if (result.success) expect(result.output.metadata).toEqual(metadata);
  });

  it("does not mutate its state input", async () => {
    const state = createFixtureState();
    const before = cloneState(state);

    await new WriteAuditRecordTool().execute(
      { action: "refund_created", entityType: "refund", entityId: "refund-1" },
      { state, actor: supportUser, requestId: "request-1" },
    );

    expect(state).toEqual(before);
  });
});
