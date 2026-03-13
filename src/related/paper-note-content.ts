export interface BuiltInPaperNoteSections {
  title: string;
  oneSentenceSummary: string;
  keyContributions: string;
  methodology: string;
  results: string;
  limitations: string;
  relatedNotes: string[];
}

const SECTION_LABELS = {
  summary: "One-Sentence Summary",
  contributions: "Key Contributions",
  methodology: "Methodology & Architecture",
  results: "Results & Performance",
  limitations: "Limitations & Future Work",
  related: "Related Notes",
} as const;

function normalizeContent(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

function toLines(content: string): string[] {
  return normalizeContent(content).split("\n");
}

function isSectionHeading(line: string): boolean {
  return line.trim().startsWith("##");
}

function findSectionStart(lines: string[], label: string): number {
  const normalizedLabel = label.toLowerCase();
  return lines.findIndex((line) => {
    const trimmed = line.trim().toLowerCase();
    return trimmed.startsWith("##") && trimmed.includes(normalizedLabel);
  });
}

function findFirstHeading(lines: string[]): string {
  const headingLine = lines.find((line) => line.trim().startsWith("# "));
  return headingLine ? headingLine.trim().replace(/^#\s+/, "") : "";
}

function getSectionRange(lines: string[], label: string): { start: number; end: number } | null {
  const start = findSectionStart(lines, label);
  if (start === -1) {
    return null;
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (isSectionHeading(lines[index])) {
      end = index;
      break;
    }
  }

  return { start, end };
}

function getSectionLines(lines: string[], label: string): string[] | null {
  const range = getSectionRange(lines, label);
  if (!range) {
    return null;
  }

  return lines.slice(range.start + 1, range.end);
}

function normalizeSectionText(lines: string[]): string {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line
        .replace(/^>\s*/, "")
        .replace(/^-\s*/, "")
        .replace(/^\*\*[^*]+:\*\*\s*/, "")
        .replace(/^[A-Za-z][A-Za-z /&-]+:\s*/, "")
        .trim())
    .filter(Boolean)
    .join(" ");
}

function normalizeRelatedNoteLines(lines: string[]): string[] {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

function renderRelatedNoteLines(relatedNotes: string[]): string[] {
  if (relatedNotes.length === 0) {
    return ["- "];
  }

  return relatedNotes.map((note) => `- ${note}`);
}

export function parseBuiltInPaperNote(content: string): BuiltInPaperNoteSections | null {
  const lines = toLines(content);
  const summaryLines = getSectionLines(lines, SECTION_LABELS.summary);
  const contributionLines = getSectionLines(lines, SECTION_LABELS.contributions);
  const methodologyLines = getSectionLines(lines, SECTION_LABELS.methodology);
  const resultLines = getSectionLines(lines, SECTION_LABELS.results);
  const limitationLines = getSectionLines(lines, SECTION_LABELS.limitations);
  const relatedLines = getSectionLines(lines, SECTION_LABELS.related);

  if (
    !summaryLines
    || !contributionLines
    || !methodologyLines
    || !resultLines
    || !limitationLines
    || !relatedLines
  ) {
    return null;
  }

  return {
    title: findFirstHeading(lines),
    oneSentenceSummary: normalizeSectionText(summaryLines),
    keyContributions: normalizeSectionText(contributionLines),
    methodology: normalizeSectionText(methodologyLines),
    results: normalizeSectionText(resultLines),
    limitations: normalizeSectionText(limitationLines),
    relatedNotes: normalizeRelatedNoteLines(relatedLines),
  };
}

export function replaceBuiltInRelatedNotesSection(
  content: string,
  relatedNotes: string[],
): string | null {
  if (!parseBuiltInPaperNote(content)) {
    return null;
  }

  const lines = toLines(content);
  const relatedRange = getSectionRange(lines, SECTION_LABELS.related);
  if (!relatedRange) {
    return null;
  }

  let remainderStart = relatedRange.end;
  while (remainderStart < lines.length && !lines[remainderStart].trim()) {
    remainderStart += 1;
  }

  const updatedLines = [
    ...lines.slice(0, relatedRange.start + 1),
    ...renderRelatedNoteLines(relatedNotes),
    ...(remainderStart < lines.length ? [""] : []),
    ...lines.slice(remainderStart),
  ];

  return updatedLines.join("\n");
}
