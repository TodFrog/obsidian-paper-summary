import { buildPaperNoteModel, buildPaperNotePath } from "./paper-note-builder";

describe("paper note builder", () => {
  it("maps extraction and analysis into the Paper Ex view model", () => {
    const model = buildPaperNoteModel({
      extraction: {
        sourcePath: "Papers/Attention.pdf",
        titleGuess: "Attention Is All You Need",
        pageCount: 15,
        includedPages: 8,
        rawText: "Abstract...",
        truncated: true,
      },
      analysis: {
        title: "Attention Is All You Need",
        authors: ["Ashish Vaswani", "Noam Shazeer"],
        year: "2017",
        venue: "NeurIPS",
        url: "https://arxiv.org/abs/1706.03762",
        code: "https://github.com/tensorflow/tensor2tensor",
        oneSentenceSummary: "Introduces the Transformer architecture for sequence modeling.",
        keyContributions: ["Self-attention", "Parallel training"],
        problemStatement: "Recurrent sequence models are slow and hard to parallelize.",
        proposedMethod: "Replace recurrence with stacked self-attention and feed-forward blocks.",
        proposedMethodDetails: ["Encoder-decoder architecture", "Multi-head attention"],
        datasetEnvironment: "WMT 2014 translation tasks.",
        keyMetrics: "BLEU improvements over strong baselines.",
        results: ["Improved translation quality", "Lower training cost"],
        limitations: ["Needs large-scale training data"],
        tags: ["paper", "transformers", "nlp"],
      },
      settings: {
        paperTag: "paper",
        defaultStatus: "summarized",
      },
      created: "2026-03-12",
      relatedNotes: ["[[Transformer Notes]]", "[[Sequence Modeling]]"],
    });

    expect(model.frontmatter.tags).toEqual(["paper", "transformers", "nlp"]);
    expect(model.frontmatter.status).toBe("summarized");
    expect(model.body.title).toBe("Attention Is All You Need");
    expect(model.body.relatedNotes).toEqual(["[[Transformer Notes]]", "[[Sequence Modeling]]"]);
    expect(model.body.researchConnection).toContain("current project or research");
    expect(model.body.idea).toContain("01_Inbox_and_Ideas");
  });

  it("builds a safe markdown note path inside the configured output folder", () => {
    expect(
      buildPaperNotePath("Papers/Summaries", 'Attention: "Need"?'),
    ).toBe("Papers/Summaries/Attention_ _Need__.md");
  });

  it("falls back to an untitled filename when sanitization removes the title", () => {
    expect(buildPaperNotePath("Papers/Summaries", '   <>:"/\\|?*   ')).toBe(
      "Papers/Summaries/Untitled Paper.md",
    );
  });
});
