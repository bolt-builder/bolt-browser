// SPDX-License-Identifier: MPL-2.0

import * as path from "@std/path";
import { BIN_DIR, PATHS, PLATFORM } from "./defines.ts";
import { exists, Logger, runCommandChecked } from "./utils.ts";

const logger = new Logger("rebrander");

/**
 * Applies Bolt branding to the extracted Floorp runtime in _dist/bin.
 *
 * The runtime ships with Floorp branding baked in (brand string files,
 * branding images, and on macOS the bundle name and icon). This step runs
 * after the patcher on every build so a freshly installed or reverted
 * runtime always comes out branded as Bolt.
 *
 * In-app branding images (about-logo, icons, wordmarks) use the classic
 * Bolt logo; OS-facing surfaces (window icons, macOS bundle icon) use the
 * dedicated Bolt desktop icon so it stays distinct from other Bolt apps.
 */

const BRAND_FTL = `-brand-shorter-name = Bolt
-brand-short-name = Bolt
-brand-shortcut-name = Bolt
-brand-full-name = Bolt
-brand-product-name = Bolt
-vendor-short-name = Bolt Builder
trademarkInfo = Bolt is built on Floorp by Ablaze.
`;

const BRAND_PROPERTIES = `brandShorterName=Bolt
brandShortName=Bolt
brandFullName=Bolt
vendorShortName=Bolt Builder
`;

const BRAND_DTD = `<!ENTITY  brandShortName        "Bolt">
`;

const STRING_FILES: [string, string][] = [
  ["browser/localization/en-US/branding/brand.ftl", BRAND_FTL],
  ["browser/chrome/en-US/locale/branding/brand.properties", BRAND_PROPERTIES],
  ["browser/chrome/en-US/locale/branding/brand.dtd", BRAND_DTD],
];

const CONTENT_BRANDING = "browser/chrome/browser/content/branding";
const WINDOW_ICONS = "browser/chrome/icons/default";

/** repo asset name -> runtime-relative destination */
const ASSET_MAP: [string, string][] = [
  ["about-logo.png", `${CONTENT_BRANDING}/about-logo.png`],
  ["about-logo@2x.png", `${CONTENT_BRANDING}/about-logo@2x.png`],
  ["about-logo-private.png", `${CONTENT_BRANDING}/about-logo-private.png`],
  [
    "about-logo-private@2x.png",
    `${CONTENT_BRANDING}/about-logo-private@2x.png`,
  ],
  ["about-logo.svg", `${CONTENT_BRANDING}/about-logo.svg`],
  ["about.png", `${CONTENT_BRANDING}/about.png`],
  ["about-wordmark.svg", `${CONTENT_BRANDING}/about-wordmark.svg`],
  ["firefox-wordmark.svg", `${CONTENT_BRANDING}/firefox-wordmark.svg`],
  ["icon16.png", `${CONTENT_BRANDING}/icon16.png`],
  ["icon32.png", `${CONTENT_BRANDING}/icon32.png`],
  ["icon48.png", `${CONTENT_BRANDING}/icon48.png`],
  ["icon64.png", `${CONTENT_BRANDING}/icon64.png`],
  ["icon128.png", `${CONTENT_BRANDING}/icon128.png`],
  ["default16.png", `${WINDOW_ICONS}/default16.png`],
  ["default32.png", `${WINDOW_ICONS}/default32.png`],
  ["default48.png", `${WINDOW_ICONS}/default48.png`],
  ["default64.png", `${WINDOW_ICONS}/default64.png`],
  ["default128.png", `${WINDOW_ICONS}/default128.png`],
  ["default256.png", `${WINDOW_ICONS}/default256.png`],
];

const ASSET_SOURCE = path.join(PATHS.root, "static", "branding", "bolt");

function rebrandStrings(): number {
  let count = 0;
  for (const [relative, content] of STRING_FILES) {
    const target = path.join(BIN_DIR, relative);
    if (!exists(target)) {
      logger.warn(`Brand string file not found, skipping: ${relative}`);
      continue;
    }
    Deno.writeTextFileSync(target, content);
    count++;
  }
  return count;
}

function rebrandImages(): number {
  let count = 0;
  for (const [asset, relative] of ASSET_MAP) {
    const source = path.join(ASSET_SOURCE, asset);
    const target = path.join(BIN_DIR, relative);
    if (!exists(source)) {
      logger.warn(`Bolt asset missing, skipping: ${asset}`);
      continue;
    }
    // Only replace files the runtime actually ships; new files would not
    // be registered in its chrome manifests anyway.
    if (!exists(target)) continue;
    Deno.copyFileSync(source, target);
    count++;
  }
  return count;
}

function rebrandMacBundle(): void {
  // BIN_DIR on darwin is <app>/Contents/Resources
  const contents = path.resolve(BIN_DIR, "..");
  const app = path.resolve(contents, "..");

  const plist = path.join(contents, "Info.plist");
  if (exists(plist)) {
    const original = Deno.readTextFileSync(plist);
    const updated = original
      .replace(
        /(<key>CFBundleName<\/key>\s*<string>)[^<]*(<\/string>)/,
        "$1Bolt$2",
      )
      .replace(
        /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/,
        "$1Bolt$2",
      );
    if (updated !== original) {
      Deno.writeTextFileSync(plist, updated);
      logger.info("Info.plist bundle name set to Bolt.");
    }
  }

  const icns = path.join(BIN_DIR, "firefox.icns");
  const icnsSource = path.join(PATHS.root, "assets", "brand", "icon.icns");
  if (exists(icns) && exists(icnsSource)) {
    Deno.copyFileSync(icnsSource, icns);
    logger.info("Bundle icon replaced with the Bolt desktop icon.");
  }

  // The bundle content changed, so re-sign ad hoc; otherwise macOS may
  // refuse to launch the modified app.
  const result = runCommandChecked(
    "codesign",
    ["--force", "--deep", "--sign", "-", app],
    contents,
  );
  if (!result.success) {
    logger.warn(
      "Ad-hoc codesign failed; the modified bundle may not launch until re-signed.",
    );
  }
}

export function run(): void {
  if (!exists(BIN_DIR)) {
    logger.warn("Runtime not installed yet; skipping Bolt rebranding.");
    return;
  }

  const strings = rebrandStrings();
  const images = rebrandImages();
  if (PLATFORM === "darwin") {
    rebrandMacBundle();
  }

  logger.success(
    `Bolt branding applied (${strings} string files, ${images} images).`,
  );
}
