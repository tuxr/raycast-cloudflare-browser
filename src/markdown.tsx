import {
  Action,
  ActionPanel,
  Detail,
  LaunchProps,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { callBrowserRun } from "./lib/client";
import { resolveUrl } from "./lib/url-input";
import {
  errorMarkdown,
  failNoUrl,
  handleBrowserRunError,
  HelpActions,
  type RenderableError,
} from "./lib/error-ux";

type Arguments = {
  url?: string;
};

type MarkdownResponse = {
  result?: string;
  success?: boolean;
};

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const [content, setContent] = useState<string | null>(null);
  const [url, setUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<RenderableError | null>(null);
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
          title: "Converting…",
          message: target,
        });

        const resp = await callBrowserRun<MarkdownResponse>("markdown", {
          body: { url: target },
        });
        setContent(resp.result ?? "");

        toast.style = Toast.Style.Success;
        toast.title = "Done";
        toast.message = undefined;
      } catch (err) {
        setError(await handleBrowserRunError(err));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const markdown = error
    ? errorMarkdown(error)
    : (content ?? `# Converting…\n\n${url ? `\`${url}\`` : ""}`);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={error?.metadata}
      actions={
        <ActionPanel>
          {content && (
            <Action.CopyToClipboard title="Copy Markdown" content={content} />
          )}
          {url && (
            <Action.OpenInBrowser
              title="Open Original URL"
              url={url}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          )}
          {url && (
            <Action.CopyToClipboard
              title="Copy URL"
              content={url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
          <HelpActions />
        </ActionPanel>
      }
    />
  );
}
