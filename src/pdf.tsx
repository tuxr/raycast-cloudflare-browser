import {
  Action,
  ActionPanel,
  Detail,
  environment,
  Icon,
  LaunchProps,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
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

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [pdfSize, setPdfSize] = useState<number | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
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
          title: "Rendering PDF…",
          message: target,
        });

        const buf = await callBrowserRun<ArrayBuffer>("pdf", {
          body: { url: target },
          responseType: "binary",
        });

        const outPath = join(
          environment.supportPath,
          `page-${Date.now()}.pdf`,
        );
        await writeFile(outPath, Buffer.from(buf));
        const stats = await stat(outPath);

        setPdfPath(outPath);
        setPdfSize(stats.size);
        setGeneratedAt(new Date());

        toast.style = Toast.Style.Success;
        toast.title = "PDF ready";
        toast.message = undefined;
      } catch (err) {
        setError(await handleBrowserRunError(err));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const ready = pdfPath !== null && pdfSize !== null && generatedAt !== null;
  const markdown = error
    ? errorMarkdown(error)
    : ready
      ? "# PDF ready"
      : `# Rendering PDF…\n\n${url ? `\`${url}\`` : ""}`;

  const successMetadata = ready ? (
    <Detail.Metadata>
      {url && <Detail.Metadata.Link title="Source" target={url} text={url} />}
      <Detail.Metadata.Label title="Size" text={formatBytes(pdfSize!)} />
      <Detail.Metadata.Label
        title="Generated"
        text={generatedAt!.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })}
      />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Filename" text={basename(pdfPath!)} />
    </Detail.Metadata>
  ) : undefined;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={error?.metadata ?? successMetadata}
      actions={
        <ActionPanel>
          {pdfPath && (
            <Action
              title="Open PDF"
              icon={Icon.Eye}
              onAction={() => void open(pdfPath)}
            />
          )}
          {pdfPath && <Action.OpenWith path={pdfPath} />}
          {pdfPath && <Action.ShowInFinder path={pdfPath} />}
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

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
