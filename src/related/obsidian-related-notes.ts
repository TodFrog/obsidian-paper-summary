import { MetadataCache, TFile, parseFrontMatterTags } from "obsidian";
import { rankRelatedNotes, type RelatedPaperCandidate, type RelatedPaperContext } from "./related-notes";

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

function getTags(metadataCache: MetadataCache, file: TFile): string[] {
  return parseFrontMatterTags(metadataCache.getFileCache(file)?.frontmatter) ?? [];
}

function toCandidate(
  metadataCache: MetadataCache,
  file: TFile,
  paperTag: string,
): RelatedPaperCandidate {
  const frontmatter = metadataCache.getFileCache(file)?.frontmatter;
  const tags = getTags(metadataCache, file);

  return {
    path: file.path,
    title: file.basename,
    tags,
    authors: normalizeStringArray(frontmatter?.authors),
    year: typeof frontmatter?.year === "string" ? frontmatter.year : String(frontmatter?.year ?? ""),
    isPaperNote: tags.some((tag) => tag.toLowerCase() === paperTag.toLowerCase()),
  };
}

export function suggestRelatedNoteLinks(params: {
  current: RelatedPaperContext;
  files: TFile[];
  metadataCache: MetadataCache;
  paperTag: string;
  limit: number;
}): string[] {
  const suggestions = rankRelatedNotes({
    current: params.current,
    candidates: params.files.map((file) => toCandidate(params.metadataCache, file, params.paperTag)),
    limit: params.limit,
  });

  return suggestions.map((suggestion) => `[[${suggestion.title}]]`);
}
