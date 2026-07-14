#!/usr/bin/env bash
# Generate PDF from SYSTEM_ARCHITECTURE.html using headless Chrome
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
HTML="$DIR/SYSTEM_ARCHITECTURE.html"
PDF="$DIR/SYSTEM_ARCHITECTURE.pdf"
CHROME="${CHROME_BIN:-google-chrome}"

if [ ! -f "$HTML" ]; then
  echo "Missing $HTML"
  exit 1
fi

"$CHROME" --headless --disable-gpu --no-sandbox \
  --print-to-pdf="$PDF" \
  --print-to-pdf-no-header \
  "file://$HTML"

echo "PDF written to $PDF"
