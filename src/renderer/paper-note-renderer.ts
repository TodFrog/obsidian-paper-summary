import type { PaperNoteViewModel, PaperTemplateSeed } from "../contracts";

function renderYamlList(key: string, values: string[], emptyStyle: "blank" | "inline" = "blank"): string[] {
  if (values.length === 0) {
    return [emptyStyle === "inline" ? `${key}: []` : `${key}:`];
  }

  return [
    `${key}:`,
    ...values.map((value) => `  - ${value}`),
  ];
}

function renderBulletLines(values: string[]): string[] {
  if (values.length === 0) {
    return ["- "];
  }

  return values.map((value) => `- ${value}`);
}

export function createPaperTemplateModel(seed: PaperTemplateSeed): PaperNoteViewModel {
  return {
    frontmatter: {
      aliases: [],
      tags: ["paper", "unread"],
      authors: [],
      year: "",
      venue: "",
      url: "",
      code: "",
      status: "",
      created: seed.created,
    },
    body: {
      title: seed.title,
      oneSentenceSummary: "(Summarize the paper's core problem and main proposal in one sentence.)",
      keyContributions: [
        "(List the author's 2-3 main contributions.)",
        "",
        "",
      ],
      problemStatement: "(What limitation or gap is this paper trying to overcome?)",
      proposedMethod: "- (For example: a VLM-based approach to cognitive data processing, or the loss-function design of a PINN.)",
      proposedMethodDetails: [
        "(Attach a key equation or algorithm-flow screenshot if it helps.)",
      ],
      datasetEnvironment: "(Dataset or simulation environment used in the experiments.)",
      keyMetrics: "(Performance improvements compared with prior models or baselines.)",
      results: [
        "(Notable experimental results or evidence showing how the limitation was addressed.)",
      ],
      limitations: [
        "(Limitations mentioned by the paper, or weaknesses you noticed while reading.)",
      ],
      researchConnection: "(How could this be applied to my current project or research?)",
      idea: "(A new idea sparked by this paper. If needed, link a scratch note in `01_Inbox_and_Ideas` with `[[ ]]`.)",
      relatedNotes: [
        "(Links to previously read related papers or supporting theory notes.)",
      ],
    },
  };
}

export function renderPaperNote(model: PaperNoteViewModel): string {
  const lines = [
    "---",
    ...renderYamlList("aliases", model.frontmatter.aliases, "inline"),
    ...renderYamlList("tags", model.frontmatter.tags),
    ...renderYamlList("authors", model.frontmatter.authors),
    `year:${model.frontmatter.year ? ` ${model.frontmatter.year}` : ""}`,
    `venue:${model.frontmatter.venue ? ` ${model.frontmatter.venue}` : ""}`,
    `url:${model.frontmatter.url ? ` ${model.frontmatter.url}` : ""}`,
    `code:${model.frontmatter.code ? ` ${model.frontmatter.code}` : ""}`,
    `status:${model.frontmatter.status ? ` ${model.frontmatter.status}` : ""}`,
    `created: ${model.frontmatter.created}`,
    "---",
    `# ${model.body.title}`,
    "",
    "## 🎯 One-Sentence Summary",
    `> ${model.body.oneSentenceSummary}`,
    "",
    "---",
    "",
    "## 💡 Key Contributions",
    ...renderBulletLines(model.body.keyContributions),
    "",
    "## ⚙️ Methodology & Architecture",
    `- **Problem Statement:** ${model.body.problemStatement}`,
    `- **Proposed Method:** ${model.body.proposedMethod}`,
    ...model.body.proposedMethodDetails.map((value) => `    - ${value}`),
    "",
    "## 📊 Results & Performance",
    `- **Dataset / Environment:** ${model.body.datasetEnvironment}`,
    `- **Key Metrics:** ${model.body.keyMetrics}`,
    ...renderBulletLines(model.body.results),
    "",
    "## 🚧 Limitations & Future Work",
    ...renderBulletLines(model.body.limitations),
    "",
    "---",
    "",
    "## 🧠 My Thoughts & Ideas (Research Connection)",
    `- **Connection to my research:** ${model.body.researchConnection}`,
    `- **Idea:** ${model.body.idea}`,
    "",
    "## 🔗 Related Notes",
    ...renderBulletLines(model.body.relatedNotes),
    "",
  ];

  return lines.join("\n");
}
