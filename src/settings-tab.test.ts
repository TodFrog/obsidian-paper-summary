import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaperSummarySettingTab } from "./settings-tab";
import { DEFAULT_SETTINGS } from "./settings";
import {
  getCreatedSettings,
  resetCreatedSettings,
  type Setting as MockSetting,
} from "./test/obsidian-test-double";

function findSetting(name: string): MockSetting {
  const setting = getCreatedSettings().find((entry) => entry.name === name);
  if (!setting) {
    throw new Error(`Missing setting: ${name}`);
  }
  return setting;
}

describe("paper summary settings tab", () => {
  beforeEach(() => {
    resetCreatedSettings();
  });

  it("renders sentence-case copy without rejected headings", () => {
    const plugin = {
      settings: {
        ...DEFAULT_SETTINGS,
      },
      saveSettings: vi.fn(() => Promise.resolve()),
    };

    const tab = new PaperSummarySettingTab({} as never, plugin as never);
    tab.display();

    expect(getCreatedSettings().some((entry) => entry.name === "General")).toBe(false);
    expect(findSetting("Provider").desc).toContain("Choose the provider used for paper analysis.");
    expect(findSetting("API key").desc).toBe("API key for remote summarization requests.");
    expect(Object.fromEntries(findSetting("Provider").dropdown?.options ?? [])).toEqual({
      openai: "Openai",
      openrouter: "Openrouter",
      gemini: "Gemini",
      claude: "Claude",
      ollama: "Ollama",
      others: "Other",
    });
    expect(findSetting("API key").text?.placeholder).toBe("Paste API key");
    expect(findSetting("Structured output mode").desc).toContain("some routed providers may ignore or reject it.");
    expect(findSetting("Output language").desc).toContain("instead of the app language");
    expect(findSetting("Custom output language").desc).toContain("Automatic mode uses the paper's dominant language");
    expect(findSetting("Output folder").text?.placeholder).toBe("Example: papers/summaries");
    expect(getCreatedSettings().some((entry) => (entry.name ?? "").toLowerCase().includes("settings"))).toBe(false);
  });

  it("groups OpenRouter-only settings under a section heading with generic labels", () => {
    const plugin = {
      settings: {
        ...DEFAULT_SETTINGS,
        provider: "openrouter" as const,
      },
      saveSettings: vi.fn(() => Promise.resolve()),
    };

    const tab = new PaperSummarySettingTab({} as never, plugin as never);
    tab.display();

    expect(findSetting("Routing")).toMatchObject({
      heading: true,
    });
    expect(findSetting("Require parameters").desc).toContain("Prefer providers that honor structured-output parameters.");
    expect(findSetting("App referer").desc).toBe("Optional HTTP referer header used for attribution.");
    expect(findSetting("App title").desc).toBe("Optional X-Title header used for attribution.");
    expect(findSetting("Provider order").text?.placeholder).toBe("Example: openai, anthropic");
    expect(findSetting("Allow fallbacks").desc).toBe(
      "Allow a fallback to another provider when the preferred one is unavailable.",
    );
  });

  it("normalizes provider selection updates through the dropdown", async () => {
    const plugin = {
      settings: {
        ...DEFAULT_SETTINGS,
        provider: "openai" as const,
        baseUrl: "",
        model: "gpt-4o-mini",
        apiKey: "secret",
      },
      saveSettings: vi.fn(() => Promise.resolve()),
    };

    const tab = new PaperSummarySettingTab({} as never, plugin as never);
    tab.display();

    await findSetting("Provider").dropdown?.trigger(" CUSTOM ");

    expect(plugin.settings.provider).toBe("others");
    expect(plugin.settings.apiKey).toBe("secret");
    expect(plugin.saveSettings).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid dropdown values for enum-like settings", async () => {
    const plugin = {
      settings: {
        ...DEFAULT_SETTINGS,
        structuredOutputMode: "json_schema" as const,
        outputLanguage: "korean" as const,
        templateMode: "custom" as const,
      },
      saveSettings: vi.fn(() => Promise.resolve()),
    };

    const tab = new PaperSummarySettingTab({} as never, plugin as never);
    tab.display();

    await findSetting("Structured output mode").dropdown?.trigger("yaml");
    await findSetting("Output language").dropdown?.trigger("japanese");
    await findSetting("Output template").dropdown?.trigger("external");

    expect(plugin.settings.structuredOutputMode).toBe("json_schema");
    expect(plugin.settings.outputLanguage).toBe("korean");
    expect(plugin.settings.templateMode).toBe("custom");
  });
});
