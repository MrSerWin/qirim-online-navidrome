#!/bin/bash

# Update URL aliases with improved transliteration
# This script regenerates all aliases using the improved transliterate() function

set -e

echo "🔄 Updating URL aliases with transliteration..."
echo ""
echo "This will:"
echo "  1. Clear all existing aliases"
echo "  2. Regenerate with proper transliteration (ç→c, ğ→g, ş→s, etc.)"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

DB_PATH="/opt/navidrome/data/navidrome.db"

if [ ! -f "$DB_PATH" ]; then
    echo "❌ Error: Database not found at $DB_PATH"
    exit 1
fi

echo ""
echo "Step 1: Clearing existing aliases..."
sqlite3 "$DB_PATH" <<EOF
UPDATE album SET url_alias = '';
UPDATE artist SET url_alias = '';
UPDATE media_file SET url_alias = '';
EOF

echo "✓ Aliases cleared"
echo ""

echo "Step 2: Regenerating aliases with transliteration..."
cd /opt/navidrome

# Check if Go is available
if command -v go &> /dev/null; then
    echo "Using local Go installation..."
    go run scripts/generate_url_aliases_prod.go --db="$DB_PATH"
else
    echo "Using Docker with Go..."
    docker run --rm \
      -v /opt/navidrome:/workspace \
      -v /opt/navidrome/data:/data \
      -w /workspace \
      golang:1.24 \
      go run scripts/generate_url_aliases_prod.go --db=/data/navidrome.db
fi

echo ""
echo "Step 3: Verifying results..."
ALBUMS_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM album WHERE url_alias != '';")
ARTISTS_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM artist WHERE url_alias != '';")
SONGS_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM media_file WHERE url_alias != '';")

echo "✓ Generated aliases for:"
echo "  - $ALBUMS_COUNT albums"
echo "  - $ARTISTS_COUNT artists"
echo "  - $SONGS_COUNT songs"
echo ""

echo "Step 4: Show some examples..."
echo ""
echo "Albums:"
sqlite3 "$DB_PATH" "SELECT name, url_alias FROM album WHERE url_alias != '' LIMIT 5;" | column -t -s '|'
echo ""
echo "Artists:"
sqlite3 "$DB_PATH" "SELECT name, url_alias FROM artist WHERE url_alias != '' LIMIT 5;" | column -t -s '|'
echo ""

echo "✅ All aliases updated successfully!"
echo ""
echo "Next steps:"
echo "  - Test share functionality: https://qirim.online"
echo "  - Verify aliases in API: curl http://localhost:4533/api/album?_end=3"
