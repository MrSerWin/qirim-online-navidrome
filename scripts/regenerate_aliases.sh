#!/bin/bash

# Regenerate URL aliases with improved transliteration
# This script:
# 1. Clears existing aliases
# 2. Regenerates them using the improved transliterate() function

set -e

DB_PATH="${1:-/opt/navidrome/data/navidrome.db}"

if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database not found at $DB_PATH"
    echo "Usage: $0 [path/to/navidrome.db]"
    exit 1
fi

echo "🔄 Regenerating URL aliases with transliteration..."
echo "📁 Database: $DB_PATH"
echo ""

# Clear existing aliases
echo "Step 1: Clearing existing aliases..."
sqlite3 "$DB_PATH" <<EOF
UPDATE album SET url_alias = '' WHERE url_alias != '';
UPDATE artist SET url_alias = '' WHERE url_alias != '';
UPDATE media_file SET url_alias = '' WHERE url_alias != '';
EOF

ALBUMS_CLEARED=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM album;")
ARTISTS_CLEARED=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM artist;")
SONGS_CLEARED=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM media_file;")

echo "✓ Cleared aliases for:"
echo "  - $ALBUMS_CLEARED albums"
echo "  - $ARTISTS_CLEARED artists"
echo "  - $SONGS_CLEARED songs"
echo ""

# Restart Navidrome to trigger alias generation on next scan
echo "Step 2: Please restart Navidrome and run a scan to regenerate aliases"
echo ""
echo "Run these commands:"
echo "  docker compose -f docker-compose.qirim-online.yml restart navidrome"
echo "  docker exec navidrome-qo-prod /app/navidrome scan"
echo ""
echo "Or use the generate_url_aliases_prod.go script:"
echo "  go run scripts/generate_url_aliases_prod.go --db=$DB_PATH"
echo ""
echo "✅ Aliases cleared successfully!"
