import { defineAgent } from "eve";
import type { AgentDefinition } from "eve";

import { createScenarioMockModel } from "../src/eve/mock-model.js";

const agentConfig: AgentDefinition = defineAgent({
  model: process.env.EVE_MOCK === "1"
    ? createScenarioMockModel()
    : (process.env.EVE_MODEL ?? "openai/gpt-5.4-mini"),
});

export default agentConfig;
