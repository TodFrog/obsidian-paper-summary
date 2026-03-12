import type { JsonCompletionClient } from "./paper-analysis";
import { analyzePaper, parsePaperAnalysisResponse } from "./paper-analysis";
import { paperAnalysisJsonSchema } from "./paper-analysis-json-schema";

const extraction = {
  sourcePath: "Papers/Attention.pdf",
  titleGuess: "Attention Is All You Need",
  pageCount: 15,
  includedPages: 8,
  rawText: "Attention Is All You Need\nAbstract\nThis paper introduces the Transformer.",
  truncated: true,
};

function createClient(response: string): JsonCompletionClient {
  return {
    complete: async () => ({
      content: response,
    }),
  };
}

describe("paper analysis", () => {
  it("exports a strict paper analysis json schema with stable property names", () => {
    expect(paperAnalysisJsonSchema.strict).toBe(true);
    expect(paperAnalysisJsonSchema.schema.required).toContain("oneSentenceSummary");
    expect(paperAnalysisJsonSchema.schema.properties.tags.type).toBe("array");
  });

  it("fails clearly when the API key is missing", async () => {
    await expect(
      analyzePaper(
        {
          apiKey: "",
          baseUrl: "",
          model: "gpt-4o-mini",
        },
        extraction,
        createClient("{}"),
      ),
    ).rejects.toMatchObject({
      code: "missing_api_key",
    });
  });

  it("parses a valid structured response from the completion client", async () => {
    const result = await analyzePaper(
      {
        apiKey: "test-key",
        baseUrl: "",
        model: "gpt-4o-mini",
      },
      extraction,
      createClient(`{
        "title": "Attention Is All You Need",
        "authors": ["Ashish Vaswani", "Noam Shazeer"],
        "year": "2017",
        "venue": "NeurIPS",
        "url": "https://arxiv.org/abs/1706.03762",
        "code": "https://github.com/tensorflow/tensor2tensor",
        "oneSentenceSummary": "Introduces the Transformer architecture for sequence modeling.",
        "keyContributions": ["Self-attention", "Parallel training", "State-of-the-art translation"],
        "problemStatement": "Recurrent sequence models are slow and hard to parallelize.",
        "proposedMethod": "Replace recurrence with stacked self-attention and feed-forward blocks.",
        "proposedMethodDetails": ["Encoder-decoder architecture", "Multi-head attention"],
        "datasetEnvironment": "WMT 2014 English-German and English-French translation.",
        "keyMetrics": "BLEU improvements over strong baselines.",
        "results": ["Improved translation quality", "Lower training cost"],
        "limitations": ["Requires large-scale training data"],
        "tags": ["paper", "transformers", "nlp"]
      }`),
    );

    expect(result.title).toBe("Attention Is All You Need");
    expect(result.authors).toEqual(["Ashish Vaswani", "Noam Shazeer"]);
    expect(result.keyContributions).toHaveLength(3);
    expect(result.tags).toEqual(["paper", "transformers", "nlp"]);
  });

  it("fails clearly when the response is not valid structured analysis JSON", async () => {
    await expect(
      analyzePaper(
        {
          apiKey: "test-key",
          baseUrl: "",
          model: "gpt-4o-mini",
        },
        extraction,
        createClient(`{"title":"Missing required fields"}`),
      ),
    ).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("parses markdown-wrapped JSON and normalizes OpenRouter-style loose field types", () => {
    const result = parsePaperAnalysisResponse(`\`\`\`json
{
  "title": "Attention Is All You Need",
  "authors": "Ashish Vaswani, Noam Shazeer",
  "year": 2017,
  "venue": null,
  "url": null,
  "code": null,
  "oneSentenceSummary": "Introduces the Transformer architecture for sequence modeling.",
  "keyContributions": "Self-attention replaces recurrence.",
  "problemStatement": "Recurrent models are slow and hard to parallelize.",
  "proposedMethod": "Use stacked self-attention and feed-forward blocks.",
  "proposedMethodDetails": "Encoder-decoder architecture.",
  "datasetEnvironment": null,
  "keyMetrics": null,
  "results": "Improved translation quality.",
  "limitations": null,
  "tags": "transformers, nlp"
}
\`\`\``);

    expect(result.authors).toEqual(["Ashish Vaswani", "Noam Shazeer"]);
    expect(result.year).toBe("2017");
    expect(result.venue).toBe("");
    expect(result.code).toBe("");
    expect(result.keyContributions).toEqual(["Self-attention replaces recurrence."]);
    expect(result.proposedMethodDetails).toEqual(["Encoder-decoder architecture."]);
    expect(result.results).toEqual(["Improved translation quality."]);
    expect(result.limitations).toEqual([]);
    expect(result.tags).toEqual(["transformers", "nlp"]);
  });

  it("includes exact validation failures and normalized content when required fields are missing", () => {
    expect(() =>
      parsePaperAnalysisResponse(`\`\`\`json
{
  "title": "Attention Is All You Need"
}
\`\`\``),
    ).toThrowError(/oneSentenceSummary/i);
  });

  it("wraps client request failures with a stable Paper Summary error", async () => {
    const client: JsonCompletionClient = {
      complete: async () => {
        throw new Error("network down");
      },
    };

    await expect(
      analyzePaper(
        {
          apiKey: "test-key",
          baseUrl: "",
          model: "gpt-4o-mini",
        },
        extraction,
        client,
      ),
    ).rejects.toMatchObject({
      code: "api_request_failed",
      message: "The remote analysis request failed: network down",
    });
  });

  it("parses validated JSON directly", () => {
    expect(
      parsePaperAnalysisResponse(`{
        "title": "Attention Is All You Need",
        "authors": [],
        "year": "",
        "venue": "",
        "url": "",
        "code": "",
        "oneSentenceSummary": "Summary",
        "keyContributions": ["A"],
        "problemStatement": "Problem",
        "proposedMethod": "Method",
        "proposedMethodDetails": [],
        "datasetEnvironment": "Dataset",
        "keyMetrics": "Metrics",
        "results": [],
        "limitations": [],
        "tags": []
      }`).title,
    ).toBe("Attention Is All You Need");
  });

  it("surfaces raw response, extracted content, and extraction text when schema validation fails", async () => {
    const client: JsonCompletionClient = {
      complete: async () => ({
        content: `{"title":"Missing required fields"}`,
        extractedContent: `{"title":"Missing required fields"}`,
        rawResponse: {
          id: "response-123",
        },
      }),
    };

    await expect(
      analyzePaper(
        {
          apiKey: "test-key",
          baseUrl: "https://openrouter.ai/api/v1",
          model: "openai/gpt-4o-mini",
        },
        extraction,
        client,
      ),
    ).rejects.toMatchObject({
      code: "invalid_response",
      details: {
        extractedContent: `{"title":"Missing required fields"}`,
        rawResponse: {
          id: "response-123",
        },
        extractionText: extraction.rawText,
      },
    });
  });
});
