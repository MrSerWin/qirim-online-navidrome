#!/bin/bash

# Regenerate full_text columns for improved search
# This script forces Navidrome to regenerate full_text columns with new transliteration

set -e

DB_PATH="${1:-data/navidrome.db}"

if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database not found at $DB_PATH"
    echo "Usage: $0 [path/to/navidrome.db]"
    exit 1
fi

echo "🔄 Regenerating full_text columns for improved search..."
echo "📁 Database: $DB_PATH"
echo ""

# Clear full_text columns to force regeneration
echo "Step 1: Clearing full_text columns..."
sqlite3 "$DB_PATH" <<EOF
UPDATE album SET full_text = '';
UPDATE artist SET full_text = '';
UPDATE media_file SET full_text = '';
EOF

echo "✓ Cleared full_text columns"
echo ""

echo "Step 2: Rebuilding full_text with new transliteration..."
echo "This requires running a full scan. Options:"
echo ""
echo "  A. If you have Navidrome running:"
echo "     docker exec navidrome-container /app/navidrome scan"
echo ""
echo "  B. If running locally:"
echo "     ./navidrome scan"
echo ""
echo "  C. Or just restart Navidrome - it will rebuild on startup"
echo ""
echo "✅ full_text columns cleared. Run a scan to regenerate!"
