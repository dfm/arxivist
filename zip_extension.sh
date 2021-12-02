#!/bin/sh

set -e

if [[ "$1" = "v2" ]]; then
    echo "Making v2 manifest..."
    sed 's/{{manifest_version}}/2/g;s/{{action}}/browser_action/g' manifest.json.template > manifest.json
else
    echo "Making v3 manifest..."
    sed 's/{{manifest_version}}/3/g;s/{{action}}/action/g' manifest.json.template > manifest.json
fi

EXTENSION=arxivist

VERSION=$(grep '"version":' manifest.json | sed 's/.*"\([0-9.]*\)".*/\1/')
OUT="$EXTENSION"-"$VERSION"

# Create a zip file that can be uploaded to Firefox Addons or the Chrome Web Store
rm -f "$OUT"
zip -r -FS "$OUT".zip manifest.json src/* icons/*
echo Created .zip web extension: "$OUT".zip

