import { getPreferenceValues } from "@raycast/api";

type Prefs = {
  accountId: string;
  apiToken: string;
};

type ResponseType = "json" | "text" | "binary";

type CallOptions = {
  body: Record<string, unknown>;
  responseType?: ResponseType;
};

const BASE_URL = "https://api.cloudflare.com/client/v4";

export const CLOUDFLARE_API_TOKENS_URL =
  "https://dash.cloudflare.com/profile/api-tokens";

export const BROWSER_RUN_LIMITS_URL =
  "https://developers.cloudflare.com/browser-run/limits/";

export class BrowserRunError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(`Cloudflare ${status}: ${detail}`);
    this.name = "BrowserRunError";
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  get isRateLimit(): boolean {
    return this.status === 429;
  }
}

export class MissingPreferencesError extends Error {
  constructor() {
    super("Set Cloudflare Account ID and API Token in extension preferences.");
    this.name = "MissingPreferencesError";
  }
}

export async function callBrowserRun<T = unknown>(
  endpoint: string,
  opts: CallOptions,
): Promise<T> {
  const { accountId, apiToken } = getPreferenceValues<Prefs>();
  if (!accountId || !apiToken) {
    throw new MissingPreferencesError();
  }

  const url = `${BASE_URL}/accounts/${accountId}/browser-rendering/${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(opts.body),
  });

  if (!res.ok) {
    const retryHeader = res.headers.get("retry-after");
    const retryAfterSeconds = retryHeader ? parseRetryAfter(retryHeader) : undefined;
    throw new BrowserRunError(res.status, await readError(res), retryAfterSeconds);
  }

  const type: ResponseType = opts.responseType ?? "json";
  if (type === "binary") return (await res.arrayBuffer()) as T;
  if (type === "text") return (await res.text()) as T;
  return (await res.json()) as T;
}

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.clone().json()) as {
      errors?: { message: string }[];
    };
    if (j.errors?.length) {
      return j.errors.map((e) => e.message).join("; ");
    }
  } catch {
    // not JSON, fall through
  }
  try {
    return await res.text();
  } catch {
    return res.statusText;
  }
}

function parseRetryAfter(raw: string): number | undefined {
  const asInt = Number(raw);
  if (Number.isFinite(asInt) && asInt > 0) return asInt;
  const asDate = Date.parse(raw);
  if (Number.isFinite(asDate)) {
    const diff = Math.ceil((asDate - Date.now()) / 1000);
    return diff > 0 ? diff : undefined;
  }
  return undefined;
}

export function isLikelyUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
