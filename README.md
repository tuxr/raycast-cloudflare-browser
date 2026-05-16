# Cloudflare Browser

Render, screenshot, and extract data from any URL on Cloudflare's edge, without opening it on your machine.

A Raycast extension built on [Cloudflare Browser Run](https://developers.cloudflare.com/browser-run/) (formerly Browser Rendering).

## Why

Sometimes you need to see what a URL actually does, without letting the page touch your laptop. A suspicious link from an email. A customer-reported page. A competitor's landing page. This extension runs the browser on Cloudflare's global edge and brings back just the artifact (screenshot, PDF, Markdown, structured data). The page never knows your IP, your fingerprint, or your network exists.

## Commands

| Command | What it does |
| --- | --- |
| Screenshot | Capture a PNG screenshot of any URL. |
| PDF | Render any URL to a PDF document. |
| Markdown | Extract clean Markdown from any webpage. |
| Links | List every link on a page, filterable, with hostnames. |
| Analyze | AI-powered security analysis: phishing detection, login forms, brand impersonation. Requires Raycast Pro. |

Every command resolves the URL in this order: command argument, then selected text on screen, then clipboard. So you can paste-and-go, select-and-go, or pass an explicit URL.

## Tips and examples

### Screenshot URL

Pass any URL as the argument, or copy one to the clipboard first. Action panel includes Open With, Show in Finder, Open Original URL, and Copy URL.

### Save URL as PDF

Same input pattern. Files save to Raycast's extension support directory. Press Enter to open in your default PDF viewer (usually Preview).

### Convert URL to Markdown

Returns the page as clean Markdown rendered in a Detail view. Use Copy Markdown to drop the content into Notion, Linear, Obsidian, or anywhere else. Good for archiving articles or feeding pages into LLMs without losing structure.

### Get URL Links

Renders every link on the page as a filterable list. Each row shows the link plus its hostname. Useful for outbound-domain audits during incident response, or for finding every entry on a documentation index page.

### Analyze

Runs an AI security analysis on a URL using Cloudflare's edge browser + Raycast AI. It returns a risk level (Low / Medium / High), reasoning, detected brand impersonation, login form detection, and a list of suspicious indicators.

Use it when you want to quickly assess if a link is phishing, malicious, or impersonating a brand. A screenshot of the page is captured and shown alongside the verdict. Requires Raycast Pro.

Sends a single Cloudflare Browser Run snapshot (HTML plus screenshot) to Raycast AI with a phishing-triage prompt. Returns a risk badge (low, medium, high), the model's reasoning, and structured indicators:

- Login form present
- Asks for credentials
- Asks for 2FA
- Brand impersonated (if any)
- List of suspicious indicators

Use Copy Markdown Report to paste the verdict into an IR ticket or Slack thread. The report includes the source URL, risk level, and every indicator above.

### Raycast Pro and Analyze

Analyze uses [Raycast AI](https://www.raycast.com/pro) and requires a Raycast Pro subscription. The other four commands work on any Raycast plan, including the free tier.

The AI never sees your Cloudflare credentials. Only the HTML extracted by Cloudflare Browser Run is included in the prompt.

### Changing the Analyze model

By default, Analyze uses your **Raycast AI default model** (configured in Raycast Settings → AI).

If you want to override it for Analyze only, the extension preferences include an **Analyze Model** dropdown with all current Raycast AI models.

Models that don't return reliable JSON will fail the schema check. Re-run the command or pick a different model.

## Ask Cloudflare Browser (AI Chat)

This extension exposes its capabilities as Raycast AI tools, so you can call them from AI Chat without invoking a specific command. Available tools:

- **Screenshot URL** for visual evidence of a page
- **Extract Markdown** to read page content
- **Extract Links** to enumerate outbound links
- **Analyze** for security and phishing analysis with a structured verdict

In Raycast AI Chat, ask things like:

- *"Is the URL in my clipboard phishing?"*
- *"Summarize https://example.com/article-name"*
- *"What domains does this docs page link out to?"*
- *"Show me what this URL looks like without opening it"*

Tools require a Raycast Pro subscription for AI Chat access.

## Setup

You need two values from Cloudflare. Both are prompted for on first run.

### 1. Cloudflare Account ID

Sign in to the [Cloudflare dashboard](https://dash.cloudflare.com) and copy your Account ID from the right sidebar.

### 2. API Token

Go to [Cloudflare → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens) and click Create Token → Get started under "Create Custom Token". Then:

- **Token name:** anything (e.g. "Raycast Cloudflare Browser")
- **Permissions:** `Account` → `Browser Rendering` → `Edit`
- **Account Resources:** Include → your account

Click Continue to summary, then Create Token, and copy the value. Paste it into Raycast's preferences.

> The token never leaves your machine except in `Authorization` headers to `api.cloudflare.com`.

### Lost the token-creation page?

From any command in this extension, open the Action Panel and use the Help actions (or the error toast) to open the Cloudflare API Tokens page. If an auth error appears while running a command, the error toast itself offers a one-click action to create a fresh token.

## Troubleshooting

### "Rate limited" message

Cloudflare Browser Run caps how many new browsers you can launch per minute. Workers Free is roughly 2 per minute. Workers Paid is 10 per minute. Wait a few seconds and try again. The error view in this extension shows the exact `Retry-After` value when Cloudflare provides one.

### "Auth failed" message

Your API token does not have the `Browser Rendering: Edit` permission, or it has been revoked. Use the Help actions in the Action Panel (or the error toast) to open the token page, then create a fresh token following the setup steps above.

### Blank or partial screenshot

Some pages take longer than the default 30-second timeout to fully render. Try the URL again. Cloudflare may have cold-started a new browser instance the first time.

### Analyze returns "AI response did not match the expected schema"

The model returned non-JSON output. Re-run the command, or try a different AI model in the extension preferences.

## Pricing notes

- **Workers Free:** 10 minutes per day of browser time, 3 concurrent browsers. Enough for casual personal use.
- **Workers Paid ($5/mo):** 10 browser hours per month included, then $0.09 per additional browser hour. The REST endpoints this extension uses bill on duration only, not concurrency.

Analyze uses Raycast AI tokens covered by your Raycast Pro subscription. Workers AI is not billed by this extension. See the [Cloudflare Browser Run pricing page](https://developers.cloudflare.com/browser-run/pricing/) for current Browser Run details.

## Privacy

- Your Cloudflare credentials never leave your machine except in `Authorization` headers to `api.cloudflare.com`.
- For Analyze, the page HTML extracted by Cloudflare is sent to Raycast AI as part of the prompt. No other extension data is sent.
- This extension makes no other network requests and ships no analytics.
- Screenshots, PDFs, and other saved artifacts are written to Raycast's per-extension support directory on your machine.

## License

MIT
