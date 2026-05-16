import { AI, environment } from "@raycast/api";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { callBrowserRun } from "../lib/client";
import {
  type AnalyzeVerdict,
  parseVerdict,
  analyzePrompt,
} from "../lib/analyze-schema";

type Input = {
  /** Fully-qualified http(s) URL to triage for phishing and social-engineering indicators. */
  url: string;
};

type SnapshotResponse = {
  result?: {
    screenshot?: string;
    content?: string;
  };
};

type AnalyzeToolResult = AnalyzeVerdict & {
  url: string;
  screenshotPath?: string;
};

/**
 * Run an AI-powered security and phishing analysis on a URL. Renders the page safely on
 * Cloudflare's edge, then sends the HTML to the configured AI model with a
 * conservative security-indicator schema. Returns a structured verdict with
 * risk level, reasoning, brand impersonation, credential/2FA prompts, and a
 * list of suspicious indicators.
 *
 * Always prefer this tool over manual fetching when a user asks "is this URL
 * safe?" or "is this phishing?".
 */
export default async function tool(input: Input): Promise<AnalyzeToolResult> {
  const snapshot = await callBrowserRun<SnapshotResponse>("snapshot", {
    body: { url: input.url },
  });

  const screenshotB64 = snapshot.result?.screenshot;
  const html = (snapshot.result?.content ?? "").trim();
  if (!html) {
    throw new Error("Couldn't extract content from the page.");
  }

  let screenshotPath: string | undefined;
  if (screenshotB64) {
    screenshotPath = join(environment.supportPath, `analyze-${Date.now()}.png`);
    await writeFile(screenshotPath, Buffer.from(screenshotB64, "base64"));
  }

  const raw = await AI.ask(analyzePrompt(input.url, html), {
    creativity: "low",
  });
  const verdict = parseVerdict(raw);

  return {
    url: input.url,
    ...verdict,
    screenshotPath,
  };
}
