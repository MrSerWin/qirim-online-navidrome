package persistence

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/navidrome/navidrome/log"
	"github.com/navidrome/navidrome/model"
	"github.com/pocketbase/dbx"
	. "github.com/Masterminds/squirrel"
)

type wrappedRepository struct {
	sqlRepository
}

func NewWrappedRepository(ctx context.Context, db dbx.Builder) model.WrappedRepository {
	r := &wrappedRepository{}
	r.ctx = ctx
	r.db = db
	return r
}

// AddPlayHistory records a play event
func (r *wrappedRepository) AddPlayHistory(history *model.PlayHistory) error {
	if history.ID == "" {
		history.ID = uuid.NewString()
	}
	if history.CreatedAt.IsZero() {
		history.CreatedAt = time.Now()
	}
	if history.PlayedAt.IsZero() {
		history.PlayedAt = time.Now()
	}

	_, err := r.executeSQL(Insert("play_history").SetMap(map[string]interface{}{
		"id":              history.ID,
		"user_id":         history.UserID,
		"media_file_id":   history.MediaFileID,
		"played_at":       history.PlayedAt,
		"duration_played": history.DurationPlayed,
		"completed":       history.Completed,
		"platform":        history.Platform,
		"created_at":      history.CreatedAt,
	}))

	return err
}

// GetAvailableYears returns years for which wrapped data can be generated
func (r *wrappedRepository) GetAvailableYears(userID string) ([]int, error) {
	query := `
		SELECT DISTINCT strftime('%Y', played_at) as year
		FROM play_history
		WHERE user_id = {:userID}
		ORDER BY year DESC
	`

	var years []int
	err := r.db.NewQuery(query).
		Bind(dbx.Params{"userID": userID}).
		WithContext(r.ctx).
		Column(&years)

	return years, err
}

// GenerateWrapped generates complete wrapped statistics for a user
func (r *wrappedRepository) GenerateWrapped(userID string, year int, period string) (*model.WrappedStats, error) {
	stats := &model.WrappedStats{
		UserID:       userID,
		Year:         year,
		Period:       period,
		GeneratedAt:  time.Now(),
		MonthlyStats: make(map[string]int),
		HourlyStats:  make(map[int]int),
		WeekdayStats: make(map[string]int),
	}

	// Calculate time boundaries
	startDate, endDate := r.getTimeBoundaries(year, period)

	// Get basic stats
	totalMinutes, totalTracks, uniqueArtists, uniqueAlbums, err := r.getBasicStats(userID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get basic stats: %w", err)
	}

	stats.TotalMinutes = totalMinutes
	stats.TotalTracks = totalTracks
	stats.UniqueArtists = uniqueArtists
	stats.UniqueAlbums = uniqueAlbums

	// Get top tracks (simplified version)
	topTracks, err := r.getTopTracks(userID, startDate, endDate, 50)
	if err != nil {
		log.Error(r.ctx, "Failed to get top tracks", err)
	} else {
		stats.TopTracks = topTracks
	}

	// Get top artists (simplified version)
	topArtists, err := r.getTopArtists(userID, startDate, endDate, 20)
	if err != nil {
		log.Error(r.ctx, "Failed to get top artists", err)
	} else {
		stats.TopArtists = topArtists
	}

	// Get top albums
	topAlbums, err := r.getTopAlbums(userID, startDate, endDate, 20)
	if err != nil {
		log.Error(r.ctx, "Failed to get top albums", err)
	} else {
		stats.TopAlbums = topAlbums
	}

	// Get top genres
	topGenres, err := r.getTopGenres(userID, startDate, endDate, 10)
	if err != nil {
		log.Error(r.ctx, "Failed to get top genres", err)
	} else {
		stats.TopGenres = topGenres
	}

	// Calculate community stats
	percentile, err := r.calculateCommunityStats(userID, year, totalMinutes)
	if err != nil {
		log.Error(r.ctx, "Failed to calculate community stats", err)
	} else {
		stats.TopPercentile = percentile
	}

	// Calculate badges
	badges := r.calculateBadges(stats)
	stats.Badges = badges

	return stats, nil
}

func (r *wrappedRepository) getTimeBoundaries(year int, period string) (time.Time, time.Time) {
	startDate := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(year+1, 1, 1, 0, 0, 0, 0, time.UTC)
	return startDate, endDate
}

