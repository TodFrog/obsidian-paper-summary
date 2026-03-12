import type { PaperAnalysisResult, PaperNoteViewModel, PdfExtractionResult } from "../contracts";
import { createPaperTemplateModel } from "../renderer/paper-note-renderer";
import type { PaperSummarySettings } from "../settings";

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_").trim();
}

function hasMeaningfulFileName(value: string): boolean {
  return value.replace(/[_\-. ]/g, "").length > 0;
}

export function buildPaperNoteModel(params: {
  extraction: PdfExtractionResult;
  analysis: PaperAnalysisResult;
  settings: Pick<PaperSummarySettings, "paperTag" | "defaultStatus">;
  created: string;
  relatedNotes: string[];
}): PaperNoteViewModel {
  const model = createPaperTemplateModel({
    title: params.analysis.title || params.extraction.titleGuess,
    created: params.created,
  });

  model.frontmatter.tags = dedupe([
    params.settings.paperTag,
    ...params.analysis.tags,
  ]);
  model.frontmatter.authors = params.analysis.authors;
  model.frontmatter.year = params.analysis.year;
  model.frontmatter.venue = params.analysis.venue;
  model.frontmatter.url = params.analysis.url;
  model.frontmatter.code = params.analysis.code;
  model.frontmatter.status = params.settings.defaultStatus;

  model.body.oneSentenceSummary = params.analysis.oneSentenceSummary;
  model.body.keyContributions = params.analysis.keyContributions;
  model.body.problemStatement = params.analysis.problemStatement;
  model.body.proposedMethod = params.analysis.proposedMethod;
  model.body.proposedMethodDetails = params.analysis.proposedMethodDetails;
  model.body.datasetEnvironment = params.analysis.datasetEnvironment;
  model.body.keyMetrics = params.analysis.keyMetrics;
  model.body.results = params.analysis.results;
  model.body.limitations = params.analysis.limitations;
  model.body.relatedNotes = params.relatedNotes.length > 0
    ? params.relatedNotes
    : model.body.relatedNotes;

  return model;
}

export function buildPaperNotePath(outputFolder: string, title: string): string {
  const candidateTitle = sanitizeFileName(title || "Untitled Paper");
  const safeTitle = hasMeaningfulFileName(candidateTitle) ? candidateTitle : "Untitled Paper";
  const normalizedFolder = outputFolder.replace(/[\\/]+$/g, "").trim();

  if (!normalizedFolder) {
    return `${safeTitle}.md`;
  }

  return `${normalizedFolder}/${safeTitle}.md`;
}
