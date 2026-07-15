#!/usr/bin/env bash
# Build CoffeeChain Testing Manual PDF (black & white)
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
python3 "$DIR/build-testing-manual.py"
HTML="$DIR/TESTING_MANUAL.html"
PDF="$DIR/TESTING_MANUAL.pdf"

for CHROME in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$CHROME" >/dev/null 2>&1; then
    "$CHROME" --headless=new --disable-gpu --no-sandbox \
      --no-pdf-header-footer \
      --print-to-pdf="$PDF" \
      "file://$HTML"
    echo "PDF written to $PDF"
    exit 0
  fi
done

echo "Chrome/Chromium not found. Open TESTING_MANUAL.html in a browser and Print to PDF."
exit 1
