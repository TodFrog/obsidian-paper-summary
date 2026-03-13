import OpenAI from "openai";
import type { PaperSummarySettings } from "../settings";
import { paperAnalysisJsonSchema } from "./paper-analysis-json-schema";
import { buildOpenRouterRequestOptions } from "./openrouter-request";
import type {
  JsonCompletionCandidate,
  JsonCompletionClient,
  JsonCompletionResult,
} from "./paper-analysis";

type CompletionRequestSettings = Pick<
  PaperSummarySettings,
  | "provider"
  | "structuredOutputMode"
  | "openRouterRequireParameters"
  | "openRouterProviderOrder"
  | "openRouterAllowFallbacks"
  | "openRouterAppTitle"
  | "openRouterAppReferer"
>;

type ClientSettings = Pick<
  PaperSummarySettings,
  | "apiKey"
  | "baseUrl"
  | "provider"
  | "structuredOutputMode"
  | "openRouterRequireParameters"
  | "openRouterProviderOrder"
  | "openRouterAllowFallbacks"
  | "openRouterAppTitle"
  | "openRouterAppReferer"
>;

export interface CompletionRequest {
  body: Record<string, unknown>;
  requestOptions: {
    headers?: Record<string, string>;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function buildResponseFormat(
  structuredOutputMode: PaperSummarySettings["structuredOutputMode"],
): OpenAI.ResponseFormatJSONObject | OpenAI.ResponseFormatJSONSchema {
  if (structuredOutputMode === "json_schema") {
    return {
      type: "json_schema",
      json_schema: paperAnalysisJsonSchema,
    };
  }

  return {
    type: "json_object",
  };
}

export function buildCompletionRequest(
  params: CompletionRequestSettings & {
    model: string;
    systemPrompt: string;
    userPrompt: string;
  },
): CompletionRequest {
  const body: Record<string, unknown> = {
    model: params.model,
    temperature: 0,
    response_format: buildResponseFormat(params.structuredOutputMode),
    messages: [
      { role: "system", content: params.systemPrompt },
      { role: "user", content: params.userPrompt },
    ],
  };

  const requestOptions: CompletionRequest["requestOptions"] = {};

  if (params.provider === "openrouter") {
    const openRouterOptions = buildOpenRouterRequestOptions(params);
    Object.assign(body, openRouterOptions.extraBody);

    if (Object.keys(openRouterOptions.extraHeaders).length > 0) {
      requestOptions.headers = openRouterOptions.extraHeaders;
    }
  }

  return {
    body,
    requestOptions,
  };
}

export function extractCompletionText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (!part || typeof part !== "object") {
          return "";
        }

        const record = part as Record<string, unknown>;
        if (typeof record.text === "string") {
          return record.text;
        }

        if (typeof record.content === "string") {
          return record.content;
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  if (isRecord(content)) {
    if (typeof content.text === "string") {
      return content.text;
    }

    if (typeof content.content === "string") {
      return content.content;
    }

    if (content.content !== undefined) {
      return extractCompletionText(content.content);
    }

    try {
      return JSON.stringify(content);
    } catch {
      return "";
    }
  }

  return "";
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

export function extractCompletionCandidates(message: unknown): JsonCompletionCandidate[] {
  const candidates: JsonCompletionCandidate[] = [];
  const seenContents = new Set<string>();

  if (!isRecord(message)) {
    return candidates;
  }

  const { content } = message;

  if (typeof content === "string") {
    addCandidate(candidates, seenContents, "message.content.string", content);
  } else if (Array.isArray(content)) {
    addCandidate(candidates, seenContents, "message.content.parts", extractCompletionText(content));
  } else if (content !== undefined && content !== null) {
    addCandidate(candidates, seenContents, "message.content.object", extractCompletionText(content));
  }

  const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
  toolCalls.forEach((toolCall, index) => {
    if (!isRecord(toolCall) || !isRecord(toolCall.function)) {
      return;
    }

    if (typeof toolCall.function.arguments === "string") {
      addCandidate(
        candidates,
        seenContents,
        `message.tool_calls[${index}].function.arguments`,
        toolCall.function.arguments,
      );
    }
  });

  return candidates;
}

function extractMessageRefusal(message: unknown): string | undefined {
  if (!isRecord(message)) {
    return undefined;
  }

  if (typeof message.refusal === "string" && message.refusal.trim()) {
    return message.refusal;
  }

  if (!Array.isArray(message.content)) {
    return undefined;
  }

  const refusalText = message.content
    .map((part) => {
      if (!isRecord(part) || part.type !== "refusal" || typeof part.refusal !== "string") {
        return "";
      }

      return part.refusal.trim();
    })
    .filter(Boolean)
    .join("\n");

  return refusalText || undefined;
}

function extractMessageToolCalls(message: unknown): unknown {
  if (!isRecord(message) || !Array.isArray(message.tool_calls) || message.tool_calls.length === 0) {
    return undefined;
  }

  return message.tool_calls;
}

export function createOpenAiJsonCompletionClient(
  settings: ClientSettings,
): JsonCompletionClient {
  const client = new OpenAI({
    apiKey: settings.apiKey,
    baseURL: settings.baseUrl || undefined,
    dangerouslyAllowBrowser: true,
  });

  return {
    async complete({ model, systemPrompt, userPrompt }): Promise<JsonCompletionResult> {
      const request = buildCompletionRequest({
        provider: settings.provider,
        structuredOutputMode: settings.structuredOutputMode,
        model,
        systemPrompt,
        userPrompt,
        openRouterRequireParameters: settings.openRouterRequireParameters,
        openRouterProviderOrder: settings.openRouterProviderOrder,
        openRouterAllowFallbacks: settings.openRouterAllowFallbacks,
        openRouterAppTitle: settings.openRouterAppTitle,
        openRouterAppReferer: settings.openRouterAppReferer,
      });

      const response = await client.chat.completions.create(
        request.body as never,
        request.requestOptions as never,
      );

      const choice = response.choices[0];
      const message = choice?.message;
      const candidates = extractCompletionCandidates(message);
      const extractedContent = message?.content ?? "";
      return {
        content: candidates[0]?.content ?? extractCompletionText(extractedContent),
        candidates,
        extractedContent,
        rawResponse: response,
        finishReason: choice?.finish_reason,
        refusal: extractMessageRefusal(message),
        toolCalls: extractMessageToolCalls(message),
      };
    },
  };
}
