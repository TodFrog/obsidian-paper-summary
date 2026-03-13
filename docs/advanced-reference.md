# Advanced Reference

This document keeps the technical details out of the main README.

## Output and analysis behavior

- The plugin extracts text from a PDF already stored in the vault.
- It sends one structured analysis request to a remote API-compatible model.
- The validated paper-analysis contract stays stable for note rendering.
- Generated notes can use the built-in template or a custom vault template.

## Structured output and JSON compatibility

- `JSON object` mode is the compatibility default.
- `JSON schema` mode is stricter, but some OpenRouter model and provider combinations may ignore or reject it.
- The plugin prefers structured output first, then falls back to compatible JSON-like responses before final validation.
- When parsing model output, it can recover from plain JSON text, markdown-fenced JSON, and some common field/type mismatches.
- Final note rendering still depends on the normalized internal paper-analysis result, not arbitrary raw model output.

## Output language behavior

- Default output language is `English`.
- `Auto` means the paper's dominant language, not the Obsidian UI language.
- `Custom` requires a custom language string in settings.
- The paper title stays in its original language for filename and citation stability.
- Tags stay English lowercase `snake_case`.

## Custom template behavior

- The built-in template remains the default and fallback.
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

## Advanced configuration notes

- OpenRouter base URL auto-fills to `https://openrouter.ai/api/v1` when OpenRouter is selected and the base URL is blank.
- `OpenRouter require parameters` helps prefer routes that honor structured-output parameters.
- Custom templates are optional; the built-in template is still the stable default.
- If a target note name already exists, the plugin creates a unique file name with a numeric suffix.

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
