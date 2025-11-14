# Deploying URL Aliases to Production

## Quick Deploy (Recommended)

Run the automated script:
```bash
cd /path/to/navidrome
./scripts/deploy-url-aliases.sh
```

## Manual Deploy

If you prefer to run the commands manually:

### Step 1: Apply Database Migrations
```bash
# Navigate to navidrome directory
cd /path/to/navidrome

# Apply migrations
./navidrome --migrate
```

### Step 2: Generate URL Aliases
```bash
# Generate aliases for all songs, albums, and artists
go run scripts/generate_url_aliases.go
```

### Step 3: Verify Aliases
```bash
# Check if aliases were created (optional)
sqlite3 ../navidrome-data/navidrome.db "SELECT COUNT(*) FROM media_file WHERE url_alias IS NOT NULL AND url_alias != '';"
sqlite3 ../navidrome-data/navidrome.db "SELECT COUNT(*) FROM album WHERE url_alias IS NOT NULL AND url_alias != '';"
sqlite3 ../navidrome-data/navidrome.db "SELECT COUNT(*) FROM artist WHERE url_alias IS NOT NULL AND url_alias != '';"
```

### Step 4: Restart Navidrome
```bash
# Restart your Navidrome server
sudo systemctl restart navidrome
# or
docker-compose restart navidrome
# or whatever method you use to restart Navidrome
```

## Verification

After deployment, verify that aliases work:

1. **Check API response:**
   ```bash
   curl -s "https://yourdomain.com/api/album" | jq '.[0] | {id, name, urlAlias}'
   ```
   Should show a `urlAlias` field with a value like `"album-name"`.

2. **Test alias URLs:**
   - Visit: `https://yourdomain.com/app/#/album/album-name/show`
   - Should redirect to: `https://yourdomain.com/app/#/album/UUID/show`

3. **Test share URLs:**
   - Share an album/artist
   - URL should contain alias instead of UUID

## Troubleshooting

### If migrations fail:
- Check if Navidrome is stopped before running migrations
- Ensure database file is accessible and writable
- Check logs for specific error messages

### If alias generation fails:
- Ensure Go is installed on the server
- Check that the database has the required tables (media_file, album, artist)
- Verify the database path in the script

### If aliases don't work after deployment:
- Ensure Navidrome server was restarted
- Check that the new code with alias support was deployed
- Verify that the middleware is properly configured

## Rollback (if needed)

If you need to rollback:
```bash
# Remove alias columns (this will lose all generated aliases)
sqlite3 ../navidrome-data/navidrome.db "ALTER TABLE media_file DROP COLUMN url_alias;"
sqlite3 ../navidrome-data/navidrome.db "ALTER TABLE album DROP COLUMN url_alias;"
sqlite3 ../navidrome-data/navidrome.db "ALTER TABLE artist DROP COLUMN url_alias;"
```
