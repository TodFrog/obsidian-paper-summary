import { Notice, Plugin, TFile } from "obsidian";
import { PaperSummaryError } from "./errors";
import { mergeSettings, type PaperSummarySettings } from "./settings";
import { PaperSummarySettingTab } from "./settings-tab";
import { generatePaperSummary } from "./workflow/generate-paper-summary";
import { refreshRelatedPaperLinks } from "./workflow/refresh-related-paper-links";

export default class PaperSummaryPlugin extends Plugin {
  settings: PaperSummarySettings = mergeSettings();

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new PaperSummarySettingTab(this.app, this));

    this.addCommand({
      id: "summarize-active-pdf",
      name: "Summarize active PDF",
      callback: async () => {
        await this.summarizeFile(this.app.workspace.getActiveFile());
      },
    });

    this.addCommand({
      id: "refresh-related-paper-links",
      name: "Refresh related paper links",
      callback: async () => {
        await this.refreshActivePaperLinks(this.app.workspace.getActiveFile());
      },
    });

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFile) || file.extension.toLowerCase() !== "pdf") {
          return;
        }

        menu.addItem((item) =>
          item
            .setTitle("Summarize PDF")
            .setIcon("file-text")
            .onClick(async () => {
              await this.summarizeFile(file);
            }),
        );
      }),
    );
  }

  async loadSettings(): Promise<void> {
    this.settings = mergeSettings(await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async summarizeFile(file: TFile | null): Promise<void> {
    if (!file) {
      new Notice("Open a PDF or choose one from the file menu first.");
      return;
    }

    try {
      const result = await generatePaperSummary({
        app: this.app,
        file,
        settings: this.settings,
        onProgress: (message) => {
          new Notice(message, 2500);
        },
        onNotice: (message) => {
          new Notice(message, 4000);
        },
      });

      new Notice(
        `Created "${result.noteTitle}" with ${result.relatedCount} related note suggestion${result.relatedCount === 1 ? "" : "s"}.`,
        5000,
      );
    } catch (error) {
      if (error instanceof PaperSummaryError) {
        if (error.details) {
          console.error("Paper Summary error details", {
            code: error.code,
            message: error.message,
            details: error.details,
          });
        }
        new Notice(error.message, 6000);
        return;
      }

      console.error("Paper Summary failed", error);
      new Notice(`Paper Summary failed: ${error instanceof Error ? error.message : String(error)}`, 6000);
    }
  }

  private async refreshActivePaperLinks(file: TFile | null): Promise<void> {
    if (!file || file.extension.toLowerCase() !== "md") {
      new Notice("Open a built-in paper summary note first.");
      return;
    }

    try {
      const result = await refreshRelatedPaperLinks({
        app: this.app,
        file,
        settings: {
          outputFolder: this.settings.outputFolder,
          paperNotesScope: this.settings.paperNotesScope,
          paperTag: this.settings.paperTag,
          relatedNotesLimit: this.settings.relatedNotesLimit,
        },
        onNotice: (message) => {
          new Notice(message, 4000);
        },
      });

      if (!result.updated) {
        return;
      }

      new Notice(
        `Refreshed related paper links with ${result.relatedCount} suggestion${result.relatedCount === 1 ? "" : "s"}.`,
        5000,
      );
    } catch (error) {
      console.error("Paper Summary failed to refresh related paper links", error);
      new Notice(`Paper Summary failed: ${error instanceof Error ? error.message : String(error)}`, 6000);
    }
  }
}
