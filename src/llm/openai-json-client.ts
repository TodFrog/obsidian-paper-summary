import OpenAI from "openai";
import type { PaperSummarySettings } from "../settings";
import { paperAnalysisJsonSchema } from "./paper-analysis-json-schema";
import { buildOpenRouterRequestOptions } from "./openrouter-request";
import type { JsonCompletionClient, JsonCompletionResult } from "./paper-analysis";

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

  return "";
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

      const extractedContent = response.choices[0]?.message?.content ?? "";
      return {
        content: extractCompletionText(extractedContent),
        extractedContent,
        rawResponse: response,
      };
    },
  };
}
