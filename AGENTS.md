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

Five user-invoked commands plus four AI Chat tools, sharing a thin `src/lib/` layer.

### Surfaces

- **Commands** (`src/*.tsx`): `screenshot`, `pdf`, `markdown`, `links`, `analyze`. Each is a Raycast `view`-mode entry registered in `package.json` `commands[]`.
- **AI Tools** (`src/tools/*.ts`): `screenshot`, `extract-markdown`, `extract-links`, `analyze`. Registered in `package.json` `tools[]`. Exposed to Raycast AI Chat as "Ask Cloudflare Browser". The `ai.instructions` field in `package.json` is load-bearing; it tells Raycast AI which tool to pick for which intent class.

PDF is intentionally not exposed as a tool (it produces a file, not data for reasoning). There is no longer a Scrape command.

### Shared library (`src/lib/`)

- **`client.ts`**: `callBrowserRun(endpoint, opts)` is the only Cloudflare API entry. Throws typed errors:
  - `MissingPreferencesError` when account ID or API token are empty
  - `BrowserRunError` for non-2xx responses, with `isAuthError` (401/403), `isRateLimit` (429), and `retryAfterSeconds` (parsed from the `Retry-After` header) getters
- **`error-ux.tsx`**: `handleBrowserRunError(err)` returns a `RenderableError { title, body, metadata? }`. Commands set this into a single `error` state, and the JSX renders `errorMarkdown(error)` plus `error?.metadata` (rate-limit sidebar). `HelpActions` is a shared Action-panel fragment that only contains "Open Extension Preferences". Dedicated `MissingPreferencesEmptyView` and `MissingPreferencesActions` components provide a clean first-run / unauthenticated experience.
- **`url-input.ts`**: `resolveUrl(argUrl?)` does the standard 3-tier fallback: command argument, then selected text, then clipboard.
- **`analyze-schema.ts`**: Security analysis prompt builder (`analyzePrompt`), `parseVerdict()` with shape validation, and `renderReport()` for the "Copy Markdown Report" action. The prompt is HTML-aware because Analyze uses `/snapshot` (not `/markdown`).

### Analyze specifics

Analyze calls **`/snapshot`** (single Cloudflare browser launch returning base64 screenshot + HTML). It passes the raw HTML to Raycast AI (via `analyzePrompt`) because phishing signals (`<form action>`, password inputs, brand references) are stripped by Markdown conversion.

The AI returns JSON which we `JSON.parse` after stripping any code fences. If the model returns malformed JSON, we throw "AI response did not match the expected schema".

Analyze always uses the user's global Raycast AI default model (no per-extension model override preference).

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
