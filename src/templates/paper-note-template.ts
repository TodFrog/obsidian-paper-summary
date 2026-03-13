import type { PaperAnalysisResult, PaperNoteViewModel, PdfExtractionResult } from "../contracts";
import { renderPaperNote } from "../renderer/paper-note-renderer";
import type { PaperSummarySettings } from "../settings";
import type { Vault } from "obsidian";

const SUPPORTED_PLACEHOLDERS = [
  "title",
  "authors",
  "venue",
  "year",
  "doi",
  "arxiv",
  "url",
  "abstract",
  "extracted_summary",
  "ai_summary",
  "key_contributions",
  "methodology",
  "results",
  "limitations",
  "tags",
  "related_notes",
] as const;

const DOI_TEXT_REGEX = /\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/i;
const ARXIV_TEXT_REGEX = /\b(?:arxiv(?:\.org\/(?:abs|pdf)\/|:)\s*)([a-z-]+\/\d{7}(?:v\d+)?|\d{4}\.\d{4,5}(?:v\d+)?)\b/i;

type TemplatePlaceholder = (typeof SUPPORTED_PLACEHOLDERS)[number];

export type TemplateFallbackReason =
  | "missing_template_path"
  | "template_not_markdown"
  | "template_not_found"
  | "template_empty"
  | "template_unreadable"
  | "template_invalid";

export interface PaperTemplateContext {
  title: string;
  authors: string;
  venue: string;
  year: string;
  doi: string;
  arxiv: string;
  url: string;
  abstract: string;
  extracted_summary: string;
  ai_summary: string;
  key_contributions: string;
  methodology: string;
  results: string;
  limitations: string;
  tags: string;
  related_notes: string;
}

export interface RenderConfiguredPaperNoteResult {
  content: string;
  templateSource: "built_in" | "custom";
  fallbackReason?: TemplateFallbackReason;
}

interface TemplateFileLike {
  path: string;
  extension: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTemplateFileLike(value: unknown): value is TemplateFileLike {
  return isRecord(value)
    && typeof value.path === "string"
    && typeof value.extension === "string";
}

function normalizeTemplatePath(path: string): string {
  return path.trim().replace(/^[\\/]+/, "");
}

function trimValues(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function renderBulletList(values: string[]): string {
  const trimmed = trimValues(values);
  if (trimmed.length === 0) {
    return "";
  }

  return trimmed.map((value) => `- ${value}`).join("\n");
}

function renderMethodologyBlock(model: PaperNoteViewModel): string {
  const lines: string[] = [];

  if (model.body.problemStatement.trim()) {
    lines.push(`- **Problem Statement:** ${model.body.problemStatement.trim()}`);
  }

  if (model.body.proposedMethod.trim()) {
    lines.push(`- **Proposed Method:** ${model.body.proposedMethod.trim()}`);
  }

  for (const detail of trimValues(model.body.proposedMethodDetails)) {
    lines.push(`    - ${detail}`);
  }

  return lines.join("\n");
}

function normalizeDoi(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/[)\].,;:]+$/g, "");
}

function extractDoiFromUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed);
    if (/(?:^|\.)doi\.org$/i.test(parsed.hostname)) {
      return normalizeDoi(decodeURIComponent(parsed.pathname.replace(/^\/+/, "")));
    }
  } catch {
    // Fall through to regex extraction.
  }

  const match = trimmed.match(DOI_TEXT_REGEX);
  return match ? normalizeDoi(match[0]) : "";
}

function extractDoiFromText(text: string): string {
  const match = text.match(DOI_TEXT_REGEX);
  return match ? normalizeDoi(match[0]) : "";
}

function normalizeArxivId(value: string): string {
  return value.trim().replace(/\.pdf$/i, "").replace(/[)\].,;:]+$/g, "");
}

function extractArxivFromUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed);
    if (/(?:^|\.)arxiv\.org$/i.test(parsed.hostname)) {
      const match = decodeURIComponent(parsed.pathname).match(/\/(?:abs|pdf)\/([^/?#]+?)(?:\.pdf)?$/i);
      if (match) {
        return normalizeArxivId(match[1]);
      }
    }
  } catch {
    // Fall through to regex extraction.
  }

  const match = trimmed.match(ARXIV_TEXT_REGEX);
  return match ? normalizeArxivId(match[1]) : "";
}

function extractArxivFromText(text: string): string {
  const match = text.match(ARXIV_TEXT_REGEX);
  return match ? normalizeArxivId(match[1]) : "";
}

function isLikelySectionHeading(line: string): boolean {
  return /^(?:(?:\d+|[IVXLC]+)\.?\s+)?(?:introduction|background|related work|method(?:ology)?|approach|experiments?|results?|discussion|conclusion|references|acknowledg(?:e)?ments?)\b/i.test(line);
}

function extractAbstractFromText(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const collected: string[] = [];
  let startIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      continue;
    }

    if (/^abstract\s*$/i.test(trimmed)) {
      startIndex = index + 1;
      break;
    }

    const inlineMatch = trimmed.match(/^abstract\s*[-—:]\s*(.+)$/i);
    if (inlineMatch) {
      collected.push(inlineMatch[1].trim());
      startIndex = index + 1;
      break;
    }
  }

  if (startIndex === -1) {
    return "";
  }

  for (let index = startIndex; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      continue;
    }

    if (collected.length > 0 && isLikelySectionHeading(trimmed)) {
      break;
    }

    collected.push(trimmed);
  }

  return collected.join(" ").trim();
}

