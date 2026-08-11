/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * `splitViewPanels` can stay populated for a short time after split-view
 * deactivates. Treat panel ids as "live split UI" only while Bolt's
 * split-view root attribute is still present.
 */
export function hasLiveSplitPanelsState(
  panelCount: number,
  hasFloorpSplitAttr: boolean,
): boolean {
  return hasFloorpSplitAttr && panelCount >= 2;
}
