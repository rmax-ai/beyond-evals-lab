/** Direct OpenAI mode is explicit opt-in and must never silently use the scenario mock. */
export function shouldUseScenarioMock(environment: NodeJS.ProcessEnv): boolean {
  return environment.EVE_MOCK === "1" && environment.EVE_DIRECT_OPENAI !== "1";
}
