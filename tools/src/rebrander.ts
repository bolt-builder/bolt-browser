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

// CI packaging rebrands the mach-packaged output instead of _dist/bin, and
// rebrands the macOS bundle from a Linux runner (cross-packaging). BOLT_BIN_DIR
// points at the runtime dir to rebrand; BOLT_MAC_TARGET=1 forces the macOS
// bundle rebrand even when the build host is not darwin.
const TARGET_DIR = Deno.env.get("BOLT_BIN_DIR") ?? BIN_DIR;
const MAC_TARGET = PLATFORM === "darwin" ||
  Deno.env.get("BOLT_MAC_TARGET") === "1";

function rebrandStrings(): number {
  let count = 0;
  for (const [relative, content] of STRING_FILES) {
    const target = path.join(TARGET_DIR, relative);
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
    const target = path.join(TARGET_DIR, relative);
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

/**
 * Rewrites a macOS Info.plist so the bundle presents itself as Bolt:
 * CFBundleName and CFBundleDisplayName are set to Bolt (the display name is
 * inserted after CFBundleName when the plist lacks it), and CFBundleIconName
 * is stripped. macOS prefers the CFBundleIconName entry in the compiled
 * Assets.car (which still holds the Floorp icon) over CFBundleIconFile, so
 * removing it lets the replaced firefox.icns be what the Dock actually shows.
 */
export function updateMacInfoPlist(original: string): string {
  let updated = original
    .replace(
      /(<key>CFBundleName<\/key>\s*<string>)[^<]*(<\/string>)/,
      "$1Bolt$2",
    )
    .replace(
      /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/,
      "$1Bolt$2",
    )
    .replace(/\s*<key>CFBundleIconName<\/key>\s*<string>[^<]*<\/string>/, "");
  if (!updated.includes("<key>CFBundleDisplayName</key>")) {
    updated = updated.replace(
      /(<key>CFBundleName<\/key>\s*<string>[^<]*<\/string>)/,
      "$1\n  <key>CFBundleDisplayName</key>\n  <string>Bolt</string>",
    );
  }
  return updated;
}

/**
 * Rewrites the runtime AppConstants module source so the app identifies as
 * Bolt (basename, display name, and macOS bundle name).
 */
export function updateAppConstants(original: string): string {
  return original
    .replace(/(MOZ_APP_BASENAME:\s*")[^"]*(")/, "$1Bolt$2")
    .replace(/(MOZ_APP_DISPLAYNAME_DO_NOT_USE:\s*")[^"]*(")/, "$1Bolt$2")
    .replace(/(MOZ_MACBUNDLE_NAME:\s*")[^"]*(")/, "$1Bolt.app$2");
}

/**
 * Rewrites application.ini so the [App] identity is Bolt. Name= and
 * Profile= lines are only rewritten inside the [App] section; matching
 * keys in other sections are left untouched.
 */
export function updateApplicationIni(original: string): string {
  let inApp = false;
  return original
    .split("\n")
    .map((line) => {
      const section = line.match(/^\[(.*)\]\s*$/);
      if (section) {
        inApp = section[1] === "App";
        return line;
      }
      if (!inApp) return line;
      if (/^Name=/.test(line)) return "Name=Bolt";
      if (/^Profile=/.test(line)) return "Profile=Bolt";
      return line;
    })
    .join("\n");
}

function rebrandMacBundle(): void {
  // The target on macOS is <app>/Contents/Resources
  const contents = path.resolve(TARGET_DIR, "..");
  const app = path.resolve(contents, "..");

  const plist = path.join(contents, "Info.plist");
  if (exists(plist)) {
    const original = Deno.readTextFileSync(plist);
    const updated = updateMacInfoPlist(original);
    if (updated !== original) {
      Deno.writeTextFileSync(plist, updated);
      logger.info("Info.plist bundle name set to Bolt (icon catalog unpinned).");
    }
  }

  // Remove the Floorp asset catalog so nothing can resolve its icon.
  const assets = path.join(TARGET_DIR, "Assets.car");
  if (exists(assets)) {
    Deno.removeSync(assets);
    logger.info("Removed Floorp Assets.car icon catalog.");
  }

  const icns = path.join(TARGET_DIR, "firefox.icns");
  const icnsSource = path.join(PATHS.root, "assets", "brand", "icon.icns");
  if (exists(icns) && exists(icnsSource)) {
    Deno.copyFileSync(icnsSource, icns);
    // Bump the bundle mtime so LaunchServices and the Dock notice the new
    // icon; replacing bytes inside an existing .app alone often keeps the
    // stale cached icon.
    const now = new Date();
    Deno.utimeSync(app, now, now);
    Deno.utimeSync(contents, now, now);
    logger.info("Bundle icon replaced with the Bolt desktop icon.");
  } else {
    logger.warn(
      `Bundle icon not replaced (icns exists: ${exists(icns)}, source exists: ${
        exists(icnsSource)
      }).`,
    );
  }

  // The bundle content changed, so re-sign ad hoc; otherwise macOS may
  // refuse to launch the modified app. codesign only exists on macOS; when
  // cross-packaging on Linux the DMG is assembled unsigned anyway.
  if (PLATFORM !== "darwin") {
    logger.info("Skipping ad-hoc codesign (build host is not macOS).");
    return;
  }
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
  if (!exists(TARGET_DIR)) {
    logger.warn("Runtime not installed yet; skipping Bolt rebranding.");
    return;
  }

  const strings = rebrandStrings();
  const images = rebrandImages();
  if (MAC_TARGET) {
    rebrandMacBundle();
  }

  logger.success(
    `Bolt branding applied (${strings} string files, ${images} images).`,
  );
}
