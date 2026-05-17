# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project

A Raycast extension titled **Cloudflare Browser** (`name: "cloudflare-browser"`, author `tuxr`) that wraps the Cloudflare Browser Run REST API and the Raycast AI module. Targets the public Raycast Store. The repo lives at `github.com/tuxr/raycast-cloudflare-browser`.

## Commands

```bash
npm install              # First-time setup
npm run dev              # Hot-reload the extension into Raycast (uses `ray develop`)
npm run build            # Production build (uses `ray build`); also what reviewer CI runs
npm run lint             # ESLint v9 (flat config) + Prettier check
npm run fix-lint         # Auto-fix Prettier issues
npm run publish          # Open a PR against `raycast/extensions`. Only run when ready.
```

There is no test suite. The reviewer's gates are `ray build` + `ray lint`; both must pass before submission.

For local dev: quit Raycast (`⌘Q`) and restart `npm run dev` whenever **assets** (icons) change. Source changes hot-reload fine, but Raycast caches icons aggressively.

## Architecture

Five user-invoked commands + four AI tools, sharing a thin `src/lib/` layer.

### Surfaces

- **Commands** (`src/*.tsx`): `screenshot`, `pdf`, `markdown`, `links`, `analyze`. All are `view` mode.
- **AI Tools** (`src/tools/*.ts`): `screenshot`, `extract-markdown`, `extract-links`, `analyze`.

PDF is intentionally **not** exposed as a tool (it produces a file for the user, not data for reasoning). The old "Scrape" command was removed entirely.

### Shared library (`src/lib/`)

- **`client.ts`**: Single entry point for Cloudflare Browser Run. Throws `MissingPreferencesError` or `BrowserRunError` (with `isAuthError`, `isRateLimit`, and `retryAfterSeconds` helpers).
- **`error-ux.tsx`**: Centralized error handling + `RenderableError`. Includes `MissingPreferencesEmptyView` / `MissingPreferencesActions` for a clean first-run experience, plus `HelpActions` (now only "Open Extension Preferences").
- **`url-input.ts`**: `resolveUrl()` — argument → selected text → clipboard (with `isLikelyUrl` guard).
- **`analyze-schema.ts`**: Prompt builder (`analyzePrompt`), strict JSON schema validation (`parseVerdict`), and report renderer. Uses raw HTML from `/snapshot` (not Markdown) so the model can see forms, password fields, and brand signals.

### Analyze command/tool

- Uses a **single** `/snapshot` call (HTML + optional base64 screenshot).
- Always respects the user's global Raycast AI default (no per-extension model override).
- The command view and the AI tool share the same prompt + parsing logic.

The `required: true` change on the `url` argument (May 2026) means commands now reliably focus the argument input on launch, while still falling back to selection/clipboard when the user submits an empty or invalid value.

## Critical conventions

These are non-obvious and broke things in practice. Follow them.

### useEffect must be guarded in every command

Raycast dev mode enables React 18 strict mode, which fires `useEffect` twice on mount. Every API-call effect uses a `ranRef` guard:

```tsx
const ranRef = useRef(false);
useEffect(() => {
  if (ranRef.current) return;
  ranRef.current = true;
  void (async () => { /* API call */ })();
}, []);
```

Without this, every command makes 2 Cloudflare API calls. Free tier (2/min cap) breaks instantly; on Paid you silently double-spend quota. Production builds only fire once but the guard is mandatory for any one-shot side effect.

### File paths in markdown need `pathToFileURL`

Raycast's user data lives at `~/Library/Application Support/com.raycast-x.macos/extensions/...`. The space in "Application Support" breaks the markdown image syntax `![](file:///path with space/file.png)`. Use:

```ts
import { pathToFileURL } from "node:url";
`![](${pathToFileURL(imagePath).href})`
```

This URL-encodes spaces as `%20` correctly.

### User-facing copy

- **Native-feeling, terse.** Detail markdown for errors: `# <Title>\n\n<one line>`. No bullet lists, no multi-paragraph explanations. Toasts: 3-5 word title plus optional one-line message; `primaryAction` and `secondaryAction` carry any verbs. README is the place for verbose explanations, not in-app surfaces.
- **No em-dashes in user-facing text** (README, CHANGELOG, in-app strings, this file). Em-dashes are a common AI-writing tell. Use commas, periods, colons, or parentheses instead. This applies to all files that ship with the repo; internal Claude chat is fine.
- **Preference descriptions are labels, not setup instructions.** Reference Jira/1Password style: `"API Token"` or `"Your API token (e.g. abc123…)"`. Setup steps go in the README.

### Reserved Raycast keyboard shortcuts

`⌘,` opens preferences globally and cannot be reassigned on custom Actions. Raycast logs a warning and strips the shortcut. Use other modifiers (`⌘H` for help, `⌘O` for open original, `⌘⇧C` for copy, etc.).

## Manifest gotchas

- **`license` must be `"MIT"`** for store acceptance.
- **`author` is the Raycast username** (not GitHub). Currently `"tuxr"`.
- **Preference scope is keyed by `name`**: changing `package.json`'s `name` field after deployment effectively orphans existing preference values. Treat the `name` field as immutable post-publish.
- **Argument placeholders are narrow**: 1-3 words max. Raycast splits the argument bar evenly across all args, so verbose hints get truncated. Examples belong in placeholders (`"h1, h2"`), explanations belong in the README.
- **Tool descriptions in `package.json` are seen by the LLM**, not just humans. Write them as if explaining the tool to a model that's deciding whether to call it. The `ai.instructions` system-prompt-style field steers tool selection.

## Memory

The project has persistent memory at `~/.claude/projects/-Users-dariussumpter-Documents-Programming-ray-browser/memory/` with detailed notes on the architectural decisions, user preferences (terse copy, no em-dashes, useRef guards), and historical context. The index is at `memory/MEMORY.md`. Check it before re-investigating questions like "why are we using Raycast AI vs Cloudflare /json" or "why does Analyze use /snapshot".

## Pricing and quota constraints

- **Cloudflare Browser Run free tier**: 10 min/day, ~2 new browsers/min. Workers Paid: 10 hrs/month, 10 browsers/min.
- **Raycast AI** (used by the Analyze command and analyze tool): 10 req/min, 100 req/hr; requires Raycast Pro.
- Analyze is the only Pro-gated command; the other four commands work on any Raycast plan.
