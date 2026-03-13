export type PaperSummaryProvider = "openai" | "openrouter" | "custom";
export type StructuredOutputMode = "json_object" | "json_schema";
export type OutputLanguage = "english" | "korean" | "auto" | "custom";
export type TemplateMode = "built_in" | "custom";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

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
  const merged = {
    ...DEFAULT_SETTINGS,
    ...loadedData,
  };

  if (merged.provider === "openrouter" && !merged.baseUrl.trim()) {
    merged.baseUrl = OPENROUTER_BASE_URL;
  }

  return merged;
}