func (r *wrappedRepository) getBasicStats(userID string, startDate, endDate time.Time) (int, int, int, int, error) {
	query := `
		SELECT
			COALESCE(SUM(duration_played), 0) / 60 as total_minutes,
			COUNT(*) as total_tracks,
			COUNT(DISTINCT mf.artist_id) as unique_artists,
			COUNT(DISTINCT mf.album_id) as unique_albums
		FROM play_history ph
		JOIN media_file mf ON ph.media_file_id = mf.id
		WHERE ph.user_id = {:userID}
			AND ph.played_at >= {:startDate}
			AND ph.played_at < {:endDate}
			AND ph.completed = 1
	`

	var result struct {
		TotalMinutes  int `db:"total_minutes"`
		TotalTracks   int `db:"total_tracks"`
		UniqueArtists int `db:"unique_artists"`
		UniqueAlbums  int `db:"unique_albums"`
	}

	err := r.db.NewQuery(query).
		Bind(dbx.Params{
			"userID":    userID,
			"startDate": startDate,
			"endDate":   endDate,
		}).
		WithContext(r.ctx).
		One(&result)

	return result.TotalMinutes, result.TotalTracks, result.UniqueArtists, result.UniqueAlbums, err
}

func (r *wrappedRepository) getTopTracks(userID string, startDate, endDate time.Time, limit int) ([]model.WrappedTrack, error) {
	query := `
		SELECT
			mf.id,
			mf.title,
			mf.artist,
			mf.album,
			COUNT(*) as play_count,
			SUM(ph.duration_played) / 60 as minutes_played
		FROM play_history ph
		JOIN media_file mf ON ph.media_file_id = mf.id
		WHERE ph.user_id = {:userID}
			AND ph.played_at >= {:startDate}
			AND ph.played_at < {:endDate}
			AND ph.completed = 1
		GROUP BY mf.id, mf.title, mf.artist, mf.album
		ORDER BY play_count DESC
		LIMIT {:limit}
	`

	var tracks []model.WrappedTrack
	err := r.db.NewQuery(query).
		Bind(dbx.Params{
			"userID":    userID,
			"startDate": startDate,
			"endDate":   endDate,
			"limit":     limit,
		}).
		WithContext(r.ctx).
		All(&tracks)

	return tracks, err
}

func (r *wrappedRepository) getTopArtists(userID string, startDate, endDate time.Time, limit int) ([]model.WrappedArtist, error) {
	query := `
		SELECT
			a.id,
			a.name,
			COUNT(*) as play_count,
			SUM(ph.duration_played) / 60 as minutes_played
		FROM play_history ph
		JOIN media_file mf ON ph.media_file_id = mf.id
		JOIN artist a ON mf.artist_id = a.id
		WHERE ph.user_id = {:userID}
			AND ph.played_at >= {:startDate}
			AND ph.played_at < {:endDate}
			AND ph.completed = 1
		GROUP BY a.id, a.name
		ORDER BY play_count DESC
		LIMIT {:limit}
	`

	var artists []model.WrappedArtist
	err := r.db.NewQuery(query).
		Bind(dbx.Params{
			"userID":    userID,
			"startDate": startDate,
			"endDate":   endDate,
			"limit":     limit,
		}).
		WithContext(r.ctx).
		All(&artists)

	return artists, err
}

func (r *wrappedRepository) getTopAlbums(userID string, startDate, endDate time.Time, limit int) ([]model.WrappedAlbum, error) {
	query := `
		SELECT
			alb.id,
			alb.name,
			alb.album_artist as artist,
			COUNT(*) as play_count,
			SUM(ph.duration_played) / 60 as minutes_played
		FROM play_history ph
		JOIN media_file mf ON ph.media_file_id = mf.id
		JOIN album alb ON mf.album_id = alb.id
		WHERE ph.user_id = {:userID}
			AND ph.played_at >= {:startDate}
			AND ph.played_at < {:endDate}
			AND ph.completed = 1
		GROUP BY alb.id, alb.name, alb.album_artist
		ORDER BY play_count DESC
		LIMIT {:limit}
	`

	var albums []model.WrappedAlbum
	err := r.db.NewQuery(query).
		Bind(dbx.Params{
			"userID":    userID,
			"startDate": startDate,
			"endDate":   endDate,
			"limit":     limit,
		}).
		WithContext(r.ctx).
		All(&albums)

	return albums, err
}

func (r *wrappedRepository) getTopGenres(userID string, startDate, endDate time.Time, limit int) ([]model.WrappedGenre, error) {
	query := `
		SELECT
			mf.genre,
			COUNT(*) as play_count,
			SUM(ph.duration_played) / 60 as minutes_played
		FROM play_history ph
		JOIN media_file mf ON ph.media_file_id = mf.id
		WHERE ph.user_id = {:userID}
			AND ph.played_at >= {:startDate}
			AND ph.played_at < {:endDate}
			AND ph.completed = 1
			AND mf.genre IS NOT NULL
			AND mf.genre != ''
		GROUP BY mf.genre
		ORDER BY play_count DESC
		LIMIT {:limit}
	`

	var genres []model.WrappedGenre
	err := r.db.NewQuery(query).
		Bind(dbx.Params{
			"userID":    userID,
			"startDate": startDate,
			"endDate":   endDate,
			"limit":     limit,
		}).
		WithContext(r.ctx).
		All(&genres)

	return genres, err
}

