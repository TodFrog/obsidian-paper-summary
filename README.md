# obsidian-paper-summary

Thanks to the work behind [Obsidian Extract PDF](https://github.com/akaalias/obsidian-extract-pdf), [Obsidian LLM Summary](https://github.com/larksq/obsidian-llm-summary), [Obsidian AI Tagger](https://github.com/lucagrippa/obsidian-ai-tagger), [Smart Connections](https://github.com/brianpetro/obsidian-smart-connections), and [Paper Clipper](https://www.obsidianstats.com/plugins/paper-clipper), which this project refers to.

`obsidian-paper-summary` turns a PDF already in your Obsidian vault into a paper-summary Markdown note.

## How to use

1. Install the plugin files in your vault at `.obsidian/plugins/obsidian-paper-summary/`.
2. Open the plugin settings and set the important basics: API key, provider, and model.
3. If needed, choose an output language or a custom note template.
4. Open a PDF in Obsidian, then run `Summarize PDF`.
5. Find the generated Markdown note in your configured output folder.

## Important notes

- If a note with the same file name already exists, the plugin now creates `name (1).md`, `name (2).md`, and so on.
- The built-in template is the default. Custom templates are optional.
- Use `Refresh related paper links` on a built-in summary note to recompute local paper-to-paper links from your existing paper summaries.
- Advanced behavior and technical details are documented separately.

## More details

- [Advanced reference](docs/advanced-reference.md)
