import type { App, TFile } from "obsidian";
import { replaceBuiltInRelatedNotesSection } from "../related/paper-note-content";
import { createRelatedPaperCandidate, suggestRelatedNoteLinks } from "../related/obsidian-related-notes";
import type { PaperSummarySettings } from "../settings";

export interface RefreshRelatedPaperLinksResult {
  notePath: string;
  relatedCount: number;
  updated: boolean;
}

const INVALID_NOTE_MESSAGE = "Refresh related paper links only works on built-in paper summary notes.";

export async function refreshRelatedPaperLinks(params: {
  app: App;
  file: TFile;
  settings: Pick<PaperSummarySettings, "outputFolder" | "paperNotesScope" | "paperTag" | "relatedNotesLimit">;
  onNotice?: (message: string) => void;
}): Promise<RefreshRelatedPaperLinksResult> {
  const content = await params.app.vault.cachedRead(params.file);
  const frontmatter = params.app.metadataCache.getFileCache(params.file)?.frontmatter;
  const current = createRelatedPaperCandidate({
    file: params.file,
    frontmatter: typeof frontmatter === "object" && frontmatter !== null ? frontmatter as Record<string, unknown> : undefined,
    content,
    paperTag: params.settings.paperTag,
  });

  if (!current.isPaperNote || !current.builtInFormat) {
    params.onNotice?.(INVALID_NOTE_MESSAGE);
    return {
      notePath: params.file.path,
      relatedCount: 0,
      updated: false,
    };
  }

  const relatedLinks = await suggestRelatedNoteLinks({
    current,
    files: params.app.vault.getMarkdownFiles(),
    vault: params.app.vault,
    metadataCache: params.app.metadataCache,
    paperTag: params.settings.paperTag,
    scope: params.settings.paperNotesScope || params.settings.outputFolder,
    limit: params.settings.relatedNotesLimit,
  });

  const updatedContent = replaceBuiltInRelatedNotesSection(content, relatedLinks);
  if (!updatedContent) {
    params.onNotice?.(INVALID_NOTE_MESSAGE);
    return {
      notePath: params.file.path,
      relatedCount: 0,
      updated: false,
    };
  }

  if (updatedContent !== content) {
    await params.app.vault.modify(params.file, updatedContent);
  }

  return {
    notePath: params.file.path,
    relatedCount: relatedLinks.length,
    updated: true,
  };
}
