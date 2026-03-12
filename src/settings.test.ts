import { DEFAULT_SETTINGS, mergeSettings } from "./settings";

describe("settings", () => {
  it("fills missing values from defaults", () => {
    expect(
      mergeSettings({
        outputFolder: "Custom/Papers",
        relatedNotesLimit: 3,
      }),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      outputFolder: "Custom/Papers",
      relatedNotesLimit: 3,
    });
  });

  it("returns defaults when there is no saved data", () => {
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("merges provider defaults for OpenRouter structured output mode", () => {
    expect(
      mergeSettings({
        provider: "openrouter",
      }),
    ).toMatchObject({
      ...DEFAULT_SETTINGS,
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      structuredOutputMode: "json_object",
      openRouterRequireParameters: true,
      openRouterAppTitle: "Paper Summary",
    });
  });
});
