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
      paperNotesScope: "Custom/Papers",
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
      model: "openai/gpt-4o-mini",
      structuredOutputMode: "json_object",
      openRouterRequireParameters: true,
      openRouterAppTitle: "Paper Summary",
      outputLanguage: "english",
      customOutputLanguage: "",
    });
  });

  it("maps legacy custom settings to others and preserves existing values", () => {
    expect(
      mergeSettings({
        provider: "custom" as never,
        baseUrl: "https://custom.example/v1",
        model: "custom-model",
      }),
    ).toMatchObject({
      provider: "others",
      baseUrl: "https://custom.example/v1",
      model: "custom-model",
    });
  });

  it("fills provider-specific defaults for gemini, claude, and ollama when saved values are missing", () => {
    expect(
      mergeSettings({
        provider: "gemini",
      }),
    ).toMatchObject({
      provider: "gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
      model: "gemini-2.5-flash",
    });

    expect(
      mergeSettings({
        provider: "claude",
      }),
    ).toMatchObject({
      provider: "claude",
      baseUrl: "https://api.anthropic.com/v1/",
      model: "claude-sonnet-4-20250514",
    });

    expect(
      mergeSettings({
        provider: "ollama",
      }),
    ).toMatchObject({
      provider: "ollama",
      baseUrl: "http://localhost:11434/v1",
      model: "llama3.2",
    });
  });

  it("adds output language defaults for upgraded users without saved language settings", () => {
    expect(
      mergeSettings({
        paperTag: "paper",
      }),
    ).toMatchObject({
      outputLanguage: "english",
      customOutputLanguage: "",
    });
  });

  it("adds template defaults for upgraded users without saved template settings", () => {
    expect(
      mergeSettings({
        paperTag: "paper",
      }),
    ).toMatchObject({
      templateMode: "built_in",
      customTemplatePath: "",
    });
  });

  it("defaults the paper-notes scope to the output folder for upgraded users", () => {
    expect(
      mergeSettings({
        outputFolder: "Custom/Papers",
      }),
    ).toMatchObject({
      outputFolder: "Custom/Papers",
      paperNotesScope: "Custom/Papers",
    });
  });
});
