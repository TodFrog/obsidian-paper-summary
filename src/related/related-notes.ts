export interface RelatedPaperContext {
  path: string;
  title: string;
  tags: string[];
  authors: string[];
  year: string;
  venue: string;
  keywordTerms: string[];
}

export interface RelatedPaperCandidate extends RelatedPaperContext {
  isPaperNote: boolean;
  builtInFormat?: boolean;
}

export interface RelatedNoteSuggestion {
  path: string;
  title: string;
  score: number;
  reasons: string[];
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "all",
  "are",
  "for",
  "from",
  "into",
  "method",
  "methods",
  "model",
  "models",
  "note",
  "notes",
  "paper",
  "papers",
  "results",
  "summary",
  "the",
  "using",
  "with",
  "work",
]);

const SCORE_WEIGHTS = {
  sharedAuthor: 6,
  sharedTag: 4,
  sharedTitleTerm: 2,
  sharedVenue: 3,
  sameYear: 2,
  nearbyYear: 1,
  sharedKeyword: 1,
} as const;

const MAX_SHARED_TITLE_TERMS = 4;
const MAX_SHARED_KEYWORDS = 5;

function uniqueIntersection(left: string[], right: string[]): string[] {
  const rightSet = new Set(right.map((value) => value.toLowerCase()));
  return Array.from(
    new Set(left.filter((value) => rightSet.has(value.toLowerCase()))),
  );
}

export function extractKeywordTerms(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function tokenizeTitle(title: string): string[] {
  return extractKeywordTerms(title);
}

export function rankRelatedNotes(params: {
  current: RelatedPaperContext;
  candidates: RelatedPaperCandidate[];
  limit: number;
  ignoredTags?: string[];
}): RelatedNoteSuggestion[] {
  const currentTitleTokens = tokenizeTitle(params.current.title);
  const ignoredTags = new Set((params.ignoredTags ?? ["paper"]).map((tag) => tag.toLowerCase()));

  return params.candidates
    .filter((candidate) => candidate.isPaperNote && candidate.path !== params.current.path)
    .map((candidate) => {
      const reasons: string[] = [];
      let score = 0;

      const sharedAuthors = uniqueIntersection(params.current.authors, candidate.authors);
      for (const author of sharedAuthors) {
        score += SCORE_WEIGHTS.sharedAuthor;
        reasons.push(`shared author: ${author}`);
      }

      const currentTags = params.current.tags.filter((tag) => !ignoredTags.has(tag.toLowerCase()));
      const candidateTags = candidate.tags.filter((tag) => !ignoredTags.has(tag.toLowerCase()));
      const sharedTags = uniqueIntersection(currentTags, candidateTags);
      for (const tag of sharedTags) {
        score += SCORE_WEIGHTS.sharedTag;
        reasons.push(`shared tag: ${tag}`);
      }

      const sharedTitleTokens = uniqueIntersection(currentTitleTokens, tokenizeTitle(candidate.title))
        .slice(0, MAX_SHARED_TITLE_TERMS);
      if (sharedTitleTokens.length > 0) {
        score += sharedTitleTokens.length * SCORE_WEIGHTS.sharedTitleTerm;
        reasons.push(`shared title terms: ${sharedTitleTokens.join(", ")}`);
      }

      if (params.current.venue && candidate.venue && params.current.venue.toLowerCase() === candidate.venue.toLowerCase()) {
        score += SCORE_WEIGHTS.sharedVenue;
        reasons.push(`shared venue: ${candidate.venue}`);
      }

      if (params.current.year && candidate.year) {
        const currentYear = Number.parseInt(params.current.year, 10);
        const candidateYear = Number.parseInt(candidate.year, 10);
        if (!Number.isNaN(currentYear) && !Number.isNaN(candidateYear)) {
          const diff = Math.abs(currentYear - candidateYear);
          if (diff === 0) {
            score += SCORE_WEIGHTS.sameYear;
            reasons.push(`same year: ${candidate.year}`);
          } else if (diff === 1) {
            score += SCORE_WEIGHTS.nearbyYear;
            reasons.push(`nearby year: ${candidate.year}`);
          }
        }
      }

      const sharedKeywordTerms = uniqueIntersection(params.current.keywordTerms, candidate.keywordTerms)
        .slice(0, MAX_SHARED_KEYWORDS);
      if (sharedKeywordTerms.length > 0) {
        score += sharedKeywordTerms.length * SCORE_WEIGHTS.sharedKeyword;
        reasons.push(`shared paper terms: ${sharedKeywordTerms.join(", ")}`);
      }

      return {
        path: candidate.path,
        title: candidate.title,
        score,
        reasons,
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, params.limit);
}
