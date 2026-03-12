import type { PaperAnalysisResult, PdfExtractionResult } from "../contracts";
import { PaperSummaryError } from "../errors";
import type { PaperSummarySettings } from "../settings";
import { z } from "zod";

export interface JsonCompletionResult {
  content: string;
  extractedContent?: unknown;
  rawResponse?: unknown;
}

export interface JsonCompletionClient {
  complete(params: {
    model: string;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<JsonCompletionResult>;
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

  return "";
}

function normalizeListString(value: string, commaSeparated: boolean): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const bulletNormalized = trimmed
    .split(/\r?\n+/)
    .map((entry) => entry.replace(/^\s*[-*•]\s*/, "").trim())
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
    return value.flatMap((entry) => normalizeStringArray(entry, commaSeparated));
  }

  if (typeof value === "string") {
    return normalizeListString(value, commaSeparated);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  return [];
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
  tags: listField(true),
});

function stripMarkdownCodeFences(content: string): string {
  const trimmed = content.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

export function normalizePaperAnalysisContent(content: string): string {
  const withoutCodeFences = stripMarkdownCodeFences(content);
  const firstBrace = withoutCodeFences.indexOf("{");
  const lastBrace = withoutCodeFences.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
    return withoutCodeFences.slice(firstBrace, lastBrace + 1).trim();
  }

  return withoutCodeFences.trim();
}

function formatZodIssue(issue: z.ZodIssue): string {
  const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";

  if (issue.code === "invalid_type" && issue.received === "undefined") {
    return `${path}: missing required field`;
  }

  return `${path}: ${issue.message}`;
}

export function buildPaperAnalysisPrompts(extraction: PdfExtractionResult): {
  systemPrompt: string;
  userPrompt: string;
} {
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
      "Keep tags short, lowercase, and useful for note retrieval.",
    ].join(" "),
    userPrompt: [
      "Analyze the following PDF extraction and return JSON with these fields:",
      "title, authors, year, venue, url, code, oneSentenceSummary, keyContributions,",
      "problemStatement, proposedMethod, proposedMethodDetails, datasetEnvironment,",
      "keyMetrics, results, limitations, tags.",
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
  const normalizedContent = normalizePaperAnalysisContent(content);
  let parsed: unknown;

  try {
    parsed = JSON.parse(normalizedContent);
  } catch (error) {
    throw new PaperSummaryError(
      "invalid_response",
      `The remote analysis response was not valid JSON after normalization: ${error instanceof Error ? error.message : String(error)}`,
      {
        kind: "invalid_json",
        rawContent: content,
        normalizedContent,
      },
    );
  }

  const result = paperAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    const validationIssues = result.error.issues.map((issue) => formatZodIssue(issue));
    throw new PaperSummaryError(
      "invalid_response",
      `The remote analysis response did not match the expected schema: ${validationIssues.join("; ")}`,
      {
        kind: "schema_validation",
        rawContent: content,
        normalizedContent,
        validationIssues,
      },
    );
  }

  return result.data;
}

export async function analyzePaper(
  settings: Pick<PaperSummarySettings, "apiKey" | "baseUrl" | "model">,
  extraction: PdfExtractionResult,
  client: JsonCompletionClient,
): Promise<PaperAnalysisResult> {
  if (!settings.apiKey.trim()) {
    throw new PaperSummaryError(
      "missing_api_key",
      "Paper Summary requires an API key before it can analyze PDFs.",
    );
  }

  const prompts = buildPaperAnalysisPrompts(extraction);
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

  if (!completion.content.trim()) {
    throw new PaperSummaryError(
      "empty_response",
      "The remote analysis response was empty.",
      {
        rawResponse: completion.rawResponse,
        extractedContent: completion.extractedContent,
        extractionText: extraction.rawText,
      },
    );
  }

  try {
    return parsePaperAnalysisResponse(completion.content);
  } catch (error) {
    if (error instanceof PaperSummaryError) {
      throw new PaperSummaryError(error.code, error.message, {
        ...(typeof error.details === "object" && error.details !== null ? error.details : {}),
        rawResponse: completion.rawResponse,
        extractedContent: completion.extractedContent ?? completion.content,
        extractionText: extraction.rawText,
      });
    }

    throw error;
  }
}
