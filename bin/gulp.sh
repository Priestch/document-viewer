#!/usr/bin/env sh
TEMPLATE_FILE="$(pwd)/bin/gulpfile.template.txt"
OUTPUT_FILE="$(pwd)/pdf.js/gulpfile.custom.js"

cat $TEMPLATE_FILE > $OUTPUT_FILE

gulp -f pdf.js/gulpfile.custom.js
rm $OUTPUT_FILE