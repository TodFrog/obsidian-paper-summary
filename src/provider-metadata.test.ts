import {
  applyProviderSelectionDefaults,
  applyProviderSelectionToSettings,
  getProviderMetadata,
  getProviderSettingsVisibility,
  normalizeProvider,
} from "./provider-metadata";

describe("provider metadata", () => {
  it("normalizes legacy and unknown provider values", () => {
    expect(normalizeProvider("custom")).toBe("others");
    expect(normalizeProvider("others")).toBe("others");
    expect(normalizeProvider("gemini")).toBe("gemini");
    expect(normalizeProvider("unknown-provider")).toBe("openai");
    expect(normalizeProvider(undefined)).toBe("openai");
  });

  it("returns conservative provider presets", () => {
    expect(getProviderMetadata("gemini")).toMatchObject({
      label: "Gemini",
      defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
      suggestedModel: "gemini-2.5-flash",
    });

    expect(getProviderMetadata("claude")).toMatchObject({
      label: "Claude",
      defaultBaseUrl: "https://api.anthropic.com/v1/",
      suggestedModel: "claude-sonnet-4-20250514",
    });

    expect(getProviderMetadata("ollama")).toMatchObject({
      label: "Ollama",
      defaultBaseUrl: "http://localhost:11434/v1",
      suggestedModel: "llama3.2",
    });

    expect(getProviderMetadata("others")).toMatchObject({
      label: "Others",
      defaultBaseUrl: "",
      suggestedModel: "",
    });
  });

  it("returns settings visibility per provider", () => {
    expect(getProviderSettingsVisibility("openai")).toEqual({
      showApiKey: true,
      showBaseUrl: true,
      showModel: true,
      showStructuredOutputMode: true,
      showOpenRouterSettings: false,
    });

    expect(getProviderSettingsVisibility("openrouter")).toEqual({
      showApiKey: true,
      showBaseUrl: true,
      showModel: true,
      showStructuredOutputMode: true,
      showOpenRouterSettings: true,
    });

    expect(getProviderSettingsVisibility("gemini")).toEqual({
      showApiKey: true,
      showBaseUrl: true,
      showModel: true,
      showStructuredOutputMode: true,
      showOpenRouterSettings: false,
    });

    expect(getProviderSettingsVisibility("claude")).toEqual({
      showApiKey: true,
      showBaseUrl: true,
      showModel: true,
      showStructuredOutputMode: true,
      showOpenRouterSettings: false,
    });

    expect(getProviderSettingsVisibility("ollama")).toEqual({
      showApiKey: false,
      showBaseUrl: true,
      showModel: true,
      showStructuredOutputMode: true,
      showOpenRouterSettings: false,
    });

    expect(getProviderSettingsVisibility("others")).toEqual({
      showApiKey: true,
      showBaseUrl: true,
      showModel: true,
      showStructuredOutputMode: true,
      showOpenRouterSettings: false,
    });
  });

  it("updates auto-filled provider defaults without overwriting user-entered values", () => {
    expect(
      applyProviderSelectionDefaults(
        {
          provider: "openai",
          baseUrl: "",
          model: "gpt-4o-mini",
        },
        "gemini",
      ),
    ).toEqual({
      provider: "gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
      model: "gemini-2.5-flash",
    });

    expect(
      applyProviderSelectionDefaults(
        {
          provider: "openrouter",
          baseUrl: "https://openrouter.ai/api/v1",
          model: "openai/gpt-4o-mini",
        },
        "claude",
      ),
    ).toEqual({
      provider: "claude",
      baseUrl: "https://api.anthropic.com/v1/",
      model: "claude-sonnet-4-20250514",
    });

    expect(
      applyProviderSelectionDefaults(
        {
          provider: "openai",
          baseUrl: "https://custom.example/v1",
          model: "my-model",
        },
        "ollama",
      ),
    ).toEqual({
      provider: "ollama",
      baseUrl: "https://custom.example/v1",
      model: "my-model",
    });
  });

  it("preserves hidden settings data when switching providers", () => {
    expect(
      applyProviderSelectionToSettings(
        {
          provider: "openrouter",
          baseUrl: "https://openrouter.ai/api/v1",
          model: "openai/gpt-4o-mini",
          apiKey: "secret-key",
          openRouterRequireParameters: false,
        },
        "ollama",
      ),
    ).toEqual({
      provider: "ollama",
      baseUrl: "http://localhost:11434/v1",
      model: "llama3.2",
      apiKey: "secret-key",
      openRouterRequireParameters: false,
    });
  });
});
