import type { JsonCompletionClient } from "./paper-analysis";
import { analyzePaper, buildPaperAnalysisPrompts, parsePaperAnalysisResponse } from "./paper-analysis";
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

  it("builds English output instructions by default", () => {
    const prompts = buildPaperAnalysisPrompts(
      extraction,
      {
        outputLanguage: "english",
        customOutputLanguage: "",
      } as never,
    );

    expect(prompts.systemPrompt).toContain("Write all summary prose fields in English.");
    expect(prompts.systemPrompt).toContain("Keep the paper title in its original language.");
    expect(prompts.systemPrompt).toContain("Tags must stay English lowercase snake_case.");
  });

  it("builds Korean and auto language instructions with the expected semantics", () => {
    const koreanPrompts = buildPaperAnalysisPrompts(
      extraction,
      {
        outputLanguage: "korean",
        customOutputLanguage: "",
      } as never,
    );
    const autoPrompts = buildPaperAnalysisPrompts(
      extraction,
      {
        outputLanguage: "auto",
        customOutputLanguage: "",
      } as never,
    );

    expect(koreanPrompts.systemPrompt).toContain("Write all summary prose fields in Korean.");
    expect(autoPrompts.systemPrompt).toContain("Use the paper's dominant language for summary prose fields.");
    expect(autoPrompts.systemPrompt).toContain("If the dominant language is unclear, fall back to English.");
  });

  it("builds custom language instructions and rejects blank custom language values", async () => {
    const prompts = buildPaperAnalysisPrompts(
      extraction,
      {
        outputLanguage: "custom",
        customOutputLanguage: "Japanese",
      } as never,
    );

    expect(prompts.systemPrompt).toContain("Write all summary prose fields in Japanese.");

    const client: JsonCompletionClient = {
      complete: async () => {
        throw new Error("should not call remote model");
      },
    };

    await expect(
      analyzePaper(
        {
          apiKey: "test-key",
          baseUrl: "",
          model: "gpt-4o-mini",
          outputLanguage: "custom",
          customOutputLanguage: "   ",
        } as never,
        extraction,
        client,
      ),
    ).rejects.toMatchObject({
      code: "invalid_input",
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

  it("normalizes alias keys, snake_case fields, and object-wrapped text before validation", () => {
    const result = parsePaperAnalysisResponse(`Here is the extracted paper summary:

\`\`\`json
{
  "paper_title": "Attention Is All You Need",
  "authors": [{ "text": "Ashish Vaswani" }, "Noam Shazeer"],
  "year": 2017,
  "summary": { "text": "Introduces the Transformer architecture for sequence modeling." },
  "contributions": ["Self-attention", { "content": "Parallel training" }],
  "problem_statement": "Recurrent models are slow and hard to parallelize.",
  "method": { "content": "Use stacked self-attention and feed-forward blocks." },
  "method_details": [{ "text": "Encoder-decoder architecture" }],
  "dataset_environment": { "text": "WMT 2014 English-German and English-French translation." },
  "metrics": ["BLEU improvements over strong baselines."],
  "results": { "items": ["Improved translation quality"] },
  "limitations": null,
  "tags": { "items": ["transformers", "graph neural networks"] }
}
\`\`\`

Thanks!`);

    expect(result.title).toBe("Attention Is All You Need");
    expect(result.authors).toEqual(["Ashish Vaswani", "Noam Shazeer"]);
    expect(result.year).toBe("2017");
    expect(result.oneSentenceSummary).toBe("Introduces the Transformer architecture for sequence modeling.");
    expect(result.keyContributions).toEqual(["Self-attention", "Parallel training"]);
    expect(result.problemStatement).toBe("Recurrent models are slow and hard to parallelize.");
    expect(result.proposedMethod).toBe("Use stacked self-attention and feed-forward blocks.");
    expect(result.proposedMethodDetails).toEqual(["Encoder-decoder architecture"]);
    expect(result.datasetEnvironment).toBe("WMT 2014 English-German and English-French translation.");
    expect(result.keyMetrics).toBe("BLEU improvements over strong baselines.");
    expect(result.results).toEqual(["Improved translation quality"]);
    expect(result.limitations).toEqual([]);
    expect(result.tags).toEqual(["transformers", "graph_neural_networks"]);
  });

  it("keeps the synonym map conservative for semantically broader fields", () => {
    const result = parsePaperAnalysisResponse(`{
      "title": "Attention Is All You Need",
      "oneSentenceSummary": "Summary",
      "problem": "Do not map this ambiguous alias.",
      "tags": ["sequence modeling"]
    }`);

    expect(result.problemStatement).toBe("");
    expect(result.tags).toEqual(["sequence_modeling"]);
  });

  it("includes exact validation failures and normalized content when required fields are missing", () => {
    let thrown: unknown;
    try {
      parsePaperAnalysisResponse(`\`\`\`json
{
  "title": "Attention Is All You Need"
}
\`\`\``);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      message: "The remote analysis response did not match the expected schema.",
    });
    expect((thrown as { details?: { validationIssues?: string[] } }).details?.validationIssues).toEqual(
      expect.arrayContaining([expect.stringMatching(/oneSentenceSummary/i)]),
    );
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

  it("surfaces truncated developer diagnostics without persisting full raw payloads by default", async () => {
    const client: JsonCompletionClient = {
      complete: async () => ({
        content: `{"title":"Missing required fields"}`,
        extractedContent: `{"title":"Missing required fields","debug":"${"x".repeat(400)}"}`,
        rawResponse: {
          id: "response-123",
          model: "openrouter/test-model",
          choices: [
            {
              message: {
                content: `{"title":"Missing required fields","debug":"${"y".repeat(400)}"}`,
              },
            },
          ],
        },
      }),
    };

    let thrown: unknown;
    try {
      await analyzePaper(
        {
          apiKey: "test-key",
          baseUrl: "https://openrouter.ai/api/v1",
          model: "openai/gpt-4o-mini",
        },
        extraction,
        client,
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      code: "invalid_response",
    });

    const details = (thrown as { details?: Record<string, unknown> }).details ?? {};
    expect(details.rawResponse).toBeUndefined();
    expect(details.extractedContent).toBeUndefined();
    expect(details.rawContent).toBeUndefined();
    expect(details.responseSummary).toMatchObject({
      id: "response-123",
      model: "openrouter/test-model",
    });
    expect(details.extractedPreview).toEqual(expect.stringContaining("Missing required fields"));
    expect(String(details.extractedPreview).length).toBeLessThan(260);
    expect(details.extractionText).toBe(extraction.rawText);
  });

  it("uses candidate fallbacks when message content is empty and includes ladder diagnostics", async () => {
    const client: JsonCompletionClient = {
      complete: async () =>
        ({
          content: "",
          candidates: [
            {
              source: "message.tool_calls[0].function.arguments",
              content: `{"title":"Missing required fields"}`,
            },
          ],
          rawResponse: {
            id: "response-456",
          },
          finishReason: "stop",
        }) as never,
    };

    await expect(
      analyzePaper(
        {
          apiKey: "test-key",
          baseUrl: "https://openrouter.ai/api/v1",
          model: "moonshotai/kimi-k2.5",
          provider: "openrouter",
          structuredOutputMode: "json_object",
        } as never,
        extraction,
        client,
      ),
    ).rejects.toMatchObject({
      code: "invalid_response",
      details: {
        provider: "openrouter",
        requestMode: "json_object",
        stage: "schema_validation",
        candidateCount: 1,
        candidateSource: "message.tool_calls[0].function.arguments",
        finishReason: "stop",
        responseSummary: {
          id: "response-456",
        },
      },
    });
  });
});
