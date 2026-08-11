// SPDX-License-Identifier: MPL-2.0

import { assert, assertEquals } from "@std/assert";
import {
  updateAppConstants,
  updateApplicationIni,
  updateMacInfoPlist,
} from "./rebrander.ts";

Deno.test("updateMacInfoPlist adds Bolt display name when missing", () => {
  const original = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>floorp</string>
  <key>CFBundleName</key>
  <string>Floorp</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
</dict>
</plist>`;

  const updated = updateMacInfoPlist(original);

  assertEquals(updated.includes("<key>CFBundleName</key>\n  <string>Bolt</string>"), true);
  assertEquals(updated.includes("<key>CFBundleDisplayName</key>\n  <string>Bolt</string>"), true);
  assertEquals(updated.includes("<key>CFBundleIconName</key>"), false);
  assert(updated.includes("CFBundleExecutable"));
});

Deno.test("updateAppConstants rewrites runtime app constants", () => {
  const original = `export const AppConstants = {
  MOZ_APP_BASENAME: "Floorp",
  MOZ_APP_DISPLAYNAME_DO_NOT_USE: "Floorp",
  MOZ_MACBUNDLE_NAME: "Floorp.app",
};`;

  const updated = updateAppConstants(original);

  assertEquals(updated.includes('MOZ_APP_BASENAME: "Bolt"'), true);
  assertEquals(updated.includes('MOZ_APP_DISPLAYNAME_DO_NOT_USE: "Bolt"'), true);
  assertEquals(updated.includes('MOZ_MACBUNDLE_NAME: "Bolt.app"'), true);
});

Deno.test("updateApplicationIni rewrites the app identity", () => {
  const original = `[App]\nName=Floorp\nProfile=Floorp\n`;

  const updated = updateApplicationIni(original);

  assertEquals(updated.includes("Name=Bolt"), true);
  assertEquals(updated.includes("Profile=Bolt"), true);
});
