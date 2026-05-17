import {
  Action,
  ActionPanel,
  Icon,
  LaunchProps,
  List,
  showToast,
  Toast,
  updateCommandMetadata,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { callBrowserRun } from "./lib/client";
import { resolveUrl } from "./lib/url-input";
import {
  failNoUrl,
  handleBrowserRunError,
  HelpActions,
  MissingPreferencesEmptyView,
  type RenderableError,
} from "./lib/error-ux";

type Arguments = {
  url: string;
};

type RawLink = string | { href?: string; text?: string };

type LinksResponse = {
  result?: RawLink[];
  success?: boolean;
};

type Link = {
  href: string;
  text?: string;
  hostname?: string;
};

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const [links, setLinks] = useState<Link[]>([]);
  const [url, setUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<RenderableError | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    void (async () => {
      try {
        const target = await resolveUrl(props.arguments.url);
        if (!target) {
          setError(await failNoUrl());
          return;
        }
        setUrl(target);

        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Loading…",
          message: target,
        });

        const resp = await callBrowserRun<LinksResponse>("links", {
          body: { url: target },
        });
        const parsed = (resp.result ?? [])
          .map(toLink)
          .filter((l): l is Link => l !== null);
        setLinks(parsed);

        await updateCommandMetadata({
          subtitle: `${parsed.length} link${parsed.length === 1 ? "" : "s"}`,
        });

        toast.style = Toast.Style.Success;
        toast.title = `${parsed.length} link${parsed.length === 1 ? "" : "s"}`;
        toast.message = undefined;
      } catch (err) {
        setError(await handleBrowserRunError(err));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const hasLinks = !error && links.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter links…"
      navigationTitle={url || "Page Links"}
      actions={
        hasLinks ? (
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy All URLs"
              icon={Icon.Link}
              content={links.map((l) => l.href).join("\n")}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy All as Markdown"
              icon={Icon.Clipboard}
              content={links
                .map((l) => `- ${l.text ? `[${l.text}](${l.href})` : l.href}`)
                .join("\n")}
            />
            <HelpActions />
          </ActionPanel>
        ) : undefined
      }
    >
      {error &&
        (error.title === "Not Configured" ? (
          <MissingPreferencesEmptyView />
        ) : (
          <List.EmptyView
            icon={Icon.ExclamationMark}
            title={error.title}
            description={error.body}
          />
        ))}
      {!isLoading && !error && links.length === 0 && (
        <List.EmptyView icon={Icon.Link} title="No links found" />
      )}
      {links.map((link, i) => (
        <List.Item
          key={`${link.href}-${i}`}
          title={link.text || link.href}
          subtitle={link.text ? link.href : undefined}
          accessories={link.hostname ? [{ text: link.hostname }] : []}
          icon={Icon.Link}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={link.href} icon={Icon.Link} />
              <Action.CopyToClipboard
                title="Copy URL"
                content={link.href}
                icon={Icon.Clipboard}
              />
              {url && (
                <Action.OpenInBrowser
                  title="Open Source Page"
                  url={url}
                  icon={Icon.ArrowUpRight}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              )}
              <HelpActions />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function toLink(raw: RawLink): Link | null {
  const href = typeof raw === "string" ? raw : raw.href;
  if (!href) return null;
  const link: Link = {
    href,
    text: typeof raw === "string" ? undefined : raw.text?.trim() || undefined,
  };
  try {
    link.hostname = new URL(href).hostname;
  } catch {
    // ignore malformed URLs
  }
  return link;
}
