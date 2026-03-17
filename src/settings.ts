import {
  getProviderMetadata,
  normalizeProvider,
  type PaperSummaryProvider,
} from "./provider-metadata";

export type StructuredOutputMode = "json_object" | "json_schema";
export type OutputLanguage = "english" | "korean" | "auto" | "custom";
export type TemplateMode = "built_in" | "custom";

const STRUCTURED_OUTPUT_MODES = ["json_object", "json_schema"] as const;
const OUTPUT_LANGUAGES = ["english", "korean", "auto", "custom"] as const;
const TEMPLATE_MODES = ["built_in", "custom"] as const;

export interface PaperSummarySettings {
  provider: PaperSummaryProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  structuredOutputMode: StructuredOutputMode;
  outputLanguage: OutputLanguage;
  customOutputLanguage: string;
  templateMode: TemplateMode;
  customTemplatePath: string;
  openRouterRequireParameters: boolean;
  openRouterAppReferer: string;
  openRouterAppTitle: string;
  openRouterProviderOrder: string;
  openRouterAllowFallbacks: boolean;
  outputFolder: string;
  paperNotesScope: string;
  maxPages: number;
  maxChars: number;
  openAfterCreate: boolean;
  paperTag: string;
  defaultStatus: string;
  relatedNotesLimit: number;
}

export const DEFAULT_SETTINGS: PaperSummarySettings = {
  provider: "openai",
  apiKey: "",
  baseUrl: "",
  model: "gpt-4o-mini",
  structuredOutputMode: "json_object",
  outputLanguage: "english",
  customOutputLanguage: "",
  templateMode: "built_in",
  customTemplatePath: "",
  openRouterRequireParameters: true,
  openRouterAppReferer: "",
  openRouterAppTitle: "Paper Summary",
  openRouterProviderOrder: "",
  openRouterAllowFallbacks: true,
  outputFolder: "Papers/Summaries",
  paperNotesScope: "Papers/Summaries",
  maxPages: 20,
  maxChars: 60000,
  openAfterCreate: true,
  paperTag: "paper",
  defaultStatus: "summarized",
  relatedNotesLimit: 5,
};

function isStructuredOutputMode(value: string): value is StructuredOutputMode {
  return (STRUCTURED_OUTPUT_MODES as readonly string[]).includes(value);
}

function isOutputLanguage(value: string): value is OutputLanguage {
  return (OUTPUT_LANGUAGES as readonly string[]).includes(value);
}

function isTemplateMode(value: string): value is TemplateMode {
  return (TEMPLATE_MODES as readonly string[]).includes(value);
}

export function normalizeStructuredOutputMode(
  value: unknown,
  fallback: StructuredOutputMode = DEFAULT_SETTINGS.structuredOutputMode,
): StructuredOutputMode {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return isStructuredOutputMode(normalized) ? normalized : fallback;
}

export function normalizeOutputLanguage(
  value: unknown,
  fallback: OutputLanguage = DEFAULT_SETTINGS.outputLanguage,
): OutputLanguage {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return isOutputLanguage(normalized) ? normalized : fallback;
}

export function normalizeTemplateMode(
  value: unknown,
  fallback: TemplateMode = DEFAULT_SETTINGS.templateMode,
): TemplateMode {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return isTemplateMode(normalized) ? normalized : fallback;
}

export function mergeSettings(
  loadedData?: Partial<PaperSummarySettings> | null,
): PaperSummarySettings {
  const provider = normalizeProvider(loadedData?.provider);
  const structuredOutputMode = normalizeStructuredOutputMode(loadedData?.structuredOutputMode);
  const outputLanguage = normalizeOutputLanguage(loadedData?.outputLanguage);
  const templateMode = normalizeTemplateMode(loadedData?.templateMode);
  const merged = {
    ...DEFAULT_SETTINGS,
    ...loadedData,
    provider,
    structuredOutputMode,
    outputLanguage,
    templateMode,
  };
  const providerMetadata = getProviderMetadata(provider);
  const hasSavedBaseUrl = typeof loadedData?.baseUrl === "string" && loadedData.baseUrl.trim().length > 0;
  const hasSavedModel = typeof loadedData?.model === "string" && loadedData.model.trim().length > 0;

  if (!hasSavedBaseUrl) {
    merged.baseUrl = providerMetadata.defaultBaseUrl;
  } else {
    merged.baseUrl = merged.baseUrl.trim();
  }

  if (hasSavedModel) {
    merged.model = merged.model.trim();
  } else if (providerMetadata.suggestedModel) {
    merged.model = providerMetadata.suggestedModel;
  }

  if (!loadedData || typeof loadedData.paperNotesScope !== "string" || !loadedData.paperNotesScope.trim()) {
    merged.paperNotesScope = merged.outputFolder;
  }

  return merged;
}
