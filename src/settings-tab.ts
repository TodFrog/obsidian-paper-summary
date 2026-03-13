import { App, PluginSettingTab, Setting } from "obsidian";
import type PaperSummaryPlugin from "./main";
import { OPENROUTER_BASE_URL } from "./settings";

export class PaperSummarySettingTab extends PluginSettingTab {
  plugin: PaperSummaryPlugin;

  constructor(app: App, plugin: PaperSummaryPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("paper-summary-settings");

    containerEl.createEl("h2", { text: "Paper Summary" });

    new Setting(containerEl)
      .setName("Provider")
      .setDesc("Choose the remote API shape for paper analysis.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("openai", "OpenAI")
          .addOption("openrouter", "OpenRouter")
          .addOption("custom", "Custom")
          .setValue(this.plugin.settings.provider)
          .onChange(async (value) => {
            this.plugin.settings.provider = value as typeof this.plugin.settings.provider;

            if (value === "openrouter" && !this.plugin.settings.baseUrl.trim()) {
              this.plugin.settings.baseUrl = OPENROUTER_BASE_URL;
            }

            await this.plugin.saveSettings();
            this.display();
          }),
      );

    new Setting(containerEl)
      .setName("API key")
      .setDesc("Remote LLM API key used for summarization.")
      .addText((text) =>
        text
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Base URL")
      .setDesc("Optional API-compatible base URL. Leave blank for the default provider endpoint.")
      .addText((text) =>
        text
          .setPlaceholder("https://api.openai.com/v1")
          .setValue(this.plugin.settings.baseUrl)
          .onChange(async (value) => {
            this.plugin.settings.baseUrl = value.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Model")
      .setDesc("Remote model identifier used for all paper analysis.")
      .addText((text) =>
        text
          .setPlaceholder("gpt-4o-mini")
          .setValue(this.plugin.settings.model)
          .onChange(async (value) => {
            this.plugin.settings.model = value.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Structured output mode")
      .setDesc("JSON object is the compatibility default. JSON schema is stricter, but some OpenRouter models or routed providers ignore or reject it.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("json_object", "JSON object")
          .addOption("json_schema", "JSON schema")
          .setValue(this.plugin.settings.structuredOutputMode)
          .onChange(async (value) => {
            this.plugin.settings.structuredOutputMode = value as typeof this.plugin.settings.structuredOutputMode;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Output language")
      .setDesc("Controls generated summary prose. Auto uses the paper's dominant language, not the Obsidian UI language. Note headings remain fixed in English.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("english", "English")
          .addOption("korean", "Korean")
          .addOption("auto", "Auto (paper language)")
          .addOption("custom", "Custom")
          .setValue(this.plugin.settings.outputLanguage)
          .onChange(async (value) => {
            this.plugin.settings.outputLanguage = value as typeof this.plugin.settings.outputLanguage;
            await this.plugin.saveSettings();
            this.display();
          }),
      );

    new Setting(containerEl)
      .setName("Custom output language")
      .setDesc("Used only when Output language is set to Custom. Example: Japanese. Auto mode chooses the paper's dominant language and falls back to English if unclear.")
      .addText((text) => {
        text
          .setPlaceholder("Japanese")
          .setValue(this.plugin.settings.customOutputLanguage)
          .setDisabled(this.plugin.settings.outputLanguage !== "custom")
          .onChange(async (value) => {
            this.plugin.settings.customOutputLanguage = value;
            await this.plugin.saveSettings();
          });

        return text;
      });

    new Setting(containerEl)
      .setName("Output template")
      .setDesc("Built-in default template preserves the current note format. Custom template files are read from the vault and fall back to the built-in template if missing or invalid.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("built_in", "Built-in default template")
          .addOption("custom", "Custom template file")
          .setValue(this.plugin.settings.templateMode)
          .onChange(async (value) => {
            this.plugin.settings.templateMode = value as typeof this.plugin.settings.templateMode;
            await this.plugin.saveSettings();
            this.display();
          }),
      );

    new Setting(containerEl)
      .setName("Custom template file")
      .setDesc("Vault-relative Markdown template path. Used only when Output template is set to Custom. Missing or invalid templates automatically fall back to the built-in default.")
      .addText((text) => {
        text
          .setPlaceholder("Templates/Paper Summary.md")
          .setValue(this.plugin.settings.customTemplatePath)
          .setDisabled(this.plugin.settings.templateMode !== "custom")
          .onChange(async (value) => {
            this.plugin.settings.customTemplatePath = value.trim();
            await this.plugin.saveSettings();
          });

        return text;
      });

    new Setting(containerEl)
      .setName("OpenRouter require parameters")
      .setDesc("Prefer providers that honor structured-output parameters. Some models may still answer with plain JSON text, which the plugin now normalizes before validation.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.openRouterRequireParameters).onChange(async (value) => {
          this.plugin.settings.openRouterRequireParameters = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("OpenRouter app referer")
      .setDesc("Optional HTTP-Referer header used for OpenRouter attribution.")
      .addText((text) =>
        text
          .setPlaceholder("https://example.com")
          .setValue(this.plugin.settings.openRouterAppReferer)
          .onChange(async (value) => {
            this.plugin.settings.openRouterAppReferer = value.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("OpenRouter app title")
      .setDesc("Optional X-Title header used for OpenRouter attribution.")
      .addText((text) =>
        text
          .setPlaceholder("Paper Summary")
          .setValue(this.plugin.settings.openRouterAppTitle)
          .onChange(async (value) => {
            this.plugin.settings.openRouterAppTitle = value.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("OpenRouter provider order")
      .setDesc("Optional comma-separated provider preference order, for example openai,anthropic.")
      .addText((text) =>
        text
          .setPlaceholder("openai,anthropic")
          .setValue(this.plugin.settings.openRouterProviderOrder)
          .onChange(async (value) => {
            this.plugin.settings.openRouterProviderOrder = value.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("OpenRouter allow fallbacks")
      .setDesc("Allow OpenRouter to fall back to another provider when the preferred one is unavailable.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.openRouterAllowFallbacks).onChange(async (value) => {
          this.plugin.settings.openRouterAllowFallbacks = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Output folder")
      .setDesc("Folder where generated paper summary notes will be created.")
      .addText((text) =>
        text
          .setPlaceholder("Papers/Summaries")
          .setValue(this.plugin.settings.outputFolder)
          .onChange(async (value) => {
            this.plugin.settings.outputFolder = value.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Maximum PDF pages")
      .setDesc("Upper bound for extracted pages before summarization.")
      .addText((text) =>
        text
          .setPlaceholder("20")
          .setValue(String(this.plugin.settings.maxPages))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isNaN(parsed) && parsed > 0) {
              this.plugin.settings.maxPages = parsed;
              await this.plugin.saveSettings();
            }
          }),
      );

    new Setting(containerEl)
      .setName("Maximum characters")
      .setDesc("Upper bound for normalized extracted text sent to the API.")
      .addText((text) =>
        text
          .setPlaceholder("60000")
          .setValue(String(this.plugin.settings.maxChars))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isNaN(parsed) && parsed > 0) {
              this.plugin.settings.maxChars = parsed;
              await this.plugin.saveSettings();
            }
          }),
      );

    new Setting(containerEl)
      .setName("Open generated note")
      .setDesc("Open the created summary note after generation finishes.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.openAfterCreate).onChange(async (value) => {
          this.plugin.settings.openAfterCreate = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Paper tag")
      .setDesc("Tag always applied to generated paper notes.")
      .addText((text) =>
        text
          .setPlaceholder("paper")
          .setValue(this.plugin.settings.paperTag)
          .onChange(async (value) => {
            this.plugin.settings.paperTag = value.trim() || "paper";
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Default status")
      .setDesc("Status written into frontmatter for newly generated notes.")
      .addText((text) =>
        text
          .setPlaceholder("summarized")
          .setValue(this.plugin.settings.defaultStatus)
          .onChange(async (value) => {
            this.plugin.settings.defaultStatus = value.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Related notes limit")
      .setDesc("Maximum number of lightweight local related-note suggestions.")
      .addText((text) =>
        text
          .setPlaceholder("5")
          .setValue(String(this.plugin.settings.relatedNotesLimit))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isNaN(parsed) && parsed >= 0) {
              this.plugin.settings.relatedNotesLimit = parsed;
              await this.plugin.saveSettings();
            }
          }),
      );
  }
}
