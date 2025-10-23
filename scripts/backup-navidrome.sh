#!/bin/bash

# Navidrome Full Backup Script (excluding music folder)
# Usage: ./backup-navidrome.sh

set -e

# Configuration
SOURCE_DIR="/opt/navidrome"
BACKUP_BASE_DIR="/var/backups/qirim_online"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_BASE_DIR/qirim_online-backup-$TIMESTAMP.tar.gz"
RETENTION_DAYS=7
LOG_FILE="/var/log/qirim_online-backup.log"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Starting Navidrome backup ==="

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_BASE_DIR"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    log "Error: Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Create backup (exclude music folder)
log "Creating backup: $BACKUP_FILE"
log "Excluding: music, cache, backups"

tar -czf "$BACKUP_FILE" \
    --exclude="music" \
    --exclude="data/cache" \
    --exclude="data/backups" \
    -C /opt \
    navidrome \
    2>&1 | tee -a "$LOG_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null)
    BACKUP_SIZE_MB=$((BACKUP_SIZE / 1024 / 1024))
    log "Backup created successfully: $BACKUP_FILE (${BACKUP_SIZE_MB}MB)"
else
    log "Error: Backup failed"
    exit 1
fi

# Remove old backups (older than RETENTION_DAYS)
log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_BASE_DIR" -name "navidrome-backup-*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete 2>&1 | tee -a "$LOG_FILE"

# List remaining backups
log "Current backups:"
ls -lh "$BACKUP_BASE_DIR"/navidrome-backup-*.tar.gz 2>/dev/null | tail -5 | tee -a "$LOG_FILE" || log "No backups found"

# Show disk usage
TOTAL_SIZE=$(du -sh "$BACKUP_BASE_DIR" | cut -f1)
log "Total backup size: $TOTAL_SIZE"

log "=== Backup completed successfully! ==="
