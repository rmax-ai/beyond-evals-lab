import { defineTool } from "eve/tools";

import { eveSessionStore } from "../../src/eve/index.js";

// `any` is required to avoid Eve v0.27.7's JSON Schema generic introspection issue.
export default defineTool<any, any>({
  description: "Exports the lab AgentRun artifact for the current session (diagnostic/assurance tool).",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async execute(_input, ctx) {
    const runtime = eveSessionStore.getOrCreate(ctx.session.id);
    return { success: true, output: runtime.finish("eve session exported") };
  },
});