func (r *wrappedRepository) calculateCommunityStats(userID string, year int, userMinutes int) (float64, error) {
	query := `
		SELECT COUNT(*) as total_users
		FROM (
			SELECT DISTINCT user_id
			FROM play_history
			WHERE strftime('%Y', played_at) = {:year}
		)
	`

	var result struct {
		TotalUsers int `db:"total_users"`
	}

	err := r.db.NewQuery(query).
		Bind(dbx.Params{"year": fmt.Sprintf("%d", year)}).
		WithContext(r.ctx).
		One(&result)

	if err != nil || result.TotalUsers == 0 {
		return 0, err
	}

	// Get users with more minutes
	query2 := `
		SELECT COUNT(*) as users_above
		FROM (
			SELECT user_id, SUM(duration_played) / 60 as total_minutes
			FROM play_history
			WHERE strftime('%Y', played_at) = {:year}
			GROUP BY user_id
			HAVING total_minutes > {:userMinutes}
		)
	`

	var result2 struct {
		UsersAbove int `db:"users_above"`
	}

	err = r.db.NewQuery(query2).
		Bind(dbx.Params{
			"year":        fmt.Sprintf("%d", year),
			"userMinutes": userMinutes,
		}).
		WithContext(r.ctx).
		One(&result2)

	if err != nil {
		return 0, err
	}

	percentile := 100.0 * float64(result.TotalUsers-result2.UsersAbove) / float64(result.TotalUsers)
	return percentile, nil
}

func (r *wrappedRepository) calculateBadges(stats *model.WrappedStats) []model.Badge {
	var badges []model.Badge

	// Meloman badge
	if stats.TotalMinutes >= 10000 {
		badges = append(badges, model.Badge{
			ID:          "meloman",
			Name:        "Меломан",
			Description: "Прослушано более 10,000 минут музыки",
			Icon:        "🎵",
			Rarity:      "legendary",
			EarnedAt:    time.Now(),
		})
	} else if stats.TotalMinutes >= 5000 {
		badges = append(badges, model.Badge{
			ID:          "music_lover",
			Name:        "Любитель музыки",
			Description: "Прослушано более 5,000 минут музыки",
			Icon:        "🎶",
			Rarity:      "epic",
			EarnedAt:    time.Now(),
		})
	}

	// Explorer badge
	if stats.UniqueArtists >= 50 {
		badges = append(badges, model.Badge{
			ID:          "explorer",
			Name:        "Исследователь",
			Description: "Открыто более 50 артистов",
			Icon:        "🧭",
			Rarity:      "rare",
			EarnedAt:    time.Now(),
		})
	}

	return badges
}

// CreatePublicShare creates a public shareable link for wrapped stats
func (r *wrappedRepository) CreatePublicShare(stats *model.WrappedStats, expiresAt *time.Time) (string, error) {
	shareID := uuid.NewString()
	stats.ShareID = shareID

	// Serialize stats to JSON
	data, err := json.Marshal(stats)
	if err != nil {
		return "", err
	}

	_, err = r.executeSQL(Insert("wrapped_shares").SetMap(map[string]interface{}{
		"id":         uuid.NewString(),
		"user_id":    stats.UserID,
		"year":       stats.Year,
		"period":     stats.Period,
		"share_id":   shareID,
		"data":       string(data),
		"views":      0,
		"created_at": time.Now(),
		"expires_at": expiresAt,
	}))

	return shareID, err
}

// GetPublicShare retrieves publicly shared wrapped statistics
func (r *wrappedRepository) GetPublicShare(shareID string) (*model.WrappedStats, error) {
	query := `
		SELECT data
		FROM wrapped_shares
		WHERE share_id = {:shareID}
			AND (expires_at IS NULL OR expires_at > {:now})
	`

	var result struct {
		Data string `db:"data"`
	}
	err := r.db.NewQuery(query).
		Bind(dbx.Params{
			"shareID": shareID,
			"now":     time.Now(),
		}).
		WithContext(r.ctx).
		One(&result)

	if err != nil {
		return nil, err
	}

	var stats model.WrappedStats
	if err := json.Unmarshal([]byte(result.Data), &stats); err != nil {
		return nil, err
	}

	// Increment view count
	_, _ = r.executeSQL(Update("wrapped_shares").
		Set("views", Expr("views + 1")).
		Where(Eq{"share_id": shareID}))

	return &stats, nil
}
