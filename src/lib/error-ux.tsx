import {
  Action,
  Detail,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import {
  BROWSER_RUN_LIMITS_URL,
  BrowserRunError,
  CLOUDFLARE_API_TOKENS_URL,
  MissingPreferencesError,
} from "./client";

export type RenderableError = {
  title: string;
  body: string;
  metadata?: JSX.Element;
};

export async function handleBrowserRunError(
  err: unknown,
): Promise<RenderableError> {
  if (err instanceof MissingPreferencesError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Set up required",
      primaryAction: {
        title: "Open Preferences",
        onAction: openExtensionPreferences,
      },
      secondaryAction: {
        title: "Create API Token",
        onAction: () => void open(CLOUDFLARE_API_TOKENS_URL),
      },
    });
    return {
      title: "Set up required",
      body: "Add your Cloudflare Account ID and API Token in preferences.",
    };
  }

  if (err instanceof BrowserRunError && err.isAuthError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Auth failed",
      message: "Token needs 'Browser Rendering: Edit'.",
      primaryAction: {
        title: "Create API Token",
        onAction: () => void open(CLOUDFLARE_API_TOKENS_URL),
      },
      secondaryAction: {
        title: "Open Preferences",
        onAction: openExtensionPreferences,
      },
    });
    return {
      title: "Auth failed",
      body: "Token needs the 'Browser Rendering: Edit' permission.",
    };
  }

  if (err instanceof BrowserRunError && err.isRateLimit) {
    const wait = err.retryAfterSeconds
      ? `${err.retryAfterSeconds}s`
      : "a few seconds";
    await showToast({
      style: Toast.Style.Failure,
      title: "Rate limited",
      message: `Wait ${wait} and try again.`,
      primaryAction: {
        title: "View Limits",
        onAction: () => void open(BROWSER_RUN_LIMITS_URL),
      },
    });
    return {
      title: "Rate limited",
      body: `Wait ${wait} and try again.`,
      metadata: (
        <RateLimitMetadata retryAfterSeconds={err.retryAfterSeconds} />
      ),
    };
  }

  const message = err instanceof Error ? err.message : String(err);
  await showToast({
    style: Toast.Style.Failure,
    title: "Failed",
    message,
  });
  return {
    title: "Failed",
    body: message,
  };
}

export async function failNoUrl(): Promise<RenderableError> {
  await showToast({
    style: Toast.Style.Failure,
    title: "No URL",
  });
  return {
    title: "No URL",
    body: "Pass one as an argument or copy a URL to the clipboard.",
  };
}

export function errorMarkdown(error: RenderableError): string {
  return `# ${error.title}\n\n${error.body}`;
}

export function HelpActions(): JSX.Element {
  return (
    <>
      <Action.OpenInBrowser
        title="Create Cloudflare API Token"
        url={CLOUDFLARE_API_TOKENS_URL}
        shortcut={{ modifiers: ["cmd"], key: "h" }}
      />
      <Action
        title="Open Extension Preferences"
        onAction={openExtensionPreferences}
      />
    </>
  );
}

function RateLimitMetadata({
  retryAfterSeconds,
}: {
  retryAfterSeconds?: number;
}): JSX.Element {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="Retry after"
        text={retryAfterSeconds ? `${retryAfterSeconds}s` : "—"}
      />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Free plan" text="~2 browsers/min" />
      <Detail.Metadata.Label title="Paid plan" text="10 browsers/min" />
      <Detail.Metadata.Link
        title="Docs"
        target={BROWSER_RUN_LIMITS_URL}
        text="Browser Run limits"
      />
    </Detail.Metadata>
  );
}
