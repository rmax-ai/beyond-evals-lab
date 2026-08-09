import { createToolRegistry, getToolDefinitions } from "../../src/tools/registry.js";

describe("tool registry", () => {
  it("contains all five tool implementations", () => {
    const registry = createToolRegistry();

    expect(registry).toHaveLength(5);
    expect([...registry.keys()]).toEqual([
      "getTransactions",
      "getTransaction",
      "createRefund",
      "getRefund",
      "writeAuditRecord",
    ]);
  });

  it("registers implementations with their correct names", () => {
    const registry = createToolRegistry();

    expect(registry.get("getTransactions")?.name).toBe("getTransactions");
    expect(registry.get("getTransaction")?.name).toBe("getTransaction");
    expect(registry.get("createRefund")?.name).toBe("createRefund");
    expect(registry.get("getRefund")?.name).toBe("getRefund");
    expect(registry.get("writeAuditRecord")?.name).toBe("writeAuditRecord");
  });

  it("provides a description for every tool definition", () => {
    const definitions = getToolDefinitions();

    expect(definitions).toHaveLength(5);
    expect(definitions.every((definition) => definition.description.length > 0)).toBe(true);
  });
});
