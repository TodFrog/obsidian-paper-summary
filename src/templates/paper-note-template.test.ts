import { buildPaperNoteModel } from "../notes/paper-note-builder";
import { renderPaperNote } from "../renderer/paper-note-renderer";
import {
  buildPaperTemplateContext,
  renderConfiguredPaperNote,
  renderCustomTemplate,
} from "./paper-note-template";

const extraction = {
  sourcePath: "Papers/Attention.pdf",
  titleGuess: "Attention Is All You Need",
  pageCount: 15,
  includedPages: 8,
  rawText: [
    "Attention Is All You Need",
    "Abstract",
    "이 논문은 트랜스포머 아키텍처를 제안한다.",
    "병렬 학습과 자기어텐션으로 성능을 높인다.",
    "Introduction",
    "DOI: 10.1145/1234567.8901234",
  ].join("\n"),
  truncated: false,
};

const analysis = {
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
  tags: ["transformers", "deep learning"],
};

function createModel(relatedNotes: string[] = ["[[Transformer Notes]]"]) {
  return buildPaperNoteModel({
    extraction,
    analysis,
    settings: {
      paperTag: "paper",
      defaultStatus: "summarized",
    },
    created: "2026-03-13",
    relatedNotes,
  });
}

describe("paper note template rendering", () => {
  it("renders the built-in template unchanged when built_in mode is selected", async () => {
    const model = createModel();

    const rendered = await renderConfiguredPaperNote({
      vault: {} as never,
      settings: {
        templateMode: "built_in",
        customTemplatePath: "",
      },
      extraction,
      analysis,
      model,
      relatedNotes: ["[[Transformer Notes]]"],
    });

    expect(rendered.content).toBe(renderPaperNote(model));
    expect(rendered.templateSource).toBe("built_in");
    expect(rendered.fallbackReason).toBeUndefined();
  });

  it("renders a custom template with deterministic placeholder formatting and UTF-8 content", () => {
    const context = buildPaperTemplateContext({
      extraction,
      analysis,
      model: createModel(),
      relatedNotes: ["[[Transformer Notes]]"],
    });

    const rendered = renderCustomTemplate(
      [
        "# {{ title }}",
        "authors: {{ authors }}",
        "venue: {{ venue }} ({{ year }})",
        "doi: {{ doi }}",
        "arxiv: {{ arxiv }}",
        "url: {{ url }}",
        "abstract: {{ abstract }}",
        "extracted: {{ extracted_summary }}",
        "ai: {{ ai_summary }}",
        "contributions:",
        "{{ key_contributions }}",
        "methodology:",
        "{{ methodology }}",
        "results:",
        "{{ results }}",
        "limitations:",
        "{{ limitations }}",
        "tags:",
        "{{ tags }}",
        "related:",
        "{{ related_notes }}",
      ].join("\n"),
      context,
    );

    expect(rendered).toContain("# Attention Is All You Need");
    expect(rendered).toContain("authors: Ashish Vaswani, Noam Shazeer");
    expect(rendered).toContain("venue: NeurIPS (2017)");
    expect(rendered).toContain("doi: 10.1145/1234567.8901234");
    expect(rendered).toContain("arxiv: 1706.03762");
    expect(rendered).toContain("abstract: 이 논문은 트랜스포머 아키텍처를 제안한다. 병렬 학습과 자기어텐션으로 성능을 높인다.");
    expect(rendered).toContain("ai: Introduces the Transformer architecture for sequence modeling.");
    expect(rendered).toContain("- Self-attention");
    expect(rendered).toContain("- Parallel training");
    expect(rendered).toContain("- **Problem Statement:** Recurrent sequence models are slow and hard to parallelize.");
    expect(rendered).toContain("- **Proposed Method:** Replace recurrence with stacked self-attention and feed-forward blocks.");
    expect(rendered).toContain("    - Encoder-decoder architecture");
    expect(rendered).toContain("- Improved translation quality");
    expect(rendered).toContain("- Needs large-scale training data");
    expect(rendered).toContain("- paper");
    expect(rendered).toContain("- transformers");
    expect(rendered).toContain("- deep learning");
    expect(rendered).toContain("- [[Transformer Notes]]");
  });

  it("renders empty list and block placeholders as empty strings", () => {
    const emptyAnalysis = {
      ...analysis,
      keyContributions: [],
      problemStatement: "",
      proposedMethod: "",
      proposedMethodDetails: [],
      results: [],
      limitations: [],
      tags: [],
    };

    const model = buildPaperNoteModel({
      extraction,
      analysis: emptyAnalysis,
      settings: {
        paperTag: "paper",
        defaultStatus: "summarized",
      },
      created: "2026-03-13",
      relatedNotes: [],
    });
    model.frontmatter.tags = [];

    const context = buildPaperTemplateContext({
      extraction: {
        ...extraction,
        rawText: "Title\nIntroduction\nNo abstract here.",
      },
      analysis: emptyAnalysis,
      model,
      relatedNotes: [],
    });

    expect(
      renderCustomTemplate(
        "tags={{tags}}\nresults={{results}}\nlimitations={{limitations}}\nmethod={{methodology}}\nrelated={{related_notes}}",
        context,
      ),
    ).toBe("tags=\nresults=\nlimitations=\nmethod=\nrelated=");
  });

  it("rejects unknown placeholders", () => {
    const context = buildPaperTemplateContext({
      extraction,
      analysis,
      model: createModel(),
      relatedNotes: ["[[Transformer Notes]]"],
    });

    expect(() => renderCustomTemplate("{{ unknown_field }}", context)).toThrow(/Unknown placeholder/i);
  });

  it("rejects malformed placeholders", () => {
    const context = buildPaperTemplateContext({
      extraction,
      analysis,
      model: createModel(),
      relatedNotes: ["[[Transformer Notes]]"],
    });

    expect(() => renderCustomTemplate("{{ title", context)).toThrow(/Malformed placeholder/i);
    expect(() => renderCustomTemplate("title }}", context)).toThrow(/Malformed placeholder/i);
  });

  it("falls back when the custom template path is missing, non-markdown, empty, unreadable, or invalid", async () => {
    const model = createModel();

    await expect(
      renderConfiguredPaperNote({
        vault: {} as never,
        settings: {
          templateMode: "custom",
          customTemplatePath: "",
        },
        extraction,
        analysis,
        model,
        relatedNotes: ["[[Transformer Notes]]"],
      }),
    ).resolves.toMatchObject({
      templateSource: "built_in",
      fallbackReason: "missing_template_path",
      content: renderPaperNote(model),
    });

    const baseVault = {
      getAbstractFileByPath: (path: string) => ({ path, extension: path.split(".").pop() }),
      cachedRead: async () => "{{ title }}",
    };

    await expect(
      renderConfiguredPaperNote({
        vault: baseVault as never,
        settings: {
          templateMode: "custom",
          customTemplatePath: "Templates/paper.txt",
        },
        extraction,
        analysis,
        model,
        relatedNotes: ["[[Transformer Notes]]"],
      }),
    ).resolves.toMatchObject({
      templateSource: "built_in",
      fallbackReason: "template_not_markdown",
    });

    await expect(
      renderConfiguredPaperNote({
        vault: {
          getAbstractFileByPath: () => null,
        } as never,
        settings: {
          templateMode: "custom",
          customTemplatePath: "Templates/paper.md",
        },
        extraction,
        analysis,
        model,
        relatedNotes: ["[[Transformer Notes]]"],
      }),
    ).resolves.toMatchObject({
      templateSource: "built_in",
      fallbackReason: "template_not_found",
    });

    await expect(
      renderConfiguredPaperNote({
        vault: {
          getAbstractFileByPath: () => ({ path: "Templates/paper.md", extension: "md" }),
          cachedRead: async () => "   ",
        } as never,
        settings: {
          templateMode: "custom",
          customTemplatePath: "Templates/paper.md",
        },
        extraction,
        analysis,
        model,
        relatedNotes: ["[[Transformer Notes]]"],
      }),
    ).resolves.toMatchObject({
      templateSource: "built_in",
      fallbackReason: "template_empty",
    });

    await expect(
      renderConfiguredPaperNote({
        vault: {
          getAbstractFileByPath: () => ({ path: "Templates/paper.md", extension: "md" }),
          cachedRead: async () => {
            throw new Error("read failed");
          },
        } as never,
        settings: {
          templateMode: "custom",
          customTemplatePath: "Templates/paper.md",
        },
        extraction,
        analysis,
        model,
        relatedNotes: ["[[Transformer Notes]]"],
      }),
    ).resolves.toMatchObject({
      templateSource: "built_in",
      fallbackReason: "template_unreadable",
    });

    await expect(
      renderConfiguredPaperNote({
        vault: {
          getAbstractFileByPath: () => ({ path: "Templates/paper.md", extension: "md" }),
          cachedRead: async () => "{{ unsupported }}",
        } as never,
        settings: {
          templateMode: "custom",
          customTemplatePath: "Templates/paper.md",
        },
        extraction,
        analysis,
        model,
        relatedNotes: ["[[Transformer Notes]]"],
      }),
    ).resolves.toMatchObject({
      templateSource: "built_in",
      fallbackReason: "template_invalid",
    });
  });
});
