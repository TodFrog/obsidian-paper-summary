import { rankRelatedNotes } from "./related-notes";

describe("related notes", () => {
  it("prioritizes shared authors and tags for paper-note suggestions", () => {
    const results = rankRelatedNotes({
      current: {
        path: "Papers/Summaries/Attention Is All You Need.md",
        title: "Attention Is All You Need",
        tags: ["paper", "transformers", "nlp"],
        authors: ["Ashish Vaswani"],
        year: "2017",
      },
      candidates: [
        {
          path: "Papers/Summaries/Sequence Modeling.md",
          title: "Sequence Modeling",
          tags: ["paper", "nlp"],
          authors: ["Ashish Vaswani"],
          year: "2017",
          isPaperNote: true,
        },
        {
          path: "Papers/Summaries/Random Forests.md",
          title: "Random Forests",
          tags: ["paper", "ml"],
          authors: ["Leo Breiman"],
          year: "2001",
          isPaperNote: true,
        },
      ],
      limit: 5,
    });

    expect(results[0]?.path).toBe("Papers/Summaries/Sequence Modeling.md");
    expect(results[0]?.reasons).toContain("shared author: Ashish Vaswani");
    expect(results[0]?.reasons).toContain("shared tag: nlp");
  });

  it("filters out the current note and non-paper candidates", () => {
    const results = rankRelatedNotes({
      current: {
        path: "Papers/Summaries/Attention Is All You Need.md",
        title: "Attention Is All You Need",
        tags: ["paper", "transformers", "nlp"],
        authors: ["Ashish Vaswani"],
        year: "2017",
      },
      candidates: [
        {
          path: "Papers/Summaries/Attention Is All You Need.md",
          title: "Attention Is All You Need",
          tags: ["paper"],
          authors: ["Ashish Vaswani"],
          year: "2017",
          isPaperNote: true,
        },
        {
          path: "Notes/General/NLP.md",
          title: "NLP Overview",
          tags: ["nlp"],
          authors: [],
          year: "",
          isPaperNote: false,
        },
      ],
      limit: 5,
    });

    expect(results).toEqual([]);
  });

  it("limits the number of suggestions and sorts by score descending", () => {
    const results = rankRelatedNotes({
      current: {
        path: "Papers/Summaries/Attention.md",
        title: "Attention Is All You Need",
        tags: ["paper", "transformers", "nlp"],
        authors: ["Ashish Vaswani"],
        year: "2017",
      },
      candidates: [
        {
          path: "Papers/Summaries/A.md",
          title: "Transformer Models",
          tags: ["paper", "transformers", "nlp"],
          authors: ["Ashish Vaswani"],
          year: "2018",
          isPaperNote: true,
        },
        {
          path: "Papers/Summaries/B.md",
          title: "Translation Models",
          tags: ["paper", "nlp"],
          authors: [],
          year: "2017",
          isPaperNote: true,
        },
        {
          path: "Papers/Summaries/C.md",
          title: "Vision Transformers",
          tags: ["paper", "transformers"],
          authors: [],
          year: "2020",
          isPaperNote: true,
        },
      ],
      limit: 2,
    });

    expect(results).toHaveLength(2);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });
});
