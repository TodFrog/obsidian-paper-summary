import { describe, expect, it, vi } from "vitest";
import {
  createRelatedPaperCandidate,
  suggestRelatedNoteLinks,
  suggestRelatedPaperNotes,
} from "./obsidian-related-notes";

function builtInPaperNote(title: string, sections?: Partial<{
  summary: string;
  contributions: string[];
  method: string;
  results: string[];
  limitations: string[];
  related: string[];
}>): string {
  return [
    "---",
    "tags:",
    "  - paper",
    "authors:",
    "  - Ashish Vaswani",
    "year: 2017",
    "venue: NeurIPS",
    "---",
    `# ${title}`,
    "",
    "## One-Sentence Summary",
    `> ${sections?.summary ?? "Self-attention improves translation models."}`,
    "",
    "## Key Contributions",
    ...(sections?.contributions ?? ["- Multi-head attention", "- Parallel sequence modeling"]),
    "",
    "## Methodology & Architecture",
    `- **Problem Statement:** Recurrent models are hard to parallelize.`,
    `- **Proposed Method:** ${sections?.method ?? "Use stacked self-attention blocks for machine translation."}`,
    "    - Encoder-decoder architecture",
    "",
    "## Results & Performance",
    "- **Dataset / Environment:** WMT 2014",
    "- **Key Metrics:** BLEU improvements",
    ...(sections?.results ?? ["- Better translation quality than recurrent baselines"]),
    "",
    "## Limitations & Future Work",
    ...(sections?.limitations ?? ["- Needs substantial training compute"]),
    "",
    "## Related Notes",
    ...(sections?.related ?? ["- [[Older Transformer Note]]"]),
    "",
  ].join("\n");
}

