import type { PaperAnalysisResult, PdfExtractionResult } from "../contracts";
import { PaperSummaryError } from "../errors";
import type { PaperSummarySettings } from "../settings";
import { z } from "zod";

type PaperAnalysisField = keyof PaperAnalysisResult;
type ParseFailureStage = "no_candidate" | "invalid_json" | "schema_validation";
type ParseStrategy = "direct" | "fenced_json" | "object_slice";
type OutputLanguageSettings = Pick<PaperSummarySettings, "outputLanguage" | "customOutputLanguage">;

const FIELD_NAME_BY_NORMALIZED_KEY: Record<string, PaperAnalysisField> = {
  title: "title",
  papertitle: "title",
  authors: "authors",
  year: "year",
  venue: "venue",
  url: "url",
  code: "code",
  onesentencesummary: "oneSentenceSummary",
  summary: "oneSentenceSummary",
  keycontributions: "keyContributions",
  contributions: "keyContributions",
  problemstatement: "problemStatement",
  proposedmethod: "proposedMethod",
  method: "proposedMethod",
  proposedmethoddetails: "proposedMethodDetails",
  methoddetails: "proposedMethodDetails",
  datasetenvironment: "datasetEnvironment",
  keymetrics: "keyMetrics",
  metrics: "keyMetrics",
  results: "results",
  limitations: "limitations",
  tags: "tags",
};

const OBJECT_TEXT_KEYS = ["text", "content", "value", "summary", "description", "message", "label", "name", "title"];
const OBJECT_LIST_KEYS = ["items", "values", "list", "data", "entries"];
const DIAGNOSTIC_PREVIEW_LIMIT = 220;

export interface JsonCompletionCandidate {
  source: string;
  content: string;
}

export interface JsonCompletionResult {
  content: string;
  candidates?: JsonCompletionCandidate[];
  extractedContent?: unknown;
  rawResponse?: unknown;
  finishReason?: string | null;
  refusal?: string | null;
  toolCalls?: unknown;
}

