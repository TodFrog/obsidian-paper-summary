import { buildCompletionRequest, extractCompletionText } from "./openai-json-client";

describe("openai json client", () => {
  it("extracts text from string content", () => {
    expect(extractCompletionText("plain json")).toBe("plain json");
  });

  it("extracts text from structured content parts", () => {
    expect(
      extractCompletionText([
        { type: "text", text: "```json" },
        { type: "text", text: "{\"title\":\"Paper\"}" },
        { type: "text", text: "```" },
      ]),
    ).toBe("```json\n{\"title\":\"Paper\"}\n```");
  });

  it("adds OpenRouter headers and provider body when provider is openrouter", () => {
    const request = buildCompletionRequest({
      provider: "openrouter",
      structuredOutputMode: "json_object",
      model: "openai/gpt-4o-mini",
      systemPrompt: "system",
      userPrompt: "user",
      openRouterRequireParameters: true,
      openRouterProviderOrder: "openai,anthropic",
      openRouterAllowFallbacks: true,
      openRouterAppTitle: "Paper Summary",
      openRouterAppReferer: "https://example.com",
    });

    expect(request.body).toMatchObject({
      model: "openai/gpt-4o-mini",
      response_format: {
        type: "json_object",
      },
      provider: {
        require_parameters: true,
        order: ["openai", "anthropic"],
      },
    });
    expect(request.requestOptions).toMatchObject({
      headers: {
        "X-Title": "Paper Summary",
        "HTTP-Referer": "https://example.com",
      },
    });
  });

  it("uses json_schema when structured output mode is json_schema", () => {
    const request = buildCompletionRequest({
      provider: "openrouter",
      structuredOutputMode: "json_schema",
      model: "openai/gpt-4o-mini",
      systemPrompt: "system",
      userPrompt: "user",
      openRouterRequireParameters: true,
      openRouterProviderOrder: "",
      openRouterAllowFallbacks: true,
      openRouterAppTitle: "Paper Summary",
      openRouterAppReferer: "",
    });

    expect(request.body.response_format).toMatchObject({
      type: "json_schema",
    });
  });
});
