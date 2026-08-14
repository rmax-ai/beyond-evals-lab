import { describe, expect, it } from "vitest";

import { createEveServerEnvironment } from "../../src/cli/eve.js";
import { shouldUseScenarioMock } from "../../src/eve/model-selection.js";

describe("shouldUseScenarioMock", () => {
  it("uses the scenario mock only for the explicit keyless path", () => {
    expect(shouldUseScenarioMock({ EVE_MOCK: "1" })).toBe(true);
    expect(shouldUseScenarioMock({})).toBe(false);
  });

  it("gives direct OpenAI mode precedence over a inherited mock setting", () => {
    expect(shouldUseScenarioMock({ EVE_MOCK: "1", EVE_DIRECT_OPENAI: "1" })).toBe(false);
    expect(shouldUseScenarioMock({ EVE_DIRECT_OPENAI: "1" })).toBe(false);
  });

  it("removes an inherited mock setting from the direct Eve server environment", () => {
    expect(createEveServerEnvironment({ EVE_MOCK: "1", EVE_DIRECT_OPENAI: "1" })).toEqual({
      EVE_DIRECT_OPENAI: "1",
    });
    expect(createEveServerEnvironment({})).toEqual({ EVE_MOCK: "1" });
  });
});
