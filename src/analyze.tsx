import {
  Action,
  ActionPanel,
  AI,
  Color,
  Detail,
  environment,
  Icon,
  LaunchProps,
  showToast,
  Toast,
  updateCommandMetadata,
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
import {
  type AnalyzeVerdict,
  type RiskLevel,
  parseVerdict,
  analyzePrompt,
  renderReport,
} from "./lib/analyze-schema";

type Arguments = {
  url: string;
};

type SnapshotResponse = {
  result?: {
    screenshot?: string;
    content?: string;
  };
  success?: boolean;
};

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const [verdict, setVerdict] = useState<AnalyzeVerdict | null>(null);
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

        const snapshot = await callBrowserRun<SnapshotResponse>("snapshot", {
          body: { url: target },
        });

        const screenshotB64 = snapshot.result?.screenshot;
        const html = (snapshot.result?.content ?? "").trim();
        if (!html) {
          throw new Error("Couldn't extract content from the page.");
        }

        if (screenshotB64) {
          const outPath = join(
            environment.supportPath,
            `analyze-${Date.now()}.png`,
          );
          await writeFile(outPath, Buffer.from(screenshotB64, "base64"));
          setImagePath(outPath);
        }

        toast.title = "Analyzing…";

        const raw = await AI.ask(analyzePrompt(target, html), {
          creativity: "low",
        });
        const parsed = parseVerdict(raw);
        setVerdict(parsed);

        await updateCommandMetadata({
          subtitle: `${parsed.risk.toUpperCase()} risk`,
        });

        toast.style = Toast.Style.Success;
        toast.title = riskTitle(parsed.risk);
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
    : renderVerdictMarkdown(verdict, imagePath, url, isLoading);

  const successMetadata = verdict ? (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Risk">
        <Detail.Metadata.TagList.Item
          text={verdict.risk.toUpperCase()}
          color={riskColor(verdict.risk)}
        />
      </Detail.Metadata.TagList>
      {url && <Detail.Metadata.Link title="Source" target={url} text={url} />}
      {verdict.brand_impersonated && (
        <Detail.Metadata.Label
          title="Brand impersonated"
          text={verdict.brand_impersonated}
        />
      )}
      <Detail.Metadata.Label
        title="Login form"
        text={verdict.login_form_present ? "Yes" : "No"}
      />
      <Detail.Metadata.Label
        title="Asks for credentials"
        text={verdict.asks_for_credentials ? "Yes" : "No"}
      />
      <Detail.Metadata.Label
        title="Asks for 2FA"
        text={verdict.asks_for_2fa ? "Yes" : "No"}
      />
      {verdict.suspicious_indicators.length > 0 && (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Indicators"
            text={verdict.suspicious_indicators.join(" · ")}
          />
        </>
      )}
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
              {verdict && url && (
                <Action.CopyToClipboard
                  title="Copy Markdown Report"
                  icon={Icon.Clipboard}
                  content={renderReport(verdict, url)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              )}
              {url && (
                <Action.OpenInBrowser
                  title="Open Original URL"
                  url={url}
                  icon={Icon.ArrowUpRight}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              )}
              {imagePath && (
                <Action.ShowInFinder
                  title="Show Screenshot in Finder"
                  path={imagePath}
                  icon={Icon.Finder}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
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

function riskTitle(risk: RiskLevel): string {
  return { low: "Low risk", medium: "Medium risk", high: "High risk" }[risk];
}

function riskColor(risk: RiskLevel): Color {
  return { low: Color.Green, medium: Color.Yellow, high: Color.Red }[risk];
}

function riskEmoji(risk: RiskLevel): string {
  return { low: "🟢", medium: "🟡", high: "🔴" }[risk];
}

function renderVerdictMarkdown(
  verdict: AnalyzeVerdict | null,
  imagePath: string | null,
  url: string,
  isLoading: boolean,
): string {
  if (!verdict) {
    return isLoading
      ? `# Loading…\n\n${url ? `\`${url}\`` : ""}`
      : `# Analyze\n\n${url ? `\`${url}\`` : ""}`;
  }
  const emoji = riskEmoji(verdict.risk);
  const title = riskTitle(verdict.risk);
  const screenshot = imagePath
    ? `\n\n![](${pathToFileURL(imagePath).href})`
    : "";
  return `# ${emoji} ${title}\n\n${verdict.reasoning}${screenshot}`;
}
