import { AI, getPreferenceValues } from "@raycast/api";

type Prefs = {
  aiModel?: string;
};

/**
 * Resolve the AI model for Detonate.
 *
 * Returns `undefined` when the user picked "Use Raycast Default" (or no
 * preference is set), letting `AI.ask` fall back to the user's global
 * Raycast AI default. Returns a specific `AI.Model` when the user picked
 * a concrete override.
 */
export function detonateModel(): AI.Model | undefined {
  const { aiModel } = getPreferenceValues<Prefs>();
  if (!aiModel || aiModel === "default") return undefined;
  const lookup = AI.Model as Record<string, AI.Model>;
  return lookup[aiModel];
}
