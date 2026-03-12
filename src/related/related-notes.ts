export interface RelatedPaperContext {
  path: string;
  title: string;
  tags: string[];
  authors: string[];
  year: string;
}

export interface RelatedPaperCandidate extends RelatedPaperContext {
  isPaperNote: boolean;
}

export interface RelatedNoteSuggestion {
  path: string;
  title: string;
  score: number;
  reasons: string[];
}

function uniqueIntersection(left: string[], right: string[]): string[] {
  const rightSet = new Set(right.map((value) => value.toLowerCase()));
  return Array.from(
    new Set(left.filter((value) => rightSet.has(value.toLowerCase()))),
  );
}

function tokenizeTitle(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[^a-z0-9가-힣]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !["the", "and", "for", "with", "all"].includes(token));
}

export function rankRelatedNotes(params: {
  current: RelatedPaperContext;
  candidates: RelatedPaperCandidate[];
  limit: number;
}): RelatedNoteSuggestion[] {
  const currentTitleTokens = tokenizeTitle(params.current.title);

  return params.candidates
    .filter((candidate) => candidate.isPaperNote && candidate.path !== params.current.path)
    .map((candidate) => {
      const reasons: string[] = [];
      let score = 0;

      const sharedAuthors = uniqueIntersection(params.current.authors, candidate.authors);
      for (const author of sharedAuthors) {
        score += 6;
        reasons.push(`shared author: ${author}`);
      }

      const currentTags = params.current.tags.filter((tag) => tag.toLowerCase() !== "paper");
      const candidateTags = candidate.tags.filter((tag) => tag.toLowerCase() !== "paper");
      const sharedTags = uniqueIntersection(currentTags, candidateTags);
      for (const tag of sharedTags) {
        score += 4;
        reasons.push(`shared tag: ${tag}`);
      }

      const sharedTitleTokens = uniqueIntersection(currentTitleTokens, tokenizeTitle(candidate.title));
      if (sharedTitleTokens.length > 0) {
        score += sharedTitleTokens.length;
        reasons.push(`shared title terms: ${sharedTitleTokens.join(", ")}`);
      }

      if (params.current.year && candidate.year) {
        const currentYear = Number.parseInt(params.current.year, 10);
        const candidateYear = Number.parseInt(candidate.year, 10);
        if (!Number.isNaN(currentYear) && !Number.isNaN(candidateYear)) {
          const diff = Math.abs(currentYear - candidateYear);
          if (diff === 0) {
            score += 2;
            reasons.push(`same year: ${candidate.year}`);
          } else if (diff === 1) {
            score += 1;
            reasons.push(`nearby year: ${candidate.year}`);
          }
        }
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
