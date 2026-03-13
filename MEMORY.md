# MEMORY

## Purpose

`obsidian-paper-summary` is an Obsidian community plugin that summarizes PDFs already stored in the vault into a structured paper note.

The plugin MVP currently does all of this:

- extracts text from a vault PDF with `pdfjs-dist`
- sends one structured request to a remote API-compatible LLM
- renders a paper-summary note using the English `Paper Ex.md` contract
- writes frontmatter metadata and tags
- adds lightweight local related-note suggestions
- refuses to overwrite an existing output note

## Current Architecture

Main entry:

- `src/main.ts`

Workflow orchestration:

- `src/workflow/generate-paper-summary.ts`

Settings and UI:

- `src/settings.ts`
- `src/settings-tab.ts`

PDF extraction:

- `src/pdf/pdf-extractor.ts`
- `src/pdf/pdf-text-shaping.ts`
- `src/pdf/pdf-worker.ts`

LLM analysis:

- `src/llm/paper-analysis.ts`
- `src/llm/paper-analysis-json-schema.ts`
- `src/llm/openai-json-client.ts`
- `src/llm/openrouter-request.ts`

Note generation:

- `src/notes/paper-note-builder.ts`
- `src/renderer/paper-note-renderer.ts`

Vault and related notes:

- `src/vault/obsidian-note-file.ts`
- `src/vault/note-file.ts`
- `src/related/obsidian-related-notes.ts`
- `src/related/related-notes.ts`

## User-Facing Surface

Commands:

- `Summarize active PDF`

File menu:

- `Summarize PDF` on PDF files

Generated files for Obsidian installation:

- `manifest.json`
- `main.js`
- `styles.css`

## Settings Model

Provider settings:

- `provider`: `openai | openrouter | custom`
- `apiKey`
- `baseUrl`
- `model`
- `structuredOutputMode`: `json_object | json_schema`

OpenRouter-specific settings:

- `openRouterRequireParameters`
- `openRouterAppReferer`
- `openRouterAppTitle`
- `openRouterProviderOrder`
- `openRouterAllowFallbacks`

Output/settings behavior:

- `outputFolder`
- `maxPages`
- `maxChars`
- `openAfterCreate`
- `paperTag`
- `defaultStatus`
- `relatedNotesLimit`

Important default:

- if `provider === "openrouter"` and `baseUrl` is blank, it auto-fills `https://openrouter.ai/api/v1`

## Template Contract

The rendered note contract is based on:

- `Paper Ex.md`

That contract is now fully English and should stay stable unless the renderer, tests, and example file are updated together.

## Important Implementation Decisions

### PDF extraction

- The plugin uses `pdfjs-dist/legacy/build/pdf.mjs` for extraction.
- The PDF worker is now lazy-loaded only inside extraction.
- Worker registration is scoped and restored after extraction to avoid mutating Obsidian viewer-wide PDF.js globals.

### Remote analysis

- The plugin uses the OpenAI SDK with configurable `baseUrl`.
- OpenRouter works through the same client.
- The parser accepts:
  - plain JSON text
  - markdown-fenced JSON
  - loose OpenRouter/model field typing
- The final validated output contract for note rendering remains stable.

### Related notes

- Related-note suggestions are lightweight and local only.
- No embeddings, Smart Connections, or external semantic index are used in the MVP.

## Recent Fixes Already Landed

### English template conversion

- `Paper Ex.md`, renderer defaults, tests, and docs were switched to English.

### PDF.js worker-src error

- The earlier `"No GlobalWorkerOptions.workerSrc specified"` issue was fixed by providing extraction-time fake-worker handling.

### Remote schema mismatch / OpenRouter parsing

- The parser now surfaces:
  - raw response
  - extracted content
  - normalized content
  - exact validation issues
- It also strips code fences and normalizes loose field types before validation.

### OpenRouter provider mode

- Explicit provider mode was added.
- Optional `json_schema` requests were added.
- OpenRouter routing headers/body options were added.

### PDF viewer overlap bug

Root cause:

- importing `pdf.worker.mjs` in the normal plugin module graph mutated `globalThis.pdfjsWorker` as soon as the plugin was enabled
- that could interfere with Obsidian's native PDF viewer even before summarization ran

Fix:

- PDF.js modules are now lazy-loaded only when extraction is invoked
- temporary worker state is restored immediately after extraction

Regression coverage:

- `src/pdf/pdf-worker.test.ts`

## Verification Commands

Run from the plugin root:

```powershell
npm.cmd test
npm.cmd run build
```

Notes:

- targeted Vitest invocations can hit `spawn EPERM` in this environment
- full `npm.cmd test` has been the reliable verification path

## Manual Obsidian Install

After `npm.cmd run build`, copy these into your vault plugin folder:

- `manifest.json`
- `main.js`
- `styles.css`

Target folder:

`<vault>/.obsidian/plugins/obsidian-paper-summary/`

Do not overwrite `data.json` unless you intentionally want to reset plugin settings.

## Git / Repo State

Remote:

- `origin = https://github.com/TodFrog/obsidian-paper-summary.git`

Initial pushed commit:

- `8db5a21` `Initial MVP implementation`

## Known Constraints

- No Python sidecar
- No Deno build flow
- No LangChain
- No Smart Connections dependency
- No embedding-based search
- No DOI import or batch ingestion in MVP
- No dedicated lint setup yet

## Good Next Steps

- manual smoke test inside Obsidian for:
  - OpenAI mode
  - OpenRouter `json_object` mode
  - OpenRouter `json_schema` mode on a supported model
- add a lint configuration if repository standards require it
- improve model/provider guidance in README if specific OpenRouter models are confirmed reliable
