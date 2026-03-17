export type PaperSummaryProvider =
  | "openai"
  | "openrouter"
  | "gemini"
  | "claude"
  | "ollama"
  | "others";

export interface ProviderMetadata {
  label: string;
  defaultBaseUrl: string;
  suggestedModel: string;
  baseUrlPlaceholder: string;
  baseUrlHelp: string;
  capabilityNote: string;
}

const PROVIDER_METADATA: Record<PaperSummaryProvider, ProviderMetadata> = {
  openai: {
    label: "OpenAI",
    defaultBaseUrl: "",
    suggestedModel: "gpt-4o-mini",
    baseUrlPlaceholder: "https://api.openai.com/v1",
    baseUrlHelp: "Leave blank to use the OpenAI SDK default endpoint.",
    capabilityNote: "Uses the standard OpenAI-style hosted API path.",
  },
  openrouter: {
    label: "OpenRouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    suggestedModel: "openai/gpt-4o-mini",
    baseUrlPlaceholder: "https://openrouter.ai/api/v1",
    baseUrlHelp: "Leave blank to use the OpenRouter default endpoint.",
    capabilityNote: "Keeps the existing OpenRouter request extras and routing options.",
  },
  gemini: {
    label: "Gemini",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    suggestedModel: "gemini-2.5-flash",
    baseUrlPlaceholder: "https://generativelanguage.googleapis.com/v1beta/openai/",
    baseUrlHelp: "Leave blank to use Google's OpenAI-compatible Gemini endpoint.",
    capabilityNote: "Uses the current OpenAI-compatible request path. Structured output remains best-effort under that compatibility layer.",
  },
  claude: {
    label: "Claude",
    defaultBaseUrl: "https://api.anthropic.com/v1/",
    suggestedModel: "claude-sonnet-4-20250514",
    baseUrlPlaceholder: "https://api.anthropic.com/v1/",
    baseUrlHelp: "Leave blank to use Anthropic's OpenAI-compatible endpoint.",
    capabilityNote: "Uses Anthropic's OpenAI compatibility layer. Anthropic ignores response_format there, so structured output is best-effort and may rely on JSON-text fallback.",
  },
  ollama: {
    label: "Ollama",
    defaultBaseUrl: "http://localhost:11434/v1",
    suggestedModel: "llama3.2",
    baseUrlPlaceholder: "http://localhost:11434/v1",
    baseUrlHelp: "Leave blank to use the default local Ollama OpenAI-compatible endpoint.",
    capabilityNote: "Uses the local OpenAI-compatible Ollama server. Structured output depends on the installed local model and runtime.",
  },
  others: {
    label: "Others",
    defaultBaseUrl: "",
    suggestedModel: "",
    baseUrlPlaceholder: "https://your-openai-compatible-endpoint/v1",
    baseUrlHelp: "Use this for a generic OpenAI-compatible endpoint.",
    capabilityNote: "Generic compatibility only. No provider-specific guarantees are assumed by the plugin.",
  },
};

export const OPENROUTER_BASE_URL = PROVIDER_METADATA.openrouter.defaultBaseUrl;

export interface ProviderSelectionState {
  provider: PaperSummaryProvider;
  baseUrl: string;
  model: string;
}

export interface ProviderSettingsVisibility {
  showApiKey: boolean;
  showBaseUrl: boolean;
  showModel: boolean;
  showStructuredOutputMode: boolean;
  showOpenRouterSettings: boolean;
}

function isPaperSummaryProvider(value: string): value is PaperSummaryProvider {
  return value in PROVIDER_METADATA;
}

export function normalizeProvider(value: unknown): PaperSummaryProvider {
  if (typeof value !== "string") {
    return "openai";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "custom") {
    return "others";
  }

  if (isPaperSummaryProvider(normalized)) {
    return normalized;
  }

  return "openai";
}

export function getProviderMetadata(provider: PaperSummaryProvider): ProviderMetadata {
  return PROVIDER_METADATA[provider];
}

export function getProviderSettingsVisibility(provider: PaperSummaryProvider): ProviderSettingsVisibility {
  return {
    showApiKey: provider !== "ollama",
    showBaseUrl: true,
    showModel: true,
    showStructuredOutputMode: true,
    showOpenRouterSettings: provider === "openrouter",
  };
}

function shouldReplaceProviderValue(currentValue: string, previousAutofillValue: string): boolean {
  const trimmedCurrent = currentValue.trim();
  if (!trimmedCurrent) {
    return true;
  }

  return Boolean(previousAutofillValue) && trimmedCurrent === previousAutofillValue;
}

export function applyProviderSelectionDefaults(
  current: ProviderSelectionState,
  nextProvider: PaperSummaryProvider,
): ProviderSelectionState {
  const previousProvider = normalizeProvider(current.provider);
  const previousMetadata = getProviderMetadata(previousProvider);
  const nextMetadata = getProviderMetadata(nextProvider);

  const nextBaseUrl = shouldReplaceProviderValue(current.baseUrl, previousMetadata.defaultBaseUrl)
    ? nextMetadata.defaultBaseUrl
    : current.baseUrl.trim();
  const nextModel = shouldReplaceProviderValue(current.model, previousMetadata.suggestedModel)
    ? nextMetadata.suggestedModel
    : current.model.trim();

  return {
    provider: nextProvider,
    baseUrl: nextBaseUrl,
    model: nextModel,
  };
}

export function applyProviderSelectionToSettings<T extends ProviderSelectionState>(
  current: T,
  nextProvider: PaperSummaryProvider,
): T {
  return {
    ...current,
    ...applyProviderSelectionDefaults(current, nextProvider),
  };
}
