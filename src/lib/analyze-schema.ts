export type RiskLevel = "low" | "medium" | "high";

export type AnalyzeVerdict = {
  risk: RiskLevel;
  reasoning: string;
  brand_impersonated: string | null;
  login_form_present: boolean;
  asks_for_credentials: boolean;
  asks_for_2fa: boolean;
  suspicious_indicators: string[];
};

const MAX_HTML_CHARS = 20000;

export function analyzePrompt(url: string, html: string): string {
  const truncated =
    html.length > MAX_HTML_CHARS
      ? html.slice(0, MAX_HTML_CHARS) + "\n…[truncated]"
      : html;

  return [
    "You are a security analyst reviewing a webpage for phishing or social-engineering indicators.",
    "Be conservative and skeptical. Don't flag legitimate sites as high risk, but don't miss obvious phishing either.",
    "",
    "Pay special attention to:",
    '- <form action="…"> URLs (phishing often POSTs credentials to unrelated domains)',
    '- <input type="password"> or 2FA-related inputs',
    "- Brand impersonation via favicon, logos, or copy that mimics a known service",
    "- Mismatched domains between page branding and actual host",
    "",
    `URL: ${url}`,
    "",
    "Page HTML:",
    truncated,
    "",
    "Output ONLY a single valid JSON object matching this exact shape. No markdown code fences, no preamble, no trailing prose.",
    "",
    "{",
    '  "risk": "low" | "medium" | "high",',
    '  "reasoning": string,                    // 1-2 sentences explaining the risk level',
    '  "brand_impersonated": string | null,    // brand being impersonated, or null',
    '  "login_form_present": boolean,',
    '  "asks_for_credentials": boolean,',
    '  "asks_for_2fa": boolean,',
    '  "suspicious_indicators": string[]       // short bullet-style strings',
    "}",
  ].join("\n");
}

export function parseVerdict(raw: string): AnalyzeVerdict {
  const cleaned = stripFences(raw).trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `AI response was not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!isVerdict(parsed)) {
    throw new Error("AI response did not match the expected schema.");
  }
  return parsed;
}

function stripFences(raw: string): string {
  return raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
}

function isVerdict(x: unknown): x is AnalyzeVerdict {
  if (!x || typeof x !== "object") return false;
  const v = x as Record<string, unknown>;
  return (
    (v.risk === "low" || v.risk === "medium" || v.risk === "high") &&
    typeof v.reasoning === "string" &&
    (v.brand_impersonated === null ||
      typeof v.brand_impersonated === "string") &&
    typeof v.login_form_present === "boolean" &&
    typeof v.asks_for_credentials === "boolean" &&
    typeof v.asks_for_2fa === "boolean" &&
    Array.isArray(v.suspicious_indicators) &&
    v.suspicious_indicators.every((s) => typeof s === "string")
  );
}

export function renderReport(verdict: AnalyzeVerdict, url: string): string {
  return [
    "# Analyze Report",
    "",
    `**URL:** ${url}`,
    `**Risk:** ${verdict.risk.toUpperCase()}`,
    `**Brand impersonated:** ${verdict.brand_impersonated ?? "None"}`,
    `**Login form present:** ${verdict.login_form_present ? "Yes" : "No"}`,
    `**Asks for credentials:** ${verdict.asks_for_credentials ? "Yes" : "No"}`,
    `**Asks for 2FA:** ${verdict.asks_for_2fa ? "Yes" : "No"}`,
    "",
    "## Reasoning",
    verdict.reasoning,
    "",
    "## Suspicious indicators",
    verdict.suspicious_indicators.length > 0
      ? verdict.suspicious_indicators.map((s) => `- ${s}`).join("\n")
      : "(none)",
  ].join("\n");
}
