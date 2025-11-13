#!/bin/bash

# Script to migrate existing user play counts to global play counts
# This aggregates all user-specific play counts from the annotation table
# and updates the global_play_count and global_last_played fields

set -e

# Get the database path from environment or use default
DB_PATH="${ND_DATAFOLDER:-../navidrome-data}/navidrome.db"

echo "Starting migration of play counts to global statistics..."
echo "Database: $DB_PATH"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database not found at $DB_PATH"
    exit 1
fi

# Update global play counts for media_file
echo "Updating global play counts for songs..."
sqlite3 "$DB_PATH" <<EOF
UPDATE media_file
SET
    global_play_count = (
        SELECT COALESCE(SUM(play_count), 0)
        FROM annotation
        WHERE annotation.item_id = media_file.id
        AND annotation.item_type = 'media_file'
    ),
    global_last_played = (
        SELECT MAX(play_date)
        FROM annotation
        WHERE annotation.item_id = media_file.id
        AND annotation.item_type = 'media_file'
        AND play_date IS NOT NULL
    )
WHERE EXISTS (
    SELECT 1 FROM annotation
    WHERE annotation.item_id = media_file.id
    AND annotation.item_type = 'media_file'
);
EOF

# Update global play counts for album
echo "Updating global play counts for albums..."
sqlite3 "$DB_PATH" <<EOF
UPDATE album
SET
    global_play_count = (
        SELECT COALESCE(SUM(play_count), 0)
        FROM annotation
        WHERE annotation.item_id = album.id
        AND annotation.item_type = 'album'
    ),
    global_last_played = (
        SELECT MAX(play_date)
        FROM annotation
        WHERE annotation.item_id = album.id
        AND annotation.item_type = 'album'
        AND play_date IS NOT NULL
    )
WHERE EXISTS (
    SELECT 1 FROM annotation
    WHERE annotation.item_id = album.id
    AND annotation.item_type = 'album'
);
EOF

# Update global play counts for artist
echo "Updating global play counts for artists..."
sqlite3 "$DB_PATH" <<EOF
UPDATE artist
SET
    global_play_count = (
        SELECT COALESCE(SUM(play_count), 0)
        FROM annotation
        WHERE annotation.item_id = artist.id
        AND annotation.item_type = 'artist'
    ),
    global_last_played = (
        SELECT MAX(play_date)
        FROM annotation
        WHERE annotation.item_id = artist.id
        AND annotation.item_type = 'artist'
        AND play_date IS NOT NULL
    )
WHERE EXISTS (
    SELECT 1 FROM annotation
    WHERE annotation.item_id = artist.id
    AND annotation.item_type = 'artist'
);
EOF

# Show statistics
echo ""
echo "Migration completed! Statistics:"
echo "================================"

echo -n "Songs with global play counts: "
sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM media_file WHERE global_play_count > 0;"

echo -n "Albums with global play counts: "
sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM album WHERE global_play_count > 0;"

echo -n "Artists with global play counts: "
sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM artist WHERE global_play_count > 0;"

echo ""
echo "Top 10 most played songs:"
sqlite3 "$DB_PATH" -header -column "SELECT title, artist, global_play_count FROM media_file ORDER BY global_play_count DESC LIMIT 10;"

echo ""
echo "Migration completed successfully!"
