import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractPdfText,
  analyzePaper,
  createOpenAiJsonCompletionClient,
  suggestRelatedNoteLinks,
  createNoteInVault,
} = vi.hoisted(() => ({
  extractPdfText: vi.fn(),
  analyzePaper: vi.fn(),
  createOpenAiJsonCompletionClient: vi.fn(),
  suggestRelatedNoteLinks: vi.fn(),
  createNoteInVault: vi.fn(),
}));

vi.mock("../pdf/pdf-extractor", () => ({
  extractPdfText,
}));

vi.mock("../llm/paper-analysis", () => ({
  analyzePaper,
}));

vi.mock("../llm/openai-json-client", () => ({
  createOpenAiJsonCompletionClient,
}));

vi.mock("../related/obsidian-related-notes", () => ({
  suggestRelatedNoteLinks,
}));

vi.mock("../vault/obsidian-note-file", () => ({
  createNoteInVault,
}));

import { generatePaperSummary } from "./generate-paper-summary";

describe("generate paper summary", () => {
  beforeEach(() => {
    extractPdfText.mockReset();
    analyzePaper.mockReset();
    createOpenAiJsonCompletionClient.mockReset();
    suggestRelatedNoteLinks.mockReset();
    createNoteInVault.mockReset();
  });

  it("falls back to the built-in renderer, emits a concise notice, and still creates the note", async () => {
    extractPdfText.mockResolvedValue({
      sourcePath: "Papers/Attention.pdf",
      titleGuess: "Attention Is All You Need",
      pageCount: 15,
      includedPages: 8,
      rawText: "Attention Is All You Need\nAbstract\nSummary\nIntroduction",
      truncated: false,
    });
    analyzePaper.mockResolvedValue({
      title: "Attention Is All You Need",
      authors: ["Ashish Vaswani"],
      year: "2017",
      venue: "NeurIPS",
      url: "https://arxiv.org/abs/1706.03762",
      code: "",
      oneSentenceSummary: "Introduces the Transformer architecture for sequence modeling.",
      keyContributions: ["Self-attention"],
      problemStatement: "Recurrent sequence models are slow and hard to parallelize.",
      proposedMethod: "Replace recurrence with stacked self-attention and feed-forward blocks.",
      proposedMethodDetails: ["Encoder-decoder architecture"],
      datasetEnvironment: "WMT 2014 translation tasks.",
      keyMetrics: "BLEU improvements over strong baselines.",
      results: ["Improved translation quality"],
      limitations: ["Needs large-scale training data"],
      tags: ["transformers"],
    });
    createOpenAiJsonCompletionClient.mockReturnValue({});
    suggestRelatedNoteLinks.mockResolvedValue([]);
    createNoteInVault.mockImplementation(async (_vault, path: string, content: string) => ({
      path,
      content,
    }));

    const notices: string[] = [];

    const app = {
      vault: {
        readBinary: async () => new ArrayBuffer(8),
        getMarkdownFiles: () => [],
      },
      metadataCache: {},
      workspace: {
        getLeaf: () => ({
          openFile: async () => undefined,
        }),
      },
    };

    const result = await generatePaperSummary({
      app: app as never,
      file: {
        extension: "pdf",
        path: "Papers/Attention.pdf",
      } as never,
      settings: {
        provider: "openai",
        apiKey: "test-key",
        baseUrl: "",
        model: "gpt-4o-mini",
        structuredOutputMode: "json_object",
        outputLanguage: "english",
        customOutputLanguage: "",
        templateMode: "custom",
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
        openAfterCreate: false,
        paperTag: "paper",
        defaultStatus: "summarized",
        relatedNotesLimit: 5,
      },
      onNotice: (message) => {
        notices.push(message);
      },
    });

    expect(notices).toEqual([
      "Custom template unavailable. Used built-in default template.",
    ]);
    expect(suggestRelatedNoteLinks).toHaveBeenCalledWith(expect.objectContaining({
      scope: "Papers/Summaries",
    }));
    expect(createNoteInVault).toHaveBeenCalledTimes(1);
    expect(createNoteInVault.mock.calls[0][2]).toContain("# Attention Is All You Need");
    expect(createNoteInVault.mock.calls[0][2]).toContain("One-Sentence Summary");
    expect(result.noteTitle).toBe("Attention Is All You Need");
  });

  it("returns the actual created note path when a numeric suffix is used", async () => {
    extractPdfText.mockResolvedValue({
      sourcePath: "Papers/Attention.pdf",
      titleGuess: "Attention Is All You Need",
      pageCount: 15,
      includedPages: 8,
      rawText: "Attention Is All You Need\nAbstract\nSummary\nIntroduction",
      truncated: false,
    });
    analyzePaper.mockResolvedValue({
      title: "Attention Is All You Need",
      authors: ["Ashish Vaswani"],
      year: "2017",
      venue: "NeurIPS",
      url: "https://arxiv.org/abs/1706.03762",
      code: "",
      oneSentenceSummary: "Introduces the Transformer architecture for sequence modeling.",
      keyContributions: ["Self-attention"],
      problemStatement: "Recurrent sequence models are slow and hard to parallelize.",
      proposedMethod: "Replace recurrence with stacked self-attention and feed-forward blocks.",
      proposedMethodDetails: ["Encoder-decoder architecture"],
      datasetEnvironment: "WMT 2014 translation tasks.",
      keyMetrics: "BLEU improvements over strong baselines.",
      results: ["Improved translation quality"],
      limitations: ["Needs large-scale training data"],
      tags: ["transformers"],
    });
    createOpenAiJsonCompletionClient.mockReturnValue({});
    suggestRelatedNoteLinks.mockResolvedValue([]);
    createNoteInVault.mockResolvedValue({
      path: "Papers/Summaries/Attention Is All You Need (1).md",
    });

    const app = {
      vault: {
        readBinary: async () => new ArrayBuffer(8),
        getMarkdownFiles: () => [],
      },
      metadataCache: {},
      workspace: {
        getLeaf: () => ({
          openFile: async () => undefined,
        }),
      },
    };

    const result = await generatePaperSummary({
      app: app as never,
      file: {
        extension: "pdf",
        path: "Papers/Attention.pdf",
      } as never,
      settings: {
        provider: "openai",
        apiKey: "test-key",
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
        openAfterCreate: false,
        paperTag: "paper",
        defaultStatus: "summarized",
        relatedNotesLimit: 5,
      },
    });

    expect(result.notePath).toBe("Papers/Summaries/Attention Is All You Need (1).md");
  });
});
