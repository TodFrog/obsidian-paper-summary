export interface PaperFrontmatter {
  aliases: string[];
  tags: string[];
  authors: string[];
  year: string;
  venue: string;
  url: string;
  code: string;
  status: string;
  created: string;
}

export interface PaperBody {
  title: string;
  oneSentenceSummary: string;
  keyContributions: string[];
  problemStatement: string;
  proposedMethod: string;
  proposedMethodDetails: string[];
  datasetEnvironment: string;
  keyMetrics: string;
  results: string[];
  limitations: string[];
  researchConnection: string;
  idea: string;
  relatedNotes: string[];
}

export interface PaperNoteViewModel {
  frontmatter: PaperFrontmatter;
  body: PaperBody;
}

export interface PaperTemplateSeed {
  title: string;
  created: string;
}

export interface PdfExtractionOptions {
  maxPages: number;
  maxChars: number;
}

export interface PdfExtractionResult {
  sourcePath: string;
  titleGuess: string;
  pageCount: number;
  includedPages: number;
  rawText: string;
  truncated: boolean;
}

export interface PaperAnalysisResult {
  title: string;
  authors: string[];
  year: string;
  venue: string;
  url: string;
  code: string;
  oneSentenceSummary: string;
  keyContributions: string[];
  problemStatement: string;
  proposedMethod: string;
  proposedMethodDetails: string[];
  datasetEnvironment: string;
  keyMetrics: string;
  results: string[];
  limitations: string[];
  tags: string[];
}