describe("obsidian related notes", () => {
  it("scans only the configured scope, includes built-in paper notes, and returns ranked suggestions", async () => {
    const cachedRead = vi.fn(async (file: { path: string }) => {
      if (file.path === "Papers/Summaries/Sequence Modeling.md") {
        return builtInPaperNote("Sequence Modeling with Attention", {
          summary: "Attention improves translation quality.",
          contributions: ["- Shared attention mechanisms"],
          method: "Use self-attention for translation.",
          results: ["- Higher BLEU on WMT"],
        });
      }

      if (file.path === "Papers/Summaries/Vision Note.md") {
        return builtInPaperNote("Vision Transformers", {
          summary: "Apply transformers to images.",
          contributions: ["- Patch embeddings"],
          method: "Use transformer encoders for vision.",
          results: ["- Strong ImageNet results"],
          limitations: ["- Requires more pretraining"],
        });
      }

      throw new Error(`Unexpected read for ${file.path}`);
    });

    const metadataCache = {
      getFileCache: (file: { path: string }) => {
        const frontmatterMap: Record<string, Record<string, unknown>> = {
          "Papers/Summaries/Sequence Modeling.md": {
            tags: ["paper", "nlp", "transformers"],
            authors: ["Ashish Vaswani"],
            year: "2017",
            venue: "NeurIPS",
          },
          "Papers/Summaries/Vision Note.md": {
            tags: ["paper", "vision"],
            authors: ["Alexey Dosovitskiy"],
            year: "2021",
            venue: "ICLR",
          },
          "Archive/Outside Scope.md": {
            tags: ["paper", "nlp"],
            authors: ["Ashish Vaswani"],
            year: "2017",
            venue: "NeurIPS",
          },
        };

        return {
          frontmatter: frontmatterMap[file.path],
        };
      },
    };

    const files = [
      {
        path: "Papers/Summaries/Sequence Modeling.md",
        basename: "Sequence Modeling",
        extension: "md",
      },
      {
        path: "Papers/Summaries/Vision Note.md",
        basename: "Vision Note",
        extension: "md",
      },
      {
        path: "Archive/Outside Scope.md",
        basename: "Outside Scope",
        extension: "md",
      },
    ];

    const suggestions = await suggestRelatedPaperNotes({
      current: {
        path: "Papers/Summaries/Attention Is All You Need.md",
        title: "Attention Is All You Need",
        tags: ["paper", "transformers", "nlp"],
        authors: ["Ashish Vaswani"],
        year: "2017",
        venue: "NeurIPS",
        keywordTerms: ["attention", "translation", "bleu"],
      },
      files: files as never[],
      vault: {
        cachedRead,
      } as never,
      metadataCache: metadataCache as never,
      paperTag: "paper",
      scope: "Papers/Summaries",
      limit: 5,
    });

    expect(suggestions.map((suggestion) => suggestion.title)).toEqual([
      "Sequence Modeling with Attention",
    ]);
    expect(suggestions[0].reasons).toEqual(expect.arrayContaining([
      "shared author: Ashish Vaswani",
      "shared venue: NeurIPS",
      "same year: 2017",
      "shared tag: nlp",
      "shared tag: transformers",
      "shared paper terms: attention, translation, bleu",
    ]));
    expect(cachedRead).toHaveBeenCalledTimes(2);
    expect(cachedRead).not.toHaveBeenCalledWith(expect.objectContaining({
      path: "Archive/Outside Scope.md",
    }));
  });

  it("strips built-in section labels from keyword extraction", () => {
    const candidate = createRelatedPaperCandidate({
      file: {
        path: "Papers/Summaries/Sequence Modeling.md",
        basename: "Sequence Modeling",
      },
      frontmatter: {
        tags: ["paper", "nlp"],
        authors: ["Ashish Vaswani"],
        year: "2017",
        venue: "NeurIPS",
      },
      content: builtInPaperNote("Sequence Modeling with Attention"),
      paperTag: "paper",
    });

    expect(candidate.keywordTerms).not.toContain("problem");
    expect(candidate.keywordTerms).not.toContain("statement");
    expect(candidate.keywordTerms).not.toContain("dataset");
    expect(candidate.keywordTerms).not.toContain("environment");
    expect(candidate.keywordTerms).not.toContain("key");
    expect(candidate.keywordTerms).not.toContain("metrics");
  });

  it("returns wiki links only for the scored suggestions", async () => {
    const links = await suggestRelatedNoteLinks({
      current: {
        path: "Papers/Summaries/Attention Is All You Need.md",
        title: "Attention Is All You Need",
        tags: ["paper", "transformers", "nlp"],
        authors: ["Ashish Vaswani"],
        year: "2017",
        venue: "NeurIPS",
        keywordTerms: ["attention", "translation"],
      },
      files: [
        {
          path: "Papers/Summaries/Sequence Modeling.md",
          basename: "Sequence Modeling",
          extension: "md",
        },
      ] as never[],
      vault: {
        cachedRead: async () => builtInPaperNote("Sequence Modeling with Attention"),
      } as never,
      metadataCache: {
        getFileCache: () => ({
          frontmatter: {
            tags: ["paper", "nlp"],
            authors: ["Ashish Vaswani"],
            year: "2017",
            venue: "NeurIPS",
          },
        }),
      } as never,
      paperTag: "paper",
      scope: "Papers/Summaries",
      limit: 5,
    });

    expect(links).toEqual([
      "[[Papers/Summaries/Sequence Modeling|Sequence Modeling with Attention]]",
    ]);
  });

  it("uses a path-based wiki link when the visible title does not match the sanitized file name", async () => {
    const links = await suggestRelatedNoteLinks({
      current: {
        path: "Papers/Summaries/Transformer Survey.md",
        title: "Transformer Survey",
        tags: ["paper", "transformers"],
        authors: ["Researcher A"],
        year: "2024",
        venue: "NeurIPS",
        keywordTerms: ["transformer", "survey"],
      },
      files: [
        {
          path: "Papers/Summaries/Attention_ Is All You Need.md",
          basename: "Attention_ Is All You Need",
          extension: "md",
        },
      ] as never[],
      vault: {
        cachedRead: async () => builtInPaperNote("Attention: Is All You Need", {
          summary: "Transformer self-attention improves translation.",
          contributions: ["- Self-attention for translation"],
          method: "Use stacked self-attention blocks.",
          results: ["- Better BLEU"],
        }),
      } as never,
      metadataCache: {
        getFileCache: () => ({
          frontmatter: {
            tags: ["paper", "transformers"],
            authors: ["Ashish Vaswani"],
            year: "2017",
            venue: "NeurIPS",
          },
        }),
      } as never,
      paperTag: "paper",
      scope: "Papers/Summaries",
      limit: 5,
    });

    expect(links).toEqual([
      "[[Papers/Summaries/Attention_ Is All You Need|Attention: Is All You Need]]",
    ]);
  });
});
