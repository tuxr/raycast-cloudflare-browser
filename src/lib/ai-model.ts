import { AI, getPreferenceValues } from "@raycast/api";

type Prefs = {
  aiModel?: string;
};

const DEFAULT_MODEL_KEY = "OpenAI_GPT-5_mini";

export function detonateModel(): AI.Model {
  const { aiModel } = getPreferenceValues<Prefs>();
  const key = aiModel || DEFAULT_MODEL_KEY;
  const lookup = AI.Model as Record<string, AI.Model>;
  return lookup[key] ?? lookup[DEFAULT_MODEL_KEY];
}
