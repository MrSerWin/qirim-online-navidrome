# Wrapped Feature (Year-in-Review Statistics)

The Wrapped feature provides Spotify-like year-in-review statistics for users of Qırım.Online music platform.

## Overview

Wrapped generates comprehensive listening statistics for users, including:
- Total listening time and track count
- Top tracks, artists, albums, and genres
- Unique artists and albums discovered
- Achievement badges (Meloman, Explorer, etc.)
- Community comparison (percentile ranking)
- Public sharing capabilities

## Features

### Statistics Tracked

1. **Basic Stats**
   - Total minutes listened
   - Total tracks played
   - Unique artists explored
   - Unique albums discovered

2. **Top Lists**
   - Top 50 tracks with play counts and minutes
   - Top 20 artists with play counts and minutes
   - Top 20 albums with play counts and minutes
   - Top 10 genres with distribution percentages

3. **Badges/Achievements**
   - **Меломан** (Meloman) - 10,000+ minutes listened (legendary)
   - **Любитель музыки** (Music Lover) - 5,000+ minutes listened (epic)
   - **Исследователь** (Explorer) - 50+ unique artists discovered (rare)

4. **Community Stats**
   - User percentile ranking (e.g., "Top 5% of listeners")

## Access Control

- **Access**: Only logged-in users can view their own Wrapped statistics
- **Sharing**: Users can generate public share links accessible without login
- **Share Expiration**: Optional expiration date for shared links
- **View Tracking**: Number of views tracked for shared Wrapped pages

## Technical Implementation

### Database Schema

#### play_history Table
Stores detailed play events for analytics:
- `id` - Unique identifier
- `user_id` - User who played the track
- `media_file_id` - Track that was played
- `played_at` - Timestamp of play
- `duration_played` - Seconds played
- `completed` - Whether track was fully played
- `platform` - Platform used (web, mobile, etc.)
- `created_at` - Record creation time

Indexes:
- `idx_play_history_user_date` - Fast queries by user and date
- `idx_play_history_media_file` - Fast track lookups
- `idx_play_history_user_media` - Combined user/track queries

#### wrapped_shares Table
Stores public share links:
- `id` - Unique identifier
- `user_id` - User who created share
- `year` - Year of wrapped data
- `period` - Period type (year, month, etc.)
- `share_id` - Public share UUID
- `data` - JSON-serialized wrapped stats
- `views` - View counter
- `created_at` - Share creation time
- `expires_at` - Optional expiration date

### API Endpoints

All endpoints are under `/api/wrapped/`:

#### Protected Endpoints (require authentication)

1. **GET /api/wrapped/available-years**
   - Returns years for which user has listening data
   - Response: `{ "years": [2024, 2023] }`

2. **GET /api/wrapped/{year}?period=year**
   - Generates wrapped statistics for specified year
   - Query param `period`: "year" (default)
   - Returns complete `WrappedStats` object

3. **POST /api/wrapped/{year}/share**
   - Creates public share link for wrapped stats
   - Request body: `{ "period": "year", "expiresAt": "2025-01-31T23:59:59Z" }`
   - Response: `{ "shareId": "uuid", "shareUrl": "/app/wrapped/share/uuid" }`

#### Public Endpoints (no authentication required)

1. **GET /api/wrapped/share/{shareId}**
   - Retrieves publicly shared wrapped statistics
   - Increments view counter
   - Returns `WrappedStats` object or 404 if expired/not found

### Data Collection

Play history is automatically collected during scrobbling in `core/scrobbler/play_tracker.go`:

```go
// When a track is played, it's added to play_history table
history := &model.PlayHistory{
    UserID:         user.ID,
    MediaFileID:    track.ID,
    PlayedAt:       timestamp,
    DurationPlayed: int(track.Duration),
    Completed:      true,
    Platform:       platform, // web, mobile, etc.
}
err := tx.Wrapped(ctx).AddPlayHistory(history)
```

### Repository Methods

Located in `persistence/wrapped_repository.go`:

- `AddPlayHistory(history *PlayHistory)` - Record play event
- `GetAvailableYears(userID)` - Get years with data
- `GenerateWrapped(userID, year, period)` - Generate statistics
- `CreatePublicShare(stats, expiresAt)` - Create share link
- `GetPublicShare(shareID)` - Retrieve shared stats

### Data Models

Located in `model/wrapped.go`:

- `PlayHistory` - Individual play event
- `WrappedStats` - Complete wrapped statistics
- `WrappedTrack` - Track with play stats
- `WrappedArtist` - Artist with play stats
- `WrappedAlbum` - Album with play stats
- `WrappedGenre` - Genre with distribution
- `Badge` - Achievement badge

## Customizations for Qırım.Online

Unlike Spotify Wrapped, this implementation:

1. **No Cultural Metrics** - Removed "Cultural Metrics" section since platform only has Crimean Tatar music
2. **Public Sharing** - Supports both image generation and public web pages for sharing
3. **Guest Access** - Public shares accessible without login
4. **Crimean Tatar Focus** - All badges and descriptions in Russian/Crimean Tatar

## Future Enhancements

Potential additions (see `NEW_IDEAS.md`):

1. **Monthly/Weekly Wrapped** - Not just yearly
2. **Image Generation** - Generate shareable images for social media
3. **More Badges** - Night Owl, Weekend Warrior, etc.
4. **Time-based Stats** - Monthly trends, hourly patterns, weekday distribution
5. **Discovery Stats** - New artists discovered, favorited tracks
6. **Comparison** - Compare with friends or community average

## Usage Examples

### Frontend Integration (Future Work)

```javascript
// Fetch available years
const years = await fetch('/api/wrapped/available-years').then(r => r.json())

// Generate wrapped for 2024
const wrapped = await fetch('/api/wrapped/2024').then(r => r.json())

// Create share link
const share = await fetch('/api/wrapped/2024/share', {
  method: 'POST',
  body: JSON.stringify({ period: 'year', expiresAt: null })
}).then(r => r.json())

// Access public share (no auth)
const publicWrapped = await fetch(`/api/wrapped/share/${share.shareId}`)
  .then(r => r.json())
```

## Migration

To enable this feature, run database migrations:

```bash
# Migrations run automatically on server start
# Or manually:
make migration-sql  # To create new migration
```

Migrations included:
- `20251120000000_create_play_history_table.go` - Play history tracking
- `20251120000001_create_wrapped_shares_table.go` - Public sharing

## Performance Considerations

1. **Indexes** - All critical queries use indexed columns
2. **Caching** - Generated wrapped stats could be cached (future enhancement)
3. **Completed Flag** - Only counts completed plays to avoid inflated stats
4. **Aggregation** - Uses SQLite's built-in aggregation for performance

## Testing

Build and test:

```bash
# Build entire project
make build

# Run tests
make test

# Deploy to production
./scripts/rebuild-and-deploy-qirim-online.sh
```

## Deployment Checklist

- [ ] Database migrations applied
- [ ] API endpoints accessible
- [ ] Frontend UI implemented (Phase 2)
- [ ] Public share pages working
- [ ] Badge calculations verified
- [ ] Performance tested with real data
- [ ] Documentation updated

## Notes

- Data collection started: When this feature is deployed
- Historical data: Not available before deployment date
- Privacy: Only user can see their own stats (unless shared)
- Sharing: Users explicitly choose to share via public link
