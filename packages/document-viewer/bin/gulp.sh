#!/usr/bin/env sh
#set -ex

# The pdf.js v5.7+ build toolchain requires Node >= 20.18 (cheerio -> undici
# uses the `File` global, absent from Node 18: "ReferenceError: File is not
# defined"). If the ambient node is older, re-exec this script under the
# newest fnm-installed Node >= 20. Runs verbatim when a suitable node is
# already first in PATH.
if [ -z "$VIEWER_BUILD_NODE_REEXEC" ]; then
  if [ "$(node -p 'Number(process.versions.node.split(".")[0]) < 20')" = "true" ]; then
    newer=$(
      ls -d "$HOME"/.fnm/node-versions/*/installation/bin "$HOME"/.local/share/fnm/node-versions/*/installation/bin 2>/dev/null |
        sed 's#.*/node-versions/##;s#/installation/bin##' |
        sort -Vu | tail -1
    )
    case "$newer" in
      v2[0-9]*)
        echo "Ambient node is $(node --version); re-running with fnm $newer (pdf.js v5.7+ needs Node >= 20)."
        export VIEWER_BUILD_NODE_REEXEC=1
        exec env PATH="$HOME/.fnm/node-versions/$newer/installation/bin:$PATH" "$0" "$@"
        ;;
      *)
        echo "WARNING: node $(node --version) is too old for the pdf.js v5.7+ build (needs >= 20.18) and no fnm Node >= 20 was found." >&2
        ;;
    esac
  fi
fi

if [ "${FORCE_INSTALL_DEPENDENCIES}" ]; then
  # install dependencies for PDF.js
  cd pdf.js && npm ci --force && cd -
else
  echo "Skip preparing dependencies for PDF.js."
  echo
fi

TEMPLATE_FILE="$(pwd)/bin/gulpfile.template.js"
GULPFILE="$(pwd)/pdf.js/gulpfile.mjs"
OUTPUT_FILE="$(pwd)/pdf.js/gulpfile.custom.mjs"

cat $GULPFILE > $OUTPUT_FILE
cat $TEMPLATE_FILE >> $OUTPUT_FILE

# Use the gulp toolchain installed inside the pdf.js submodule (its version is
# pinned by the upstream lockfile); the workspace-level gulp may be older and
# its bundled CLI rejects the submodule's gulp as "Unsupported gulp version".
# The subshell's exit status must propagate: a trailing `rm` used to make this
# script exit 0 even when gulp failed, so callers (viewer:build, the upgrade
# automation) recorded a failed build as ok while serving a stale dist.
(cd pdf.js && ./node_modules/.bin/gulp -f gulpfile.custom.mjs app) || {
  status=$?
  rm $OUTPUT_FILE
  exit $status
}
rm $OUTPUT_FILE
