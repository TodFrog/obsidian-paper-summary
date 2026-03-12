import { App, TFile } from "obsidian";
import type { RelatedPaperContext } from "../related/related-notes";
import type { PaperSummarySettings } from "../settings";
import { analyzePaper } from "../llm/paper-analysis";
import { createOpenAiJsonCompletionClient } from "../llm/openai-json-client";
import { buildPaperNoteModel, buildPaperNotePath } from "../notes/paper-note-builder";
import { extractPdfText } from "../pdf/pdf-extractor";
import { renderPaperNote } from "../renderer/paper-note-renderer";
import { suggestRelatedNoteLinks } from "../related/obsidian-related-notes";
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
  };

  params.onProgress?.("Finding related notes...");
  const relatedLinks = suggestRelatedNoteLinks({
    current: relatedContext,
    files: params.app.vault.getMarkdownFiles(),
    metadataCache: params.app.metadataCache,
    paperTag: params.settings.paperTag,
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
  const noteContent = renderPaperNote(model);
  const createdFile = await createNoteInVault(params.app.vault, notePath, noteContent);

  if (params.settings.openAfterCreate) {
    await params.app.workspace.getLeaf(false).openFile(createdFile);
  }

  return {
    notePath,
    noteTitle: model.body.title,
    relatedCount: relatedLinks.length,
  };
}
