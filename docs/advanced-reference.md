# Advanced Reference

This document keeps the technical details out of the main README.

## Output and analysis behavior

- The plugin extracts text from a PDF already stored in the vault.
- It sends one structured analysis request to a remote API-compatible model.
- The validated paper-analysis contract stays stable for note rendering.
- Generated notes can use the built-in template or a custom vault template.
- Built-in notes now include frontmatter-only source metadata: `source_pdf`, `source_pdf_link`, and `reading_status`.

## Structured output and JSON compatibility

- `JSON object` mode is the compatibility default.
- `JSON schema` mode is stricter, but some OpenRouter model and provider combinations may ignore or reject it.
- The plugin prefers structured output first, then falls back to compatible JSON-like responses before final validation.
- When parsing model output, it can recover from plain JSON text, markdown-fenced JSON, and some common field/type mismatches.
- Final note rendering still depends on the normalized internal paper-analysis result, not arbitrary raw model output.

## Provider behavior

- Provider presets are: `openai`, `openrouter`, `gemini`, `claude`, `ollama`, and `others`.
- `openai`, `gemini`, `claude`, `ollama`, and `others` currently share the same OpenAI-compatible request pipeline.
- `openrouter` is still the only provider with explicit request extras and routing settings.
- Default base URLs auto-fill when the saved value is blank:
  - `openrouter`: `https://openrouter.ai/api/v1`
  - `gemini`: `https://generativelanguage.googleapis.com/v1beta/openai/`
  - `claude`: `https://api.anthropic.com/v1/`
  - `ollama`: `http://localhost:11434/v1`
- `claude` remains best-effort only in this version because Anthropic's OpenAI compatibility layer ignores `response_format`.
- `ollama` remains best-effort only in this version because support depends on the installed local model and runtime.
- `others` is the generic fallback for any other OpenAI-compatible endpoint and carries no provider-specific guarantees.
- The settings UI hides provider-irrelevant fields, but hidden values are preserved in saved settings.
- For `ollama`, the UI hides `API key` to reduce clutter; it does not delete any previously saved key.

## Output language behavior

- Default output language is `English`.
- `Auto` means the paper's dominant language, not the Obsidian UI language.
- `Custom` requires a custom language string in settings.
- The paper title stays in its original language for filename and citation stability.
- Tags stay English lowercase `snake_case`.

## Custom template behavior

- The built-in template remains the default and fallback.
- The built-in template adds the PDF source path/link and reading status in frontmatter only.
- Custom templates are vault-relative Markdown files.
- Placeholder syntax is `{{name}}` with optional whitespace.
- Unknown placeholders or malformed `{{ ... }}` syntax cause fallback to the built-in template.
- Missing, unreadable, empty, or invalid template files also fall back to the built-in template.

Supported placeholders:

- Scalars: `{{title}}`, `{{venue}}`, `{{year}}`, `{{doi}}`, `{{arxiv}}`, `{{url}}`, `{{abstract}}`, `{{extracted_summary}}`, `{{ai_summary}}`
- Comma-separated string: `{{authors}}`
- Markdown bullet lists: `{{key_contributions}}`, `{{results}}`, `{{limitations}}`, `{{tags}}`, `{{related_notes}}`
- Markdown block: `{{methodology}}`

Notes:

- `doi`, `arxiv`, and `abstract` are best-effort locally derived values.
- `abstract` and `extracted_summary` currently use the same extracted abstract text when it can be confidently detected.
- Empty scalar, list, and block placeholders render as blank strings.
- Custom templates are unchanged by the built-in frontmatter extension; they do not automatically render the new source/reading-status fields.

## Advanced configuration notes

- `OpenRouter require parameters` helps prefer routes that honor structured-output parameters.
- Custom templates are optional; the built-in template is still the stable default.
- If a target note name already exists, the plugin creates a unique file name with a numeric suffix.
- `Paper notes scope` controls which vault folder is scanned for existing paper summaries when computing related paper links.
- `Refresh related paper links` only rewrites the built-in `Related Notes` section and leaves custom-template notes untouched.

## Local related-paper linking

- Related-paper suggestions stay local-only and deterministic.
- The scorer combines tag overlap, title-token overlap, author overlap, venue/year signals, and keyword overlap from built-in summary sections.
- Generation-time linking inserts `[[Note Title]]` bullets for the top-ranked existing papers inside the related-notes section.
- Refresh is one-way in v1: it updates the active built-in paper summary note only and does not edit older notes automatically.
- Notes inside the configured paper-notes scope can still contribute metadata-only matches even if they do not use the built-in template, but built-in notes get stronger keyword-based scoring.

## Optional development commands

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
