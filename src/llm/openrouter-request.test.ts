import { buildOpenRouterRequestOptions } from "./openrouter-request";

describe("openrouter request options", () => {
  it("builds OpenRouter provider settings with require_parameters enabled", () => {
    expect(
      buildOpenRouterRequestOptions({
        openRouterRequireParameters: true,
        openRouterProviderOrder: "openai,anthropic",
        openRouterAllowFallbacks: true,
        openRouterAppTitle: "Paper Summary",
        openRouterAppReferer: "https://example.com",
      }),
    ).toEqual({
      extraBody: {
        provider: {
          require_parameters: true,
          order: ["openai", "anthropic"],
          allow_fallbacks: true,
        },
      },
      extraHeaders: {
        "HTTP-Referer": "https://example.com",
        "X-Title": "Paper Summary",
      },
    });
  });
});
