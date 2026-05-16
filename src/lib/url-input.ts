import { Clipboard, getSelectedText } from "@raycast/api";
import { isLikelyUrl } from "./client";

export async function resolveUrl(argUrl?: string): Promise<string | null> {
  const trimmedArg = argUrl?.trim();
  if (trimmedArg && isLikelyUrl(trimmedArg)) return trimmedArg;

  try {
    const selected = (await getSelectedText()).trim();
    if (isLikelyUrl(selected)) return selected;
  } catch {
    // No selection - fall through
  }

  const clip = (await Clipboard.readText())?.trim() ?? "";
  if (isLikelyUrl(clip)) return clip;

  return null;
}
