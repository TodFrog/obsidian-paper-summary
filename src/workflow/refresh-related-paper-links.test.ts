import { describe, expect, it, vi } from "vitest";
import { refreshRelatedPaperLinks } from "./refresh-related-paper-links";

function builtInPaperNote(title: string, relatedLines: string[] = ["- [[Placeholder]]"]): string {
  return [
    "---",
    "tags:",
    "  - paper",
    "  - transformers",
    "authors:",
    "  - Ashish Vaswani",
    "year: 2017",
    "venue: NeurIPS",
    "---",
    `# ${title}`,
    "",
    "## One-Sentence Summary",
    "> Self-attention improves machine translation.",
    "",
    "## Key Contributions",
    "- Multi-head attention",
    "",
    "## Methodology & Architecture",
    "- **Problem Statement:** Recurrent models are hard to parallelize.",
    "- **Proposed Method:** Use stacked self-attention blocks.",
    "    - Encoder-decoder architecture",
    "",
    "## Results & Performance",
    "- **Dataset / Environment:** WMT 2014",
    "- **Key Metrics:** BLEU improvements",
    "- Better translation quality",
    "",
    "## Limitations & Future Work",
    "- Needs more compute",
    "",
    "## Related Notes",
    ...relatedLines,
    "",
    "## My Thoughts & Ideas (Research Connection)",
    "- **Connection to my research:** test",
    "- **Idea:** test",
    "",
  ].join("\n");
}

describe("refresh related paper links", () => {
  it("rewrites only the built-in Related Notes block for built-in paper summaries", async () => {
    const modify = vi.fn<(file: unknown, content: string) => Promise<void>>(async () => undefined);
    const activeContent = builtInPaperNote("Attention Is All You Need", ["- [[Old Link]]"]);

    const app = {
      vault: {
        cachedRead: async (file: { path: string }) => {
          if (file.path === "Papers/Summaries/Attention Is All You Need.md") {
            return activeContent;
          }

          return builtInPaperNote("Sequence Modeling with Attention");
        },
        getMarkdownFiles: () => [
          {
            path: "Papers/Summaries/Attention Is All You Need.md",
            basename: "Attention Is All You Need",
            extension: "md",
          },
          {
            path: "Papers/Summaries/Sequence Modeling.md",
            basename: "Sequence Modeling",
            extension: "md",
          },
        ],
        modify,
      },
      metadataCache: {
        getFileCache: (file: { path: string }) => ({
          frontmatter: file.path.includes("Sequence")
            ? {
                tags: ["paper", "nlp"],
                authors: ["Ashish Vaswani"],
                year: "2017",
                venue: "NeurIPS",
              }
            : {
                tags: ["paper", "transformers"],
                authors: ["Ashish Vaswani"],
                year: "2017",
                venue: "NeurIPS",
              },
        }),
      },
    };

    const result = await refreshRelatedPaperLinks({
      app: app as never,
      file: {
        path: "Papers/Summaries/Attention Is All You Need.md",
        basename: "Attention Is All You Need",
        extension: "md",
      } as never,
      settings: {
        outputFolder: "Papers/Summaries",
        paperNotesScope: "Papers/Summaries",
        paperTag: "paper",
        relatedNotesLimit: 5,
      } as never,
    });

    expect(result).toEqual({
      notePath: "Papers/Summaries/Attention Is All You Need.md",
      relatedCount: 1,
      updated: true,
    });
    expect(modify).toHaveBeenCalledTimes(1);
    const updatedContent = modify.mock.calls[0]?.[1];
    expect(updatedContent).toContain("## Related Notes\n- [[Papers/Summaries/Sequence Modeling|Sequence Modeling with Attention]]\n\n## My Thoughts & Ideas (Research Connection)");
    expect(updatedContent).toContain("- **Idea:** test");
  });

  it("does nothing and emits a concise notice for non-built-in notes", async () => {
    const notices: string[] = [];
    const modify = vi.fn<(file: unknown, content: string) => Promise<void>>(async () => undefined);

    const result = await refreshRelatedPaperLinks({
      app: {
        vault: {
          cachedRead: async () => "# Custom Summary\n\nThis note does not use the built-in paper-summary format.",
          getMarkdownFiles: () => [],
          modify,
        },
        metadataCache: {
          getFileCache: () => ({
            frontmatter: {
              tags: ["paper"],
            },
          }),
        },
      } as never,
      file: {
        path: "Papers/Summaries/Custom.md",
        basename: "Custom",
        extension: "md",
      } as never,
      settings: {
        outputFolder: "Papers/Summaries",
        paperNotesScope: "Papers/Summaries",
        paperTag: "paper",
        relatedNotesLimit: 5,
      } as never,
      onNotice: (message) => {
        notices.push(message);
      },
    });

    expect(result).toEqual({
      notePath: "Papers/Summaries/Custom.md",
      relatedCount: 0,
      updated: false,
    });
    expect(modify).not.toHaveBeenCalled();
    expect(notices).toEqual([
      "Refresh related paper links only works on built-in paper summary notes.",
    ]);
  });
});