export interface JsonCompletionClient {
  complete(params: {
    model: string;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<JsonCompletionResult>;
}

interface JsonParseAttempt {
  parseStrategy: ParseStrategy;
  content: string;
}

interface ParseDiagnosticsContext {
  provider?: PaperSummarySettings["provider"];
  requestMode?: PaperSummarySettings["structuredOutputMode"];
  responseSummary?: Record<string, unknown>;
  extractedPreview?: string;
  extractionText?: string;
  finishReason?: string | null;
  refusal?: string | null;
  toolCallCount?: number;
}

interface ParseFailureDetails {
  kind: ParseFailureStage;
  stage: ParseFailureStage;
  parseStrategy?: ParseStrategy;
  candidateCount: number;
  candidateSource?: string;
  candidateSources: string[];
  candidatePreview?: string;
  normalizedPreview?: string;
  normalizedObjectPreview?: string;
  validationIssues?: string[];
  provider?: PaperSummarySettings["provider"];
  requestMode?: PaperSummarySettings["structuredOutputMode"];
  responseSummary?: Record<string, unknown>;
  extractedPreview?: string;
  extractionText?: string;
  finishReason?: string | null;
  refusal?: string | null;
  toolCallCount?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getNormalizedFieldKey(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "").toLowerCase();
}

function cleanStringArray(values: string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    cleaned.push(trimmed);
  }

  return cleaned;
}

function truncateDiagnosticText(value: string, limit = DIAGNOSTIC_PREVIEW_LIMIT): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, limit)}... [truncated]`;
}

function pickObjectValue(value: Record<string, unknown>, preferList: boolean): unknown {
  const keyGroups = preferList
    ? [OBJECT_LIST_KEYS, OBJECT_TEXT_KEYS]
    : [OBJECT_TEXT_KEYS, OBJECT_LIST_KEYS];

  for (const keys of keyGroups) {
    for (const key of keys) {
      if (value[key] !== undefined) {
        return value[key];
      }
    }
  }

  const objectValues = Object.values(value);
  if (objectValues.length === 1) {
    return objectValues[0];
  }

  return objectValues;
}

function normalizeScalarString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeScalarString(entry))
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  if (isRecord(value)) {
    return normalizeScalarString(pickObjectValue(value, false));
  }

  return "";
}

function normalizeListString(value: string, commaSeparated: boolean): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const bulletNormalized = trimmed
    .split(/\r?\n+/)
    .map((entry) => entry.replace(/^\s*[-*]\s*/, "").trim())
    .filter(Boolean);

  if (bulletNormalized.length > 1) {
    return bulletNormalized;
  }

  if (commaSeparated) {
    return trimmed
      .split(/\s*,\s*/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [trimmed];
}

function normalizeStringArray(value: unknown, commaSeparated = false): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return cleanStringArray(value.flatMap((entry) => normalizeStringArray(entry, commaSeparated)));
  }

  if (typeof value === "string") {
    return normalizeListString(value, commaSeparated);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (isRecord(value)) {
    return cleanStringArray(normalizeStringArray(pickObjectValue(value, true), commaSeparated));
  }

  return [];
}

function normalizeTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function requiredStringField(fieldName: string): z.ZodEffects<z.ZodString, string, unknown> {
  return z.preprocess(
    normalizeScalarString,
    z.string().min(1, `${fieldName} must not be empty.`),
  );
}

function optionalStringField(): z.ZodEffects<z.ZodString, string, unknown> {
  return z.preprocess(normalizeScalarString, z.string());
}

function listField(commaSeparated = false): z.ZodEffects<z.ZodArray<z.ZodString>, string[], unknown> {
  return z.preprocess(
    (value) => normalizeStringArray(value, commaSeparated),
    z.array(z.string()),
  );
}

function tagListField(): z.ZodEffects<z.ZodArray<z.ZodString>, string[], unknown> {
  return z.preprocess(
    (value) => cleanStringArray(normalizeStringArray(value, true).map((entry) => normalizeTag(entry))),
    z.array(z.string()),
  );
}

const paperAnalysisSchema = z.object({
  title: optionalStringField(),
  authors: listField(true),
  year: optionalStringField(),
  venue: optionalStringField(),
  url: optionalStringField(),
  code: optionalStringField(),
  oneSentenceSummary: requiredStringField("oneSentenceSummary"),
  keyContributions: listField(),
  problemStatement: optionalStringField(),
  proposedMethod: optionalStringField(),
  proposedMethodDetails: listField(),
  datasetEnvironment: optionalStringField(),
  keyMetrics: optionalStringField(),
  results: listField(),
  limitations: listField(),
  tags: tagListField(),
});

function stripBom(content: string): string {
  return content.replace(/^\uFEFF/, "");
}

function extractFencedJsonContent(content: string): string | undefined {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fencedMatch?.[1]?.trim();
}

function findTopLevelObjectSlices(content: string): string[] {
  const slices: string[] = [];
  let startIndex = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "\"") {
        inString = false;
      }

      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        startIndex = index;
      }

      depth += 1;
      continue;
    }

    if (char === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && startIndex !== -1) {
        slices.push(content.slice(startIndex, index + 1));
        startIndex = -1;
      }
    }
  }

  return slices;
}

export function normalizePaperAnalysisContent(content: string): string {
  return stripBom(content).trim();
}

function addParseAttempt(
  attempts: JsonParseAttempt[],
  seenContents: Set<string>,
  parseStrategy: ParseStrategy,
  content: string | undefined,
): void {
  const trimmed = content?.trim() ?? "";
  if (!trimmed || seenContents.has(trimmed)) {
    return;
  }

  seenContents.add(trimmed);
  attempts.push({ parseStrategy, content: trimmed });
}

function buildJsonParseAttempts(content: string): JsonParseAttempt[] {
  const normalizedContent = normalizePaperAnalysisContent(content);
  const attempts: JsonParseAttempt[] = [];
  const seenContents = new Set<string>();

  addParseAttempt(attempts, seenContents, "direct", normalizedContent);
  addParseAttempt(attempts, seenContents, "fenced_json", extractFencedJsonContent(normalizedContent));

  const objectSlice = findTopLevelObjectSlices(normalizedContent)
    .sort((left, right) => right.length - left.length)[0];
  addParseAttempt(attempts, seenContents, "object_slice", objectSlice);

  return attempts;
}

function formatZodIssue(issue: z.ZodIssue): string {
  const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";

  if (issue.code === "invalid_type" && issue.received === "undefined") {
    return `${path}: missing required field`;
  }

  return `${path}: ${issue.message}`;
}

function countRecognizedFields(value: unknown): number {
  if (!isRecord(value)) {
    return 0;
  }

  return Object.keys(value).reduce((count, key) => {
    return count + (FIELD_NAME_BY_NORMALIZED_KEY[getNormalizedFieldKey(key)] ? 1 : 0);
  }, 0);
}

function unwrapPaperAnalysisEnvelope(value: unknown): unknown {
  if (Array.isArray(value) && value.length === 1) {
    return unwrapPaperAnalysisEnvelope(value[0]);
  }

  if (!isRecord(value)) {
    return value;
  }

  if (countRecognizedFields(value) > 0) {
    return value;
  }

  for (const key of ["paperAnalysis", "paper_analysis", "analysis", "result", "data"]) {
    const candidate = value[key];
    if (countRecognizedFields(candidate) > 0) {
      return candidate;
    }
  }

  return value;
}

function canonicalizePaperAnalysisObject(parsed: unknown): Record<string, unknown> {
  const unwrapped = unwrapPaperAnalysisEnvelope(parsed);
  if (!isRecord(unwrapped)) {
    return {};
  }

  const canonical: Partial<Record<PaperAnalysisField, unknown>> = {};

  for (const [key, value] of Object.entries(unwrapped)) {
    const field = FIELD_NAME_BY_NORMALIZED_KEY[getNormalizedFieldKey(key)];
    if (!field || canonical[field] !== undefined) {
      continue;
    }

    canonical[field] = value;
  }

  return canonical;
}

function stringifyCandidateContent(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => stringifyCandidateContent(entry)).filter(Boolean).join("\n");
  }

  if (isRecord(value)) {
    if (typeof value.text === "string") {
      return value.text;
    }

    if (typeof value.content === "string") {
      return value.content;
    }

    if (value.content !== undefined) {
      return stringifyCandidateContent(value.content);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function previewContent(value: unknown): string | undefined {
  const text = stringifyCandidateContent(value).trim();
  return text ? truncateDiagnosticText(text) : undefined;
}

function addCandidate(
  candidates: JsonCompletionCandidate[],
  seenContents: Set<string>,
  source: string,
  content: string,
): void {
  const trimmed = content.trim();
  if (!trimmed || seenContents.has(trimmed)) {
    return;
  }

  seenContents.add(trimmed);
  candidates.push({ source, content: trimmed });
}

function buildCompletionCandidates(completion: JsonCompletionResult): JsonCompletionCandidate[] {
  const candidates: JsonCompletionCandidate[] = [];
  const seenContents = new Set<string>();

  for (const candidate of completion.candidates ?? []) {
    addCandidate(candidates, seenContents, candidate.source, candidate.content);
  }

  addCandidate(candidates, seenContents, "completion.content", completion.content);

  if (completion.extractedContent !== undefined) {
    addCandidate(
      candidates,
      seenContents,
      "completion.extractedContent",
      stringifyCandidateContent(completion.extractedContent),
    );
  }

  return candidates;
}

function summarizeRawResponse(rawResponse: unknown): Record<string, unknown> | undefined {
  if (!isRecord(rawResponse)) {
    return undefined;
  }

  const summary: Record<string, unknown> = {};

  for (const key of ["id", "model", "object", "created"]) {
    const value = rawResponse[key];
    if (typeof value === "string" || typeof value === "number") {
      summary[key] = value;
    }
  }

  if (Array.isArray(rawResponse.choices)) {
    summary.choiceCount = rawResponse.choices.length;
  }

  return Object.keys(summary).length > 0 ? summary : undefined;
}

function countToolCalls(toolCalls: unknown): number | undefined {
  return Array.isArray(toolCalls) && toolCalls.length > 0 ? toolCalls.length : undefined;
}

function getStagePriority(stage: ParseFailureStage): number {
  switch (stage) {
    case "schema_validation":
      return 3;
    case "invalid_json":
      return 2;
    case "no_candidate":
    default:
      return 1;
  }
}

function buildFailureDetails(
  stage: ParseFailureStage,
  candidates: JsonCompletionCandidate[],
  context: ParseDiagnosticsContext,
  extras: Partial<ParseFailureDetails> = {},
): ParseFailureDetails {
  return {
    kind: stage,
    stage,
    candidateCount: candidates.length,
    candidateSources: candidates.map((candidate) => candidate.source),
    provider: context.provider,
    requestMode: context.requestMode,
    responseSummary: context.responseSummary,
    extractedPreview: context.extractedPreview,
    extractionText: context.extractionText,
    finishReason: context.finishReason,
    refusal: context.refusal,
    toolCallCount: context.toolCallCount,
    ...extras,
  };
}

function throwParseFailure(message: string, details: ParseFailureDetails): never {
  throw new PaperSummaryError("invalid_response", message, details);
}

function parsePaperAnalysisCandidates(
  candidates: JsonCompletionCandidate[],
  context: ParseDiagnosticsContext = {},
): PaperAnalysisResult {
  if (candidates.length === 0) {
    throwParseFailure(
      "The remote analysis response did not include a usable JSON payload.",
      buildFailureDetails("no_candidate", candidates, context),
    );
  }

  let bestFailure: { message: string; details: ParseFailureDetails } | undefined;

  for (const candidate of candidates) {
    const candidatePreview = truncateDiagnosticText(candidate.content);

    for (const attempt of buildJsonParseAttempts(candidate.content)) {
      let parsed: unknown;

      try {
        parsed = JSON.parse(attempt.content);
      } catch {
        const failure = {
          message: "The remote analysis response was not valid JSON.",
          details: buildFailureDetails("invalid_json", candidates, context, {
            candidateSource: candidate.source,
            candidatePreview,
            parseStrategy: attempt.parseStrategy,
            normalizedPreview: truncateDiagnosticText(attempt.content),
          }),
        };

        if (!bestFailure || getStagePriority(failure.details.stage) >= getStagePriority(bestFailure.details.stage)) {
          bestFailure = failure;
        }

        continue;
      }

      const normalizedObject = canonicalizePaperAnalysisObject(parsed);
      const result = paperAnalysisSchema.safeParse(normalizedObject);
      if (result.success) {
        return result.data;
      }

      const validationIssues = result.error.issues.map((issue) => formatZodIssue(issue));
      const normalizedObjectPreview = previewContent(normalizedObject);
      const failure = {
        message: "The remote analysis response did not match the expected schema.",
        details: buildFailureDetails("schema_validation", candidates, context, {
          candidateSource: candidate.source,
          candidatePreview,
          parseStrategy: attempt.parseStrategy,
          normalizedPreview: truncateDiagnosticText(attempt.content),
          normalizedObjectPreview,
          validationIssues,
        }),
      };

      if (!bestFailure || getStagePriority(failure.details.stage) >= getStagePriority(bestFailure.details.stage)) {
        bestFailure = failure;
      }
    }
  }

  if (!bestFailure) {
    throwParseFailure(
      "The remote analysis response did not include a usable JSON payload.",
      buildFailureDetails("no_candidate", candidates, context),
    );
  }

  throwParseFailure(bestFailure.message, bestFailure.details);
}

function getOutputLanguageSettings(
  settings?: Partial<OutputLanguageSettings>,
): OutputLanguageSettings {
  return {
    outputLanguage: settings?.outputLanguage ?? "english",
    customOutputLanguage: settings?.customOutputLanguage ?? "",
  };
}

function buildOutputLanguagePromptLines(
  settings?: Partial<OutputLanguageSettings>,
): string[] {
  const resolved = getOutputLanguageSettings(settings);
  const customLanguage = resolved.customOutputLanguage.trim();

  switch (resolved.outputLanguage) {
    case "korean":
      return [
        "Write all summary prose fields in Korean.",
        "Keep the paper title in its original language.",
        "Keep author names, venue names, URLs, and code links as they appear in the source when possible.",
        "Tags must stay English lowercase snake_case.",
      ];
    case "auto":
      return [
        "Use the paper's dominant language for summary prose fields.",
        "If the dominant language is unclear, fall back to English.",
        "For mixed-language papers, choose one dominant output language instead of mixing languages across sections.",
        "Keep the paper title in its original language.",
        "Keep author names, venue names, URLs, and code links as they appear in the source when possible.",
        "Tags must stay English lowercase snake_case.",
      ];
    case "custom":
      if (!customLanguage) {
        throw new PaperSummaryError(
          "invalid_input",
          "Choose a custom output language or switch Output language away from Custom.",
        );
      }

      return [
        `Write all summary prose fields in ${customLanguage}.`,
        "Keep the paper title in its original language.",
        "Keep author names, venue names, URLs, and code links as they appear in the source when possible.",
        "Tags must stay English lowercase snake_case.",
      ];
    case "english":
    default:
      return [
        "Write all summary prose fields in English.",
        "Keep the paper title in its original language.",
        "Keep author names, venue names, URLs, and code links as they appear in the source when possible.",
        "Tags must stay English lowercase snake_case.",
      ];
  }
}

export function buildPaperAnalysisPrompts(
  extraction: PdfExtractionResult,
  settings?: Partial<OutputLanguageSettings>,
): {
  systemPrompt: string;
  userPrompt: string;
} {
  const languagePromptLines = buildOutputLanguagePromptLines(settings);

  return {
    systemPrompt: [
      "You are extracting structured academic paper summaries.",
      "Return valid JSON only.",
      "Use the provided schema fields exactly.",
      "Return one JSON object only, with no markdown code fences and no surrounding commentary.",
      "If a string field is unavailable, use an empty string.",
      "If an array field is unavailable, use an empty array.",
      "Never use null values.",
      "Always return arrays for authors, keyContributions, proposedMethodDetails, results, limitations, and tags.",
      "Do not invent URLs, years, venues, or code links if they are not present in the source text.",
      "Keep tags short, lowercase, use underscores instead of spaces, and keep them useful for note retrieval.",
      ...languagePromptLines,
    ].join(" "),
    userPrompt: [
      "Analyze the following PDF extraction and return JSON with these fields:",
      "title, authors, year, venue, url, code, oneSentenceSummary, keyContributions,",
      "problemStatement, proposedMethod, proposedMethodDetails, datasetEnvironment,",
      "keyMetrics, results, limitations, tags.",
      "Use lowercase tags with underscores instead of spaces.",
      extraction.truncated
        ? "The extraction was truncated to fit the model budget, so prefer conservative claims."
        : "The extraction was not truncated.",
      `Source path: ${extraction.sourcePath}`,
      `Title guess: ${extraction.titleGuess}`,
      `Pages included: ${extraction.includedPages}/${extraction.pageCount}`,
      "",
      extraction.rawText,
    ].join("\n"),
  };
}

export function parsePaperAnalysisResponse(content: string): PaperAnalysisResult {
  return parsePaperAnalysisCandidates(
    [{ source: "response.content", content }],
    {
      extractedPreview: previewContent(content),
    },
  );
}

export async function analyzePaper(
  settings: Pick<PaperSummarySettings, "apiKey" | "baseUrl" | "model">
    & Partial<Pick<PaperSummarySettings, "provider" | "structuredOutputMode" | "outputLanguage" | "customOutputLanguage">>,
  extraction: PdfExtractionResult,
  client: JsonCompletionClient,
): Promise<PaperAnalysisResult> {
  if (!settings.apiKey.trim()) {
    throw new PaperSummaryError(
      "missing_api_key",
      "Paper Summary requires an API key before it can analyze PDFs.",
    );
  }

  const prompts = buildPaperAnalysisPrompts(extraction, settings);
  let completion: JsonCompletionResult;

  try {
    completion = await client.complete({
      model: settings.model,
      systemPrompt: prompts.systemPrompt,
      userPrompt: prompts.userPrompt,
    });
  } catch (error) {
    if (error instanceof PaperSummaryError) {
      throw error;
    }

    throw new PaperSummaryError(
      "api_request_failed",
      `The remote analysis request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return parsePaperAnalysisCandidates(buildCompletionCandidates(completion), {
    provider: settings.provider,
    requestMode: settings.structuredOutputMode,
    responseSummary: summarizeRawResponse(completion.rawResponse),
    extractedPreview: previewContent(completion.extractedContent ?? completion.content),
    extractionText: extraction.rawText,
    finishReason: completion.finishReason,
    refusal: completion.refusal,
    toolCallCount: countToolCalls(completion.toolCalls),
  });
}
