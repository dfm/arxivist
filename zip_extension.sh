#!/bin/sh

set -e

EXTENSION=arxivist

# Set working directory to location of this script
#cd $(dirname $(readlink -m "$0"))
ls

VERSION=$(grep '"version":' manifest.json | sed 's/.*"\([0-9.]*\)".*/\1/')
OUT="$EXTENSION"-"$VERSION"

# Create a zip file that can be uploaded to Firefox Addons or the Chrome Web Store
rm -f "$OUT"
zip -r -FS "$OUT".zip manifest.json src/*
echo Created .zip web extension: "$OUT".zip

