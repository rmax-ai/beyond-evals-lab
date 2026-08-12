import { defineAgent } from "eve";
import type { AgentDefinition } from "eve";

import { createScenarioMockModel } from "../src/eve/mock-model.js";

const useMockModel = process.env.EVE_MOCK === "1";

const agentConfig: AgentDefinition = defineAgent({
  model: useMockModel
    ? createScenarioMockModel()
    : (process.env.EVE_MODEL ?? "openai/gpt-5.4-mini"),
  // The mock model has no AI Gateway metadata; a verbatim window skips the
  // gateway lookup during compaction compilation.
  ...(useMockModel ? { modelContextWindowTokens: 128_000 } : {}),
});

export default agentConfig;
