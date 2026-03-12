# obsidian-paper-summary

`obsidian-paper-summary` is an Obsidian plugin that turns a PDF already stored in your vault into a structured paper-summary note based on the `Paper Ex.md` template in this repository.

## MVP scope

- Extract text from a vault PDF with `pdfjs-dist`
- Send one structured analysis request to a remote API-compatible LLM endpoint
- Generate a Markdown note that matches the `Paper Ex.md` layout, using the fixed English template text
- Populate frontmatter metadata and suggested tags
- Add lightweight local related-note suggestions from existing markdown files
- Never silently overwrite an existing summary note

## What is intentionally out of scope

- Python sidecars or external local services
- Deno-specific build tooling
- LangChain or multi-provider orchestration
- Embedding-based semantic search
- Batch PDF ingestion or DOI import

## User-facing surface

Commands:

- `Summarize active PDF`

File menu:

- `Summarize PDF` on PDF files

Settings:

- `Provider` (`OpenAI`, `OpenRouter`, or `Custom`)
- `API key`
- `Base URL`
- `Model`
- `Structured output mode`
- `OpenRouter require parameters`
- `OpenRouter app referer`
- `OpenRouter app title`
- `OpenRouter provider order`
- `OpenRouter allow fallbacks`
- `Output folder`
- `Maximum PDF pages`
- `Maximum characters`
- `Open generated note`
- `Paper tag`
- `Default status`
- `Related notes limit`

## How it works

1. Read the active or selected vault PDF.
2. Extract and normalize PDF text within the configured page and character limits.
3. Send the extracted text to the configured model and require structured JSON output.
4. Render a paper note using the fixed `Paper Ex.md` contract.
5. Create the note in the configured output folder.
6. Score existing vault notes locally and append related-note links.

## Provider mode

### OpenAI

- `Provider`: `OpenAI`
- `API key`: your OpenAI API key
- `Base URL`: leave blank unless you need a compatible proxy
- `Structured output mode`: `JSON object` is the default; `JSON schema` is optional

### OpenRouter

- `Provider`: `OpenRouter`
- `API key`: your OpenRouter API key
- `Base URL`: leave blank to auto-fill `https://openrouter.ai/api/v1`
- `Model`: use the full OpenRouter model ID such as `openai/gpt-4o-mini`
- `Structured output mode`: start with `JSON object`; switch to `JSON schema` only for models/providers that reliably support it
- `OpenRouter require parameters`: keep this enabled so routing only uses providers that support structured-output parameters
- `OpenRouter app referer` and `OpenRouter app title`: optional attribution headers
- `OpenRouter provider order`: optional comma-separated provider preference such as `openai,anthropic`
- `OpenRouter allow fallbacks`: keep enabled unless you want routing to fail instead of using another provider

### Custom

- `Provider`: `Custom`
- `API key`: key for your compatible endpoint
- `Base URL`: required for non-default endpoints
- `Structured output mode`: depends on whether your endpoint supports `json_object` or `json_schema`

## Reliability notes

- `JSON object` mode is the compatibility default.
- `JSON schema` mode is stricter, but some OpenRouter model/provider combinations will reject it or ignore it.
- The plugin still normalizes plain JSON text and markdown-fenced JSON before validation.
- If the remote response still fails validation, open the Obsidian developer console and inspect the logged `Paper Summary error details` payload.

## Failure handling

- Missing API configuration fails before any remote request.
- Invalid API responses fail with a schema-validation error.
- Remote request failures are surfaced as explicit analysis request errors.
- Existing target notes fail with a `note_exists` error instead of overwriting content.
- Related-note suggestions are local-only and do not block note creation if they return no matches.

## Development

Install dependencies:

```powershell
npm.cmd install
```

Run tests:

```powershell
npm.cmd test
```

Build the plugin:

```powershell
npm.cmd run build
```

## Repository status

- Build is TypeScript + `esbuild`
- Tests are `vitest`
- Type checking runs as part of `npm.cmd run build`
- A dedicated lint configuration is not included in the MVP yet
