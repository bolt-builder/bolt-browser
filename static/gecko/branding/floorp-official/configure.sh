# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Bolt override for the Floorp official branding. Gecko's configure only
# accepts MOZ_APP_DISPLAYNAME changes from a branding configure.sh; every
# other variable must keep its original value or configure aborts with
# "can not be set by confvars". Binary names, packaging globs, and deb
# templates rely on the unchanged values anyway. Do NOT rebrand these
# values; user-visible naming is handled by the rebrander and locales.
MOZ_APP_DISPLAYNAME="Bolt"
MOZ_MACBUNDLE_ID=Floorp
MOZ_APP_NAME="floorp"
MOZ_APP_VENDOR="Ablaze"
MOZ_APP_REMOTINGNAME="floorp"
