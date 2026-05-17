import {
  Action,
  ActionPanel,
  Detail,
  environment,
  Icon,
  LaunchProps,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { callBrowserRun } from "./lib/client";
import { resolveUrl } from "./lib/url-input";
import {
  errorMarkdown,
  failNoUrl,
  handleBrowserRunError,
  HelpActions,
  MissingPreferencesActions,
  type RenderableError,
} from "./lib/error-ux";

type Arguments = {
  url: string;
};

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const [imagePath, setImagePath] = useState<string | null>(null);
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

        const buf = await callBrowserRun<ArrayBuffer>("screenshot", {
          body: { url: target, screenshotOptions: { type: "png" } },
          responseType: "binary",
        });

        const outPath = join(
          environment.supportPath,
          `screenshot-${Date.now()}.png`,
        );
        await writeFile(outPath, Buffer.from(buf));
        setImagePath(outPath);

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
    : imagePath
      ? `![](${pathToFileURL(imagePath).href})`
      : `# Loading…\n\n${url ? `\`${url}\`` : ""}`;

  const successMetadata = imagePath ? (
    <Detail.Metadata>
      {url && <Detail.Metadata.Link title="Source" target={url} text={url} />}
      <Detail.Metadata.Label
        title="File"
        text={imagePath.split("/").pop() ?? "screenshot.png"}
      />
    </Detail.Metadata>
  ) : undefined;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={error?.metadata ?? successMetadata}
      actions={
        <ActionPanel>
          {error?.title === "Not Configured" ? (
            <MissingPreferencesActions />
          ) : (
            <>
              {imagePath && (
                <Action.OpenWith
                  title="Open Image"
                  path={imagePath}
                  icon={Icon.Image}
                />
              )}
              {imagePath && (
                <Action.ShowInFinder path={imagePath} icon={Icon.Finder} />
              )}
              {url && (
                <Action.OpenInBrowser
                  title="Open Original URL"
                  url={url}
                  icon={Icon.ArrowUpRight}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              )}
              {url && (
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={url}
                  icon={Icon.Clipboard}
                />
              )}
              <HelpActions />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
