import { createPaperTemplateModel, renderPaperNote } from "./paper-note-renderer";

describe("paper note renderer", () => {
  it("renders the exact Paper Ex template contract in English", () => {
    const model = createPaperTemplateModel({
      title: "Paper Ex",
      created: "2026-03-11",
    });

    expect(renderPaperNote(model)).toBe(`---
aliases: []
tags:
  - paper
  - unread
authors:
year:
venue:
url:
code:
status:
created: 2026-03-11
---
# Paper Ex

## 🎯 One-Sentence Summary
> (Summarize the paper's core problem and main proposal in one sentence.)

---

## 💡 Key Contributions
- (List the author's 2-3 main contributions.)
- 
- 

## ⚙️ Methodology & Architecture
- **Problem Statement:** (What limitation or gap is this paper trying to overcome?)
- **Proposed Method:** - (For example: a VLM-based approach to cognitive data processing, or the loss-function design of a PINN.)
    - (Attach a key equation or algorithm-flow screenshot if it helps.)

## 📊 Results & Performance
- **Dataset / Environment:** (Dataset or simulation environment used in the experiments.)
- **Key Metrics:** (Performance improvements compared with prior models or baselines.)
- (Notable experimental results or evidence showing how the limitation was addressed.)

## 🚧 Limitations & Future Work
- (Limitations mentioned by the paper, or weaknesses you noticed while reading.)

---

## 🧠 My Thoughts & Ideas (Research Connection)
- **Connection to my research:** (How could this be applied to my current project or research?)
- **Idea:** (A new idea sparked by this paper. If needed, link a scratch note in \`01_Inbox_and_Ideas\` with \`[[ ]]\`.)

## 🔗 Related Notes
- (Links to previously read related papers or supporting theory notes.)
`);
  });

  it("renders filled frontmatter arrays and related notes without changing the section layout", () => {
    const model = createPaperTemplateModel({
      title: "Attention Is All You Need",
      created: "2026-03-12",
    });

    model.frontmatter.aliases = ["transformer"];
    model.frontmatter.tags = ["paper", "nlp"];
    model.frontmatter.authors = ["Ashish Vaswani", "Noam Shazeer"];
    model.frontmatter.year = "2017";
    model.frontmatter.venue = "NeurIPS";
    model.frontmatter.url = "https://arxiv.org/abs/1706.03762";
    model.frontmatter.code = "https://github.com/tensorflow/tensor2tensor";
    model.frontmatter.status = "summarized";
    model.body.oneSentenceSummary = "Introduces the Transformer architecture for sequence modeling.";
    model.body.relatedNotes = ["[[Transformer Notes]]", "[[Sequence Modeling]]"];

    const rendered = renderPaperNote(model);

    expect(rendered).toContain(`aliases:
  - transformer`);
    expect(rendered).toContain(`tags:
  - paper
  - nlp`);
    expect(rendered).toContain(`authors:
  - Ashish Vaswani
  - Noam Shazeer`);
    expect(rendered).toContain(`> Introduces the Transformer architecture for sequence modeling.`);
    expect(rendered).toContain(`## 🔗 Related Notes
- [[Transformer Notes]]
- [[Sequence Modeling]]`);
  });
});
