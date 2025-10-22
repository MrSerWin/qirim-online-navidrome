#!/bin/bash

# Script to deploy URL aliases to production
# This script applies migrations and generates URL aliases

set -e

echo "🚀 Deploying URL aliases to production..."

# Check if we're in the right directory
if [ ! -f "navidrome" ]; then
    echo "❌ Error: navidrome binary not found. Please run this script from the navidrome directory."
    exit 1
fi

# Check if database file exists
DB_PATH="../navidrome-data/navidrome.db"
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Error: Database file not found at $DB_PATH"
    echo "Please check the database path and try again."
    exit 1
fi

echo "📁 Database found at: $DB_PATH"

# Step 1: Apply migrations
echo "🔄 Step 1: Applying database migrations..."
./navidrome --migrate

if [ $? -eq 0 ]; then
    echo "✅ Migrations applied successfully"
else
    echo "❌ Error: Failed to apply migrations"
    exit 1
fi

# Step 2: Generate URL aliases
echo "🔄 Step 2: Generating URL aliases..."
go run scripts/generate_url_aliases.go

if [ $? -eq 0 ]; then
    echo "✅ URL aliases generated successfully"
else
    echo "❌ Error: Failed to generate URL aliases"
    exit 1
fi

# Step 3: Verify aliases were created
echo "🔄 Step 3: Verifying aliases were created..."
ALIAS_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM media_file WHERE url_alias IS NOT NULL AND url_alias != '';")
ALBUM_ALIAS_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM album WHERE url_alias IS NOT NULL AND url_alias != '';")
ARTIST_ALIAS_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM artist WHERE url_alias IS NOT NULL AND url_alias != '';")

echo "📊 Alias generation results:"
echo "   - Songs with aliases: $ALIAS_COUNT"
echo "   - Albums with aliases: $ALBUM_ALIAS_COUNT"
echo "   - Artists with aliases: $ARTIST_ALIAS_COUNT"

if [ "$ALIAS_COUNT" -gt 0 ] && [ "$ALBUM_ALIAS_COUNT" -gt 0 ] && [ "$ARTIST_ALIAS_COUNT" -gt 0 ]; then
    echo "✅ URL aliases deployed successfully!"
    echo ""
echo "🎉 Next steps:"
echo "   1. Restart Navidrome server using one of these methods:"
echo "      - systemd: sudo systemctl restart navidrome"
echo "      - docker: docker-compose restart navidrome"
echo "      - pm2: pm2 restart navidrome"
echo "      - manual: kill navidrome process and restart"
echo "   2. Test URL aliases on your domain"
echo "   3. Verify share URLs work with aliases"
else
    echo "❌ Warning: Some aliases may not have been generated properly"
    echo "   Please check the logs above for any errors"
fi
