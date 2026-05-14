import { callBrowserRun } from "../lib/client";

type Input = {
  /** Fully-qualified http(s) URL to convert to Markdown. */
  url: string;
};

type MarkdownResponse = {
  result?: string;
};

/**
 * Render a webpage on Cloudflare's edge and return its content as clean Markdown.
 * Use this when the user asks about the textual content of a URL or wants to
 * summarize, search, or analyze a page.
 */
export default async function tool(input: Input) {
  const resp = await callBrowserRun<MarkdownResponse>("markdown", {
    body: { url: input.url },
  });

  return {
    url: input.url,
    markdown: resp.result ?? "",
  };
}
