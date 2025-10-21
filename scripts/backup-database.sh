#!/bin/bash

# Navidrome Database Backup Script
# Usage: ./backup-database.sh

set -e

BACKUP_DIR="/opt/navidrome/data/backups"
DB_FILE="/opt/navidrome/data/navidrome.db"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/navidrome-$TIMESTAMP.db"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    echo "Error: Database file not found: $DB_FILE"
    exit 1
fi

# Create backup
echo "Creating backup: $BACKUP_FILE"
cp "$DB_FILE" "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
    echo "Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE bytes)"
else
    echo "Error: Backup failed"
    exit 1
fi

# Remove old backups (older than RETENTION_DAYS)
echo "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "navidrome-*.db" -type f -mtime +$RETENTION_DAYS -delete

# List remaining backups
echo "Current backups:"
ls -lh "$BACKUP_DIR"/navidrome-*.db | tail -5

echo "Backup completed successfully!"
