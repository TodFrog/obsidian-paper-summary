import { App, TFile } from "obsidian";
import type { RelatedPaperContext } from "../related/related-notes";
import { extractKeywordTerms } from "../related/related-notes";
import type { PaperSummarySettings } from "../settings";
import { analyzePaper } from "../llm/paper-analysis";
import { createOpenAiJsonCompletionClient } from "../llm/openai-json-client";
import { buildPaperNoteModel, buildPaperNotePath } from "../notes/paper-note-builder";
import { extractPdfText } from "../pdf/pdf-extractor";
import { suggestRelatedNoteLinks } from "../related/obsidian-related-notes";
import { renderConfiguredPaperNote } from "../templates/paper-note-template";
import { createNoteInVault } from "../vault/obsidian-note-file";
import { PaperSummaryError } from "../errors";

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface GeneratePaperSummaryResult {
  notePath: string;
  noteTitle: string;
  relatedCount: number;
}

export async function generatePaperSummary(params: {
  app: App;
  file: TFile;
  settings: PaperSummarySettings;
  onProgress?: (message: string) => void;
  onNotice?: (message: string) => void;
}): Promise<GeneratePaperSummaryResult> {
  if (params.file.extension.toLowerCase() !== "pdf") {
    throw new PaperSummaryError(
      "invalid_input",
      "Paper Summary only works on PDF files.",
    );
  }

  params.onProgress?.("Reading PDF...");
  const buffer = await params.app.vault.readBinary(params.file);
  const extraction = await extractPdfText(buffer, params.file.path, {
    maxPages: params.settings.maxPages,
    maxChars: params.settings.maxChars,
  });

  params.onProgress?.("Analyzing PDF...");
  const analysis = await analyzePaper(
    params.settings,
    extraction,
    createOpenAiJsonCompletionClient(params.settings),
  );

  const notePath = buildPaperNotePath(params.settings.outputFolder, analysis.title || extraction.titleGuess);
  const relatedContext: RelatedPaperContext = {
    path: notePath,
    title: analysis.title || extraction.titleGuess,
    tags: [params.settings.paperTag, ...analysis.tags],
    authors: analysis.authors,
    year: analysis.year,
    venue: analysis.venue,
    keywordTerms: extractKeywordTerms([
      analysis.oneSentenceSummary,
      ...analysis.keyContributions,
      analysis.problemStatement,
      analysis.proposedMethod,
      ...analysis.proposedMethodDetails,
      ...analysis.results,
      ...analysis.limitations,
    ].join(" ")),
  };

  params.onProgress?.("Finding related notes...");
  const relatedLinks = await suggestRelatedNoteLinks({
    current: relatedContext,
    files: params.app.vault.getMarkdownFiles(),
    vault: params.app.vault,
    metadataCache: params.app.metadataCache,
    paperTag: params.settings.paperTag,
    scope: params.settings.paperNotesScope,
    limit: params.settings.relatedNotesLimit,
  });

  const model = buildPaperNoteModel({
    extraction,
    analysis,
    settings: {
      paperTag: params.settings.paperTag,
      defaultStatus: params.settings.defaultStatus,
    },
    created: getTodayIsoDate(),
    relatedNotes: relatedLinks,
  });

  params.onProgress?.("Creating note...");
  const renderedNote = await renderConfiguredPaperNote({
    vault: params.app.vault,
    settings: {
      templateMode: params.settings.templateMode,
      customTemplatePath: params.settings.customTemplatePath,
    },
    extraction,
    analysis,
    model,
    relatedNotes: relatedLinks,
  });
  if (renderedNote.fallbackReason) {
    params.onNotice?.("Custom template unavailable. Used built-in default template.");
  }
  const noteContent = renderedNote.content;
  const createdFile = await createNoteInVault(params.app.vault, notePath, noteContent);

  if (params.settings.openAfterCreate) {
    await params.app.workspace.getLeaf(false).openFile(createdFile);
  }

  return {
    notePath: createdFile.path,
    noteTitle: model.body.title,
    relatedCount: relatedLinks.length,
  };
}
