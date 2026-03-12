import { buildPdfExtractionResult, guessPaperTitle, normalizePdfPageText } from "./pdf-text-shaping";

describe("pdf text shaping", () => {
  it("normalizes repeated whitespace while preserving paragraph breaks", () => {
    expect(
      normalizePdfPageText("  Transformer   Models \n\n  are   effective.\nA\tB  C  "),
    ).toBe("Transformer Models\n\nare effective.\nA B C");
  });

  it("guesses a paper title from the first meaningful multi-word line", () => {
    expect(
      guessPaperTitle(
        [
          "\nConference 2024\nAttention Is All You Need\nAshish Vaswani\nAbstract\nThis paper introduces...",
        ],
        "fallback-title",
      ),
    ).toBe("Attention Is All You Need");
  });

  it("truncates extracted PDF text deterministically by max pages and max chars", () => {
    const result = buildPdfExtractionResult({
      sourcePath: "Papers/Attention.pdf",
      fallbackTitle: "Attention",
      pageTexts: [
        "Attention Is All You Need\nAbstract\nThis paper introduces the Transformer.",
        "1 Introduction\nLonger body text goes here.",
        "5 Conclusion\nFuture work here.",
      ],
      options: {
        maxPages: 2,
        maxChars: 90,
      },
    });

    expect(result.sourcePath).toBe("Papers/Attention.pdf");
    expect(result.titleGuess).toBe("Attention Is All You Need");
    expect(result.pageCount).toBe(3);
    expect(result.includedPages).toBe(2);
    expect(result.truncated).toBe(true);
    expect(result.rawText).toContain("--- Page 1 ---");
    expect(result.rawText).not.toContain("--- Page 3 ---");
    expect(result.rawText.length).toBeLessThanOrEqual(90);
  });
});
