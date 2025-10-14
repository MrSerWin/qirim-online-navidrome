# Karaoke Feature Deployment Instructions

## Changes Made

### Backend Changes
1. **Model** (`model/karaoke.go`):
   - Added `Source` field (optional)
   - Added `Description` field (optional)

2. **Repository** (`persistence/karaoke_repository.go`):
   - No changes needed - automatically handles new fields via struct tags

### Frontend Changes
1. **KaraokeCreate.jsx**:
   - Added Source input field
   - Added Description textarea field (multiline, 3 rows)

2. **KaraokeGridView.jsx**:
   - Added display of Source and Description in dialog modal
   - Fields only display if they have values

3. **Translations** (all i18n files):
   - Added "source" field translations
   - Added "description" field translations
   - Languages: English, Russian, Ukrainian, Turkish, Crimean Tatar

## Database Migration

The Docker image has been built successfully: `navidrome-qo:latest`

**IMPORTANT**: Before deploying, you must apply the database migrations on the server.

### Step 1: Apply Database Migration

SSH to your server and run:

```bash
ssh root@SERVER_IP

# Navigate to data directory
cd /opt/navidrome/data

# Backup the database first
cp navidrome.db navidrome.db.backup

# Apply migration
sqlite3 navidrome.db << 'EOF'
-- Add lowercase columns for case-insensitive search
ALTER TABLE karaoke_song ADD COLUMN title_lower TEXT;
ALTER TABLE karaoke_song ADD COLUMN artist_lower TEXT;

-- Add new optional fields
ALTER TABLE karaoke_song ADD COLUMN source TEXT;
ALTER TABLE karaoke_song ADD COLUMN description TEXT;

-- Backfill lowercase values for existing records
UPDATE karaoke_song SET title_lower = LOWER(title);
UPDATE karaoke_song SET artist_lower = LOWER(artist);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_karaoke_title_lower ON karaoke_song(title_lower);
CREATE INDEX IF NOT EXISTS idx_karaoke_artist_lower ON karaoke_song(artist_lower);

-- Verify changes
.schema karaoke_song
EOF
```

### Step 2: Transfer and Load Docker Image

On your local machine:

```bash
# The image is already saved at /tmp/navidrome-qo-latest.tar
# Transfer it to the server (you may need to set up SSH keys or enter password)
scp /tmp/navidrome-qo-latest.tar root@SERVER_IP:/tmp/
```

On the server:

```bash
# Load the image
docker load -i /tmp/navidrome-qo-latest.tar

# Clean up
rm /tmp/navidrome-qo-latest.tar

# Navigate to Navidrome directory
cd /opt/navidrome

# Stop and restart the container
docker compose down
docker compose up -d

# Check status
docker compose ps
docker compose logs --tail=50 navidrome
```

### Step 3: Verify Deployment

1. Visit https://qirim.cloud
2. Log in as admin
3. Go to Karaoke section
4. Click "Add Karaoke" button
5. Verify new fields are present:
   - Source (optional)
   - Description (optional, multiline)
6. Create a test entry with source and description
7. Verify the fields display in the dialog modal when clicking on the karaoke item
8. Test search functionality (should be case-insensitive)

## Rollback Plan

If something goes wrong:

```bash
# On server
cd /opt/navidrome

# Stop container
docker compose down

# Restore database backup
cd data
cp navidrome.db.backup navidrome.db

# Use previous image (if available)
docker compose up -d
```

## Files Modified

- `model/karaoke.go` - Added source and description fields
- `ui/src/karaoke/KaraokeCreate.jsx` - Added input fields for source and description
- `ui/src/karaoke/KaraokeGridView.jsx` - Added display of source and description
- `ui/src/i18n/en.json` - Added English translations
- `ui/src/i18n/ru.json` - Added Russian translations
- `ui/src/i18n/crh.json` - Added Crimean Tatar translations
- `ui/src/i18n/tr.json` - Added Turkish translations
- `ui/src/i18n/uk.json` - Added Ukrainian translations

## Migration File

The migration SQL is also available in `karaoke_migration.sql` file in the project root.
