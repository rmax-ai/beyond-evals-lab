import { defineAgent } from "eve";
import type { AgentDefinition } from "eve";
import { openai } from "@ai-sdk/openai";

import { createScenarioMockModel } from "../src/eve/mock-model.js";
import { shouldUseScenarioMock } from "../src/eve/model-selection.js";

const useDirectOpenAI = process.env.EVE_DIRECT_OPENAI === "1";
const useMockModel = shouldUseScenarioMock(process.env);
const gatewayModel = process.env.EVE_MODEL ?? "openai/gpt-5.4-mini";
const directOpenAIModel = "gpt-5.6-luna";

// Live runs default to a Vercel AI Gateway model id, which requires
// AI_GATEWAY_API_KEY or `eve link` (OIDC). EVE_DIRECT_OPENAI=1 instead wires a
// real OpenAI SDK model instance, bypassing the gateway entirely — useful for
// live runs where only a provider key (OPENAI_API_KEY) is available.
const liveModel = useDirectOpenAI ? openai(directOpenAIModel) : gatewayModel;

const agentConfig: AgentDefinition = defineAgent({
  model: useMockModel ? createScenarioMockModel() : liveModel,
  // Mock and direct-SDK model instances have no AI Gateway metadata; a
  // verbatim window skips the gateway lookup during compaction compilation.
  ...(useMockModel || useDirectOpenAI ? { modelContextWindowTokens: 128_000 } : {}),
});

export default agentConfig;
