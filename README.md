# Cloudflare Browser

Render, screenshot, and extract data from any URL on Cloudflare's edge — without opening it on your machine.

A Raycast extension on top of [Cloudflare Browser Run](https://developers.cloudflare.com/browser-run/) (formerly Browser Rendering).

## Why

Sometimes you need to see what a URL actually does — a suspicious link from an email, a customer-reported page, a competitor's landing page — without letting that page touch your laptop. Burner Browser renders the page on Cloudflare's global edge and brings back just the artifact (screenshot, PDF, markdown, structured data). The page never knows your IP, your fingerprint, or your network exists.

## Commands

| Command | What it does |
| --- | --- |
| Screenshot URL | Capture a PNG screenshot of any URL. |
| Save URL as PDF | Render any URL to a PDF document. |
| Convert URL to Markdown | Extract clean Markdown from any webpage. |
| Get URL Links | List every link on a page, filterable, with hostnames. |
| Scrape URL | Extract elements from a page by CSS selector. |
| Detonate URL | AI-powered phishing triage — risk badge, screenshot, structured indicators. *Requires Raycast Pro.* |

Every command resolves the URL in this order: command argument → selected text on screen → clipboard. So you can paste-and-go, select-and-go, or pass an explicit URL.

### Detonate URL & Raycast Pro

`Detonate URL` uses [Raycast AI](https://www.raycast.com/pro) (GPT-5 mini by default) to analyze the page content extracted by Cloudflare Browser Run, returning a structured phishing-triage verdict. Because it calls `AI.ask`, this command requires a Raycast Pro subscription. The other five commands work on any Raycast plan.

The AI never sees your Cloudflare credentials — only the Markdown content of the target URL.

## Setup

You need two values from Cloudflare — both prompted for on first run.

### 1. Cloudflare Account ID

Sign in to the [Cloudflare dashboard](https://dash.cloudflare.com) and copy your Account ID from the right sidebar.

### 2. API Token

Go to [Cloudflare → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens) and click **Create Token → Get started** (under "Create Custom Token"). Then:

- **Token name:** anything (e.g. "Raycast — Cloudflare Browser Run")
- **Permissions:** `Account` → `Browser Rendering` → `Edit`
- **Account Resources:** Include → your account

Click **Continue to summary** → **Create Token**, then copy the token value. Paste it into Raycast's preferences.

> The token never leaves your machine except in `Authorization` headers to `api.cloudflare.com`.

### Lost the token-creation page?

From any command in this extension, press `⌘H` to open the Cloudflare API Tokens page. If an auth error shows up while running a command, the error toast itself offers a one-click action to create a new token.

## Pricing notes

- **Workers Free:** 10 minutes/day of browser time, 3 concurrent — enough for casual use.
- **Workers Paid ($5/mo):** 10 browser hours/month included, then `$0.09/browser-hour`. Quick Actions (the REST endpoints this extension uses) bill on duration only.

See the [Cloudflare Browser Run pricing page](https://developers.cloudflare.com/browser-run/pricing/) for current details.

## Privacy

- Your Cloudflare credentials never leave your machine except in `Authorization` headers to `api.cloudflare.com`.
- This extension makes no other network requests and ships no analytics.
- Screenshots are saved to Raycast's extension support directory on your machine.

## License

MIT
