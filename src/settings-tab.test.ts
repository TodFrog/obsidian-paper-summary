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

  it("renders the heading with Obsidian's setting heading API and sentence-case copy", () => {
    const plugin = {
      settings: {
        ...DEFAULT_SETTINGS,
      },
      saveSettings: vi.fn(() => Promise.resolve()),
    };

    const tab = new PaperSummarySettingTab({} as never, plugin as never);
    tab.display();

    expect(getCreatedSettings()[0]).toMatchObject({
      name: "Paper summary",
      heading: true,
    });
    expect(findSetting("Provider").desc).toContain("others currently use the shared OpenAI-compatible request path.");
    expect(findSetting("Custom output language").desc).toContain("Used only when output language is set to custom.");
    expect(findSetting("Custom template file").desc).toContain("Used only when output template is set to custom.");
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
