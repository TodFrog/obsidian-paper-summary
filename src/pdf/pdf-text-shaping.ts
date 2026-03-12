import type { PdfExtractionOptions, PdfExtractionResult } from "../contracts";

function scoreTitleCandidate(line: string): number {
  const words = line.split(" ").filter(Boolean);
  const hasLetters = /[A-Za-z가-힣]/.test(line);
  const banned = /^(abstract|introduction|references|acknowledgements?|contents?)$/i.test(line);

  if (!hasLetters || banned || words.length < 3 || line.length < 12 || line.length > 180) {
    return -1;
  }

  return words.length * 10 + Math.min(line.length, 80);
}

export function normalizePdfPageText(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n");
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join("\n"),
    )
    .filter(Boolean);

  return paragraphs.join("\n\n");
}

export function guessPaperTitle(pageTexts: string[], fallbackTitle: string): string {
  const firstPage = normalizePdfPageText(pageTexts[0] ?? "");
  const lines = firstPage
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);

  let bestTitle = "";
  let bestScore = -1;

  lines.forEach((line, index) => {
    const score = scoreTitleCandidate(line);
    const weightedScore = score >= 0 ? score - index * 15 : score;
    if (weightedScore > bestScore) {
      bestTitle = line;
      bestScore = weightedScore;
    }
  });

  return bestScore >= 0 ? bestTitle : fallbackTitle;
}

export function buildPdfExtractionResult(params: {
  sourcePath: string;
  fallbackTitle: string;
  pageTexts: string[];
  options: PdfExtractionOptions;
  pageCount?: number;
}): PdfExtractionResult {
  const normalizedPages = params.pageTexts
    .map((pageText) => normalizePdfPageText(pageText))
    .filter(Boolean);
  const includedPages = normalizedPages.slice(0, params.options.maxPages);
  const joined = includedPages
    .map((pageText, index) => `--- Page ${index + 1} ---\n${pageText}`)
    .join("\n\n");
  const totalPageCount = params.pageCount ?? normalizedPages.length;
  const truncated = totalPageCount > includedPages.length || joined.length > params.options.maxChars;
  const rawText = joined.slice(0, params.options.maxChars);

  return {
    sourcePath: params.sourcePath,
    titleGuess: guessPaperTitle(normalizedPages, params.fallbackTitle),
    pageCount: totalPageCount,
    includedPages: includedPages.length,
    rawText,
    truncated,
  };
}
