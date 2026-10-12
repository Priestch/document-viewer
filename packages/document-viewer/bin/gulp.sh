#!/usr/bin/env sh
#set -ex

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
(cd pdf.js && ./node_modules/.bin/gulp -f gulpfile.custom.mjs app)
rm $OUTPUT_FILE
