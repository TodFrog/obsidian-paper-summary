import { App, PluginSettingTab, Setting } from "obsidian";
import type PaperSummaryPlugin from "./main";
import {
  applyProviderSelectionToSettings,
  getProviderMetadata,
  getProviderSettingsVisibility,
  normalizeProvider,
} from "./provider-metadata";
import {
  normalizeOutputLanguage,
  normalizeStructuredOutputMode,
  normalizeTemplateMode,
} from "./settings";

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
    const providerMetadata = getProviderMetadata(this.plugin.settings.provider);
    const providerVisibility = getProviderSettingsVisibility(this.plugin.settings.provider);

    new Setting(containerEl)
      .setName("Paper summary")
      .setHeading();

    new Setting(containerEl)
      .setName("Provider")
      .setDesc("Choose the remote API shape for paper analysis. Gemini, Claude, Ollama, and others currently use the shared OpenAI-compatible request path.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("openai", "OpenAI")
          .addOption("openrouter", "OpenRouter")
          .addOption("gemini", "Gemini")
          .addOption("claude", "Claude")
          .addOption("ollama", "Ollama")
          .addOption("others", "Others")
          .setValue(this.plugin.settings.provider)
          .onChange(async (value) => {
            const nextProvider = normalizeProvider(value);
            this.plugin.settings = applyProviderSelectionToSettings(
              this.plugin.settings,
              nextProvider,
            );

            await this.plugin.saveSettings();
            this.display();
          }),
      );

    if (providerVisibility.showApiKey) {
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
    }

    if (providerVisibility.showBaseUrl) {
      new Setting(containerEl)
        .setName("Base URL")
        .setDesc(`Optional API-compatible base URL. ${providerMetadata.baseUrlHelp} ${providerMetadata.capabilityNote}`)
        .addText((text) =>
          text
            .setPlaceholder(providerMetadata.baseUrlPlaceholder)
            .setValue(this.plugin.settings.baseUrl)
            .onChange(async (value) => {
              this.plugin.settings.baseUrl = value.trim();
              await this.plugin.saveSettings();
            }),
        );
    }

    if (providerVisibility.showModel) {
      new Setting(containerEl)
        .setName("Model")
        .setDesc(
          providerMetadata.suggestedModel
            ? `Remote model identifier used for all paper analysis. Suggested for ${providerMetadata.label}: ${providerMetadata.suggestedModel}.`
            : "Remote model identifier used for all paper analysis. This provider does not assume a default model.",
        )
        .addText((text) =>
          text
            .setPlaceholder(providerMetadata.suggestedModel || "your-model-id")
            .setValue(this.plugin.settings.model)
            .onChange(async (value) => {
              this.plugin.settings.model = value.trim();
              await this.plugin.saveSettings();
            }),
        );
    }

    if (providerVisibility.showStructuredOutputMode) {
      new Setting(containerEl)
        .setName("Structured output mode")
        .setDesc("JSON object is the compatibility default. JSON schema is stricter, but some OpenRouter models or routed providers ignore or reject it.")
        .addDropdown((dropdown) =>
          dropdown
            .addOption("json_object", "JSON object")
            .addOption("json_schema", "JSON schema")
            .setValue(this.plugin.settings.structuredOutputMode)
            .onChange(async (value) => {
              this.plugin.settings.structuredOutputMode = normalizeStructuredOutputMode(
                value,
                this.plugin.settings.structuredOutputMode,
              );
              await this.plugin.saveSettings();
            }),
        );
    }

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
            this.plugin.settings.outputLanguage = normalizeOutputLanguage(
              value,
              this.plugin.settings.outputLanguage,
            );
            await this.plugin.saveSettings();
            this.display();
          }),
      );

    new Setting(containerEl)
      .setName("Custom output language")
      .setDesc("Used only when output language is set to custom. Example: Japanese. Auto mode chooses the paper's dominant language and falls back to English if unclear.")
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
            this.plugin.settings.templateMode = normalizeTemplateMode(
              value,
              this.plugin.settings.templateMode,
            );
            await this.plugin.saveSettings();
            this.display();
          }),
      );

    new Setting(containerEl)
      .setName("Custom template file")
      .setDesc("Vault-relative Markdown template path. Used only when output template is set to custom. Missing or invalid templates automatically fall back to the built-in default.")
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

    if (providerVisibility.showOpenRouterSettings) {
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
            .setPlaceholder("Paper summary")
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
    }

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
      .setName("Paper notes scope")
      .setDesc("Vault-relative folder scanned for existing paper summary notes when generating or refreshing related paper links. Defaults to the output folder.")
      .addText((text) =>
        text
          .setPlaceholder(this.plugin.settings.outputFolder || "Papers/Summaries")
          .setValue(this.plugin.settings.paperNotesScope)
          .onChange(async (value) => {
            this.plugin.settings.paperNotesScope = value.trim() || this.plugin.settings.outputFolder;
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
