import {
  Action,
  ActionPanel,
  Icon,
  LaunchProps,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { callBrowserRun } from "./lib/client";
import { resolveUrl } from "./lib/url-input";
import {
  failNoUrl,
  handleBrowserRunError,
  HelpActions,
  type RenderableError,
} from "./lib/error-ux";

type Arguments = {
  selector: string;
  url?: string;
};

type ScrapeAttr = { name: string; value: string };

type ScrapeResult = {
  text?: string;
  html?: string;
  attributes?: ScrapeAttr[];
};

type ScrapeResponse = {
  result?: { selector: string; results: ScrapeResult[] }[];
  success?: boolean;
};

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const [matches, setMatches] = useState<ScrapeResult[]>([]);
  const [url, setUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<RenderableError | null>(null);
  const selector = props.arguments.selector;
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    void (async () => {
      try {
        const target = await resolveUrl(props.arguments?.url);
        if (!target) {
          setError(await failNoUrl());
          return;
        }
        setUrl(target);

        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Scraping…",
          message: selector,
        });

        const resp = await callBrowserRun<ScrapeResponse>("scrape", {
          body: { url: target, elements: [{ selector }] },
        });
        const results = resp.result?.[0]?.results ?? [];
        setMatches(results);

        toast.style = Toast.Style.Success;
        toast.title = `${results.length} match${results.length === 1 ? "" : "es"}`;
        toast.message = undefined;
      } catch (err) {
        setError(await handleBrowserRunError(err));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter matches…"
      navigationTitle={`${selector} · ${url || "URL"}`}
    >
      {error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={error.title}
          description={error.body}
        />
      )}
      {!isLoading && !error && matches.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matches"
          description={selector}
        />
      )}
      {matches.map((m, i) => {
        const text = (m.text ?? "").trim();
        return (
          <List.Item
            key={i}
            title={text || "(empty)"}
            icon={Icon.Code}
            actions={
              <ActionPanel>
                {text && (
                  <Action.CopyToClipboard title="Copy Text" content={text} />
                )}
                {m.html && (
                  <Action.CopyToClipboard
                    title="Copy HTML"
                    content={m.html}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                  />
                )}
                {url && (
                  <Action.OpenInBrowser
                    title="Open Source Page"
                    url={url}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                )}
                <HelpActions />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