function getPlaceholderSet(): Set<string> {
  return new Set<string>(SUPPORTED_PLACEHOLDERS);
}

function validateTemplate(template: string): void {
  const placeholders = getPlaceholderSet();
  let cursor = 0;

  while (cursor < template.length) {
    const openIndex = template.indexOf("{{", cursor);
    const closeIndex = template.indexOf("}}", cursor);

    if (closeIndex !== -1 && (openIndex === -1 || closeIndex < openIndex)) {
      throw new Error("Malformed placeholder syntax.");
    }

    if (openIndex === -1) {
      break;
    }

    const endIndex = template.indexOf("}}", openIndex + 2);
    if (endIndex === -1) {
      throw new Error("Malformed placeholder syntax.");
    }

    const placeholder = template.slice(openIndex + 2, endIndex).trim();
    if (!/^[a-z_]+$/.test(placeholder)) {
      throw new Error("Malformed placeholder syntax.");
    }

    if (!placeholders.has(placeholder)) {
      throw new Error(`Unknown placeholder: ${placeholder}`);
    }

    cursor = endIndex + 2;
  }
}

function buildBuiltInResult(
  model: PaperNoteViewModel,
  fallbackReason?: TemplateFallbackReason,
): RenderConfiguredPaperNoteResult {
  return {
    content: renderPaperNote(model),
    templateSource: "built_in",
    fallbackReason,
  };
}

function logTemplateFallback(reason: TemplateFallbackReason, templatePath: string, error?: unknown): void {
  console.warn("Paper Summary template fallback", {
    reason,
    templatePath,
    message: error instanceof Error ? error.message : undefined,
  });
}

export function buildPaperTemplateContext(params: {
  extraction: PdfExtractionResult;
  analysis: PaperAnalysisResult;
  model: PaperNoteViewModel;
  relatedNotes: string[];
}): PaperTemplateContext {
  const doi = extractDoiFromUrl(params.analysis.url) || extractDoiFromText(params.extraction.rawText);
  const arxiv = extractArxivFromUrl(params.analysis.url) || extractArxivFromText(params.extraction.rawText);
  const abstract = extractAbstractFromText(params.extraction.rawText);

  return {
    title: params.model.body.title.trim(),
    authors: trimValues(params.model.frontmatter.authors).join(", "),
    venue: params.model.frontmatter.venue.trim(),
    year: params.model.frontmatter.year.trim(),
    doi,
    arxiv,
    url: params.model.frontmatter.url.trim(),
    abstract,
    extracted_summary: abstract,
    ai_summary: params.model.body.oneSentenceSummary.trim(),
    key_contributions: renderBulletList(params.model.body.keyContributions),
    methodology: renderMethodologyBlock(params.model),
    results: renderBulletList(params.model.body.results),
    limitations: renderBulletList(params.model.body.limitations),
    tags: renderBulletList(params.model.frontmatter.tags),
    related_notes: renderBulletList(params.relatedNotes),
  };
}

export function renderCustomTemplate(template: string, context: PaperTemplateContext): string {
  validateTemplate(template);

  return template.replace(/{{\s*([a-z_]+)\s*}}/g, (_match, placeholder: string) => {
    return context[placeholder as TemplatePlaceholder];
  });
}

export async function renderConfiguredPaperNote(params: {
  vault: Vault;
  settings: Pick<PaperSummarySettings, "templateMode" | "customTemplatePath">;
  extraction: PdfExtractionResult;
  analysis: PaperAnalysisResult;
  model: PaperNoteViewModel;
  relatedNotes: string[];
}): Promise<RenderConfiguredPaperNoteResult> {
  if (params.settings.templateMode !== "custom") {
    return buildBuiltInResult(params.model);
  }

  const templatePath = normalizeTemplatePath(params.settings.customTemplatePath);
  if (!templatePath) {
    logTemplateFallback("missing_template_path", templatePath);
    return buildBuiltInResult(params.model, "missing_template_path");
  }

  if (!templatePath.toLowerCase().endsWith(".md")) {
    logTemplateFallback("template_not_markdown", templatePath);
    return buildBuiltInResult(params.model, "template_not_markdown");
  }

  const templateFile = params.vault.getAbstractFileByPath(templatePath);
  if (!isTemplateFileLike(templateFile) || templateFile.extension.toLowerCase() !== "md") {
    logTemplateFallback("template_not_found", templatePath);
    return buildBuiltInResult(params.model, "template_not_found");
  }

  let template: string;
  try {
    template = await params.vault.cachedRead(templateFile as never);
  } catch (error) {
    logTemplateFallback("template_unreadable", templatePath, error);
    return buildBuiltInResult(params.model, "template_unreadable");
  }

  if (!template.trim()) {
    logTemplateFallback("template_empty", templatePath);
    return buildBuiltInResult(params.model, "template_empty");
  }

  try {
    return {
      content: renderCustomTemplate(
        template,
        buildPaperTemplateContext({
          extraction: params.extraction,
          analysis: params.analysis,
          model: params.model,
          relatedNotes: params.relatedNotes,
        }),
      ),
      templateSource: "custom",
    };
  } catch (error) {
    logTemplateFallback("template_invalid", templatePath, error);
    return buildBuiltInResult(params.model, "template_invalid");
  }
}
