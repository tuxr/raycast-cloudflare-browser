import { environment } from "@raycast/api";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { callBrowserRun } from "../lib/client";

type Input = {
  /** Fully-qualified http(s) URL to screenshot. */
  url: string;
};

/**
 * Capture a PNG screenshot of a URL via Cloudflare Browser Run.
 * Returns the local path where the screenshot was saved.
 */
export default async function tool(input: Input) {
  const buf = await callBrowserRun<ArrayBuffer>("screenshot", {
    body: { url: input.url, screenshotOptions: { type: "png" } },
    responseType: "binary",
  });

  const path = join(environment.supportPath, `screenshot-${Date.now()}.png`);
  await writeFile(path, Buffer.from(buf));

  return {
    url: input.url,
    path,
  };
}
