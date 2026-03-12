import type { PaperSummarySettings } from "../settings";

type OpenRouterSettings = Pick<
  PaperSummarySettings,
  | "openRouterRequireParameters"
  | "openRouterProviderOrder"
  | "openRouterAllowFallbacks"
  | "openRouterAppTitle"
  | "openRouterAppReferer"
>;

export interface OpenRouterRequestOptions {
  extraBody: Record<string, unknown>;
  extraHeaders: Record<string, string>;
}

function parseProviderOrder(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

export function buildOpenRouterRequestOptions(
  settings: OpenRouterSettings,
): OpenRouterRequestOptions {
  const order = parseProviderOrder(settings.openRouterProviderOrder);
  const provider: Record<string, unknown> = {
    require_parameters: settings.openRouterRequireParameters,
    allow_fallbacks: settings.openRouterAllowFallbacks,
  };

  if (order.length > 0) {
    provider.order = order;
  }

  const extraHeaders: Record<string, string> = {};
  const referer = settings.openRouterAppReferer.trim();
  const title = settings.openRouterAppTitle.trim();

  if (referer) {
    extraHeaders["HTTP-Referer"] = referer;
  }

  if (title) {
    extraHeaders["X-Title"] = title;
  }

  return {
    extraBody: {
      provider,
    },
    extraHeaders,
  };
}
