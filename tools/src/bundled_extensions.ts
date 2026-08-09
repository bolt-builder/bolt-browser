// SPDX-License-Identifier: MPL-2.0

import * as path from "@std/path";
import { createHash } from "node:crypto";
import { BIN_DIR } from "./defines.ts";
import { exists, Logger } from "./utils.ts";

const logger = new Logger("bundled-extensions");

/**
 * Seeds default extensions into the runtime's `distribution/extensions`
 * directory. Gecko installs them into profiles on startup as regular,
 * user-removable add-ons, and AMO keeps them updated afterward, so the
 * pinned version below is only the initial seed.
 */

interface BundledExtension {
  /** Gecko extension ID; the XPI must be named `<id>.xpi`. */
  id: string;
  /** Exact versioned AMO download URL. */
  url: string;
  /** SHA-256 of the pinned XPI, verified after download. */
  sha256: string;
}

const EXTENSIONS: BundledExtension[] = [
  {
    id: "uBlock0@raymondhill.net",
    url:
      "https://addons.mozilla.org/firefox/downloads/file/4940584/ublock_origin-1.73.0.xpi",
    sha256: "bccc51a773150af4af6e1fd62c7bfdeb7238b79ff2381b998fa9f2e38f64786a",
  },
];

function digest(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

async function seed(extension: BundledExtension, dir: string): Promise<void> {
  const target = path.join(dir, `${extension.id}.xpi`);

  if (exists(target)) {
    const current = digest(Deno.readFileSync(target));
    if (current === extension.sha256) return;
  }

  logger.info(`Downloading bundled extension: ${extension.id}`);
  const response = await fetch(extension.url);
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }
  const data = new Uint8Array(await response.arrayBuffer());

  const actual = digest(data);
  if (actual !== extension.sha256) {
    throw new Error(
      `SHA-256 mismatch for ${extension.id}: expected ${extension.sha256}, got ${actual}`,
    );
  }

  Deno.writeFileSync(target, data);
  logger.success(`Bundled ${extension.id} (${data.length} bytes).`);
}

export async function run(): Promise<void> {
  if (!exists(BIN_DIR)) {
    logger.warn("Runtime not installed yet; skipping bundled extensions.");
    return;
  }

  const dir = path.join(BIN_DIR, "distribution", "extensions");
  Deno.mkdirSync(dir, { recursive: true });

  for (const extension of EXTENSIONS) {
    try {
      await seed(extension, dir);
    } catch (e) {
      // Never fail the build over a bundled extension; the browser works
      // without it and the next build retries the download.
      logger.warn(
        `Could not bundle ${extension.id}: ${
          e instanceof Error ? e.message : e
        }`,
      );
    }
  }
}
