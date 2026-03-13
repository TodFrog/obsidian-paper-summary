import type { MetadataCache, TFile, Vault } from "obsidian";
import { parseBuiltInPaperNote } from "./paper-note-content";
import {
  extractKeywordTerms,
  rankRelatedNotes,
  type RelatedNoteSuggestion,
  type RelatedPaperCandidate,
  type RelatedPaperContext,
} from "./related-notes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function normalizeScalarString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function normalizeTags(frontmatter: unknown): string[] {
  if (!isRecord(frontmatter)) {
    return [];
  }

  const tags = frontmatter.tags;
  if (Array.isArray(tags)) {
    return tags
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim().replace(/^#/, ""))
      .filter(Boolean);
  }

  if (typeof tags === "string" && tags.trim()) {
    return tags
      .split(/[,\s]+/)
      .map((entry) => entry.trim().replace(/^#/, ""))
      .filter(Boolean);
  }

  return [];
}

function normalizeScope(scope: string): string {
  return scope.trim().replace(/^[\\/]+|[\\/]+$/g, "").replace(/\\/g, "/");
}

function isWithinScope(path: string, scope: string): boolean {
  const normalizedScope = normalizeScope(scope);
  if (!normalizedScope) {
    return true;
  }

  const normalizedPath = path.replace(/\\/g, "/");
  return normalizedPath === normalizedScope || normalizedPath.startsWith(`${normalizedScope}/`);
}

function buildKeywordText(parsed: NonNullable<ReturnType<typeof parseBuiltInPaperNote>>): string {
  return [
    parsed.oneSentenceSummary,
    parsed.keyContributions,
    parsed.methodology,
    parsed.results,
    parsed.limitations,
  ].join(" ");
}

function getFrontmatter(metadataCache: MetadataCache, file: TFile): Record<string, unknown> | undefined {
  const frontmatter = metadataCache.getFileCache(file)?.frontmatter;
  return isRecord(frontmatter) ? frontmatter : undefined;
}

export function createRelatedPaperCandidate(params: {
  file: Pick<TFile, "path" | "basename">;
  frontmatter?: Record<string, unknown>;
  content: string;
  paperTag: string;
}): RelatedPaperCandidate {
  const tags = normalizeTags(params.frontmatter);
  const parsed = parseBuiltInPaperNote(params.content);
  const paperTagLower = params.paperTag.toLowerCase();
  const hasPaperTag = tags.some((tag) => tag.toLowerCase() === paperTagLower);

  return {
    path: params.file.path,
    title: parsed?.title || params.file.basename,
    tags,
    authors: normalizeStringArray(params.frontmatter?.authors),
    year: normalizeScalarString(params.frontmatter?.year),
    venue: normalizeScalarString(params.frontmatter?.venue),
    keywordTerms: parsed ? extractKeywordTerms(buildKeywordText(parsed)) : [],
    isPaperNote: hasPaperTag || parsed !== null,
    builtInFormat: parsed !== null,
  };
}

async function readCandidate(params: {
  file: TFile;
  vault: Pick<Vault, "cachedRead">;
  metadataCache: MetadataCache;
  paperTag: string;
}): Promise<RelatedPaperCandidate> {
  const frontmatter = getFrontmatter(params.metadataCache, params.file);
  const normalizedTags = normalizeTags(frontmatter);

  try {
    const content = await params.vault.cachedRead(params.file);
    return createRelatedPaperCandidate({
      file: params.file,
      frontmatter,
      content,
      paperTag: params.paperTag,
    });
  } catch {
    return {
      path: params.file.path,
      title: params.file.basename,
      tags: normalizedTags,
      authors: normalizeStringArray(frontmatter?.authors),
      year: normalizeScalarString(frontmatter?.year),
      venue: normalizeScalarString(frontmatter?.venue),
      keywordTerms: [],
      isPaperNote: normalizedTags.some((tag) => tag.toLowerCase() === params.paperTag.toLowerCase()),
      builtInFormat: false,
    };
  }
}

export async function suggestRelatedPaperNotes(params: {
  current: RelatedPaperContext;
  files: TFile[];
  vault: Pick<Vault, "cachedRead">;
  metadataCache: MetadataCache;
  paperTag: string;
  scope: string;
  limit: number;
}): Promise<RelatedNoteSuggestion[]> {
  const candidates = await Promise.all(
    params.files
      .filter((file) => file.extension.toLowerCase() === "md")
      .filter((file) => file.path !== params.current.path)
      .filter((file) => isWithinScope(file.path, params.scope))
      .map((file) =>
        readCandidate({
          file,
          vault: params.vault,
          metadataCache: params.metadataCache,
          paperTag: params.paperTag,
        })),
  );

  return rankRelatedNotes({
    current: params.current,
    candidates,
    limit: params.limit,
    ignoredTags: [params.paperTag, "paper"],
  });
}

export async function suggestRelatedNoteLinks(params: {
  current: RelatedPaperContext;
  files: TFile[];
  vault: Pick<Vault, "cachedRead">;
  metadataCache: MetadataCache;
  paperTag: string;
  scope: string;
  limit: number;
}): Promise<string[]> {
  const suggestions = await suggestRelatedPaperNotes(params);
  return suggestions.map((suggestion) => `[[${suggestion.title}]]`);
}
