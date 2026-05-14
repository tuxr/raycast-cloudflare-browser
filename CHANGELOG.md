# Cloudflare Browser Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Six commands powered by Cloudflare Browser Run:
  - `Screenshot URL`: PNG screenshot rendered on Cloudflare's edge.
  - `Save URL as PDF`: render any URL to PDF, with file metadata sidebar.
  - `Convert URL to Markdown`: clean Markdown extraction.
  - `Get URL Links`: every link on a page, filterable, with hostnames.
  - `Scrape URL`: extract elements by CSS selector.
  - `Detonate URL`: AI-powered phishing triage with risk badge, screenshot evidence, and structured indicators. Uses Raycast AI (Pro required).
- URL resolution across all commands: command argument, then selected text, then clipboard.
- Configuration via extension preferences (Cloudflare Account ID and API Token).
- Smart error handling with one-click recovery actions for auth, rate-limit, and missing-setup failures.
