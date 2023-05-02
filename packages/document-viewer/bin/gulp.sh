#!/usr/bin/env sh
#set -ex

if [ "${REBUILD_PDFJS}" ]; then
  cd pdf.js && npm ci --force && cd -
else
  echo "Skip build pdf.js."
  echo
fi

TEMPLATE_FILE="$(pwd)/bin/gulpfile.template.js"
GULPFILE="$(pwd)/pdf.js/gulpfile.js"
OUTPUT_FILE="$(pwd)/pdf.js/gulpfile.custom.js"

cat $GULPFILE > $OUTPUT_FILE
cat $TEMPLATE_FILE >> $OUTPUT_FILE

gulp -f pdf.js/gulpfile.custom.js app
rm $OUTPUT_FILE
