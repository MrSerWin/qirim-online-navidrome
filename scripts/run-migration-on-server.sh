#!/bin/bash

# Script to run database migration on production server
# This adds global_play_count and global_last_played columns

set -e

echo "=== Starting database migration on production ==="

# Stop Navidrome to ensure database is not locked
echo "Stopping Navidrome..."
cd /opt/navidrome && docker compose -f docker-compose.qirim-online.yml stop navidrome

# Backup database before migration
echo "Creating database backup..."
BACKUP_DIR="/opt/navidrome/data/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp /opt/navidrome/data/navidrome.db "$BACKUP_DIR/navidrome_before_global_play_count_$TIMESTAMP.db"
echo "Backup created: $BACKUP_DIR/navidrome_before_global_play_count_$TIMESTAMP.db"

# Run migration SQL directly
echo "Running migration..."
sqlite3 /opt/navidrome/data/navidrome.db <<'EOF'
ALTER TABLE media_file ADD COLUMN global_play_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE media_file ADD COLUMN global_last_played DATETIME;

ALTER TABLE album ADD COLUMN global_play_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE album ADD COLUMN global_last_played DATETIME;

ALTER TABLE artist ADD COLUMN global_play_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE artist ADD COLUMN global_last_played DATETIME;
EOF

echo "Migration completed successfully!"

# Verify columns were added
echo "Verifying columns..."
sqlite3 /opt/navidrome/data/navidrome.db "PRAGMA table_info(media_file);" | grep global_play_count
sqlite3 /opt/navidrome/data/navidrome.db "PRAGMA table_info(album);" | grep global_play_count
sqlite3 /opt/navidrome/data/navidrome.db "PRAGMA table_info(artist);" | grep global_play_count

# Start Navidrome
echo "Starting Navidrome..."
cd /opt/navidrome && docker compose -f docker-compose.qirim-online.yml start navidrome

echo "=== Migration complete! ==="
echo ""
echo "Next steps:"
echo "1. Wait for Navidrome to start"
echo "2. Run data migration: ./scripts/migrate-global-play-counts.sh"
