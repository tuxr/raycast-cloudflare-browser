import { callBrowserRun } from "../lib/client";

type Input = {
  /** Fully-qualified http(s) URL to extract links from. */
  url: string;
};

type RawLink = string | { href?: string; text?: string };

type LinksResponse = {
  result?: RawLink[];
};

type Link = {
  href: string;
  text?: string;
  hostname?: string;
};

/**
 * Extract every link from a webpage, with hostnames.
 * Useful for outbound-domain audits, finding sublinks on a documentation
 * index, or answering "what does this page link to?".
 */
export default async function tool(input: Input) {
  const resp = await callBrowserRun<LinksResponse>("links", {
    body: { url: input.url },
  });

  const links: Link[] = (resp.result ?? [])
    .map((raw): Link | null => {
      const href = typeof raw === "string" ? raw : raw.href;
      if (!href) return null;
      const link: Link = {
        href,
        text:
          typeof raw === "string" ? undefined : raw.text?.trim() || undefined,
      };
      try {
        link.hostname = new URL(href).hostname;
      } catch {
        // malformed URL, skip hostname
      }
      return link;
    })
    .filter((l): l is Link => l !== null);

  return {
    url: input.url,
    count: links.length,
    links,
  };
}
