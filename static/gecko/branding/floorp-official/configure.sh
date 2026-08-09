# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Bolt override for the Floorp official branding. MOZ_APP_NAME and
# MOZ_APP_REMOTINGNAME stay "floorp" so binary names, packaging globs,
# and deb templates keep working; only user-visible names change.
MOZ_APP_DISPLAYNAME="Bolt"
MOZ_MACBUNDLE_ID=Bolt
MOZ_APP_NAME="floorp"
MOZ_APP_VENDOR="Bolt Builder"
MOZ_APP_REMOTINGNAME="floorp"
