#!/usr/bin/env sh
#cd pdf.js && npm i --no-save && cd -

TEMPLATE_FILE="$(pwd)/bin/gulpfile.template.js"
GULPFILE="$(pwd)/pdf.js/gulpfile.js"
OUTPUT_FILE="$(pwd)/pdf.js/gulpfile.custom.js"

cat $GULPFILE > $OUTPUT_FILE
cat $TEMPLATE_FILE >> $OUTPUT_FILE

gulp -f pdf.js/gulpfile.custom.js app
rm $OUTPUT_FILE
