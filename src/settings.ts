import {
  getProviderMetadata,
  normalizeProvider,
  type PaperSummaryProvider,
} from "./provider-metadata";

export type StructuredOutputMode = "json_object" | "json_schema";
export type OutputLanguage = "english" | "korean" | "auto" | "custom";
export type TemplateMode = "built_in" | "custom";

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

export function mergeSettings(
  loadedData?: Partial<PaperSummarySettings> | null,
): PaperSummarySettings {
  const provider = normalizeProvider(loadedData?.provider);
  const merged = {
    ...DEFAULT_SETTINGS,
    ...loadedData,
    provider,
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
