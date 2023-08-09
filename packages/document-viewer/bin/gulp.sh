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

gulp -f pdf.js/gulpfile.custom.mjs app
rm $OUTPUT_FILE
