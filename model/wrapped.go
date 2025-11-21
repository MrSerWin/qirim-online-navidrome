package model

import "time"

// PlayHistory represents a single play event with detailed information
type PlayHistory struct {
	ID             string    `structs:"id" json:"id"`
	UserID         string    `structs:"user_id" json:"userId"`
	MediaFileID    string    `structs:"media_file_id" json:"mediaFileId"`
	PlayedAt       time.Time `structs:"played_at" json:"playedAt"`
	DurationPlayed int       `structs:"duration_played" json:"durationPlayed"` // in seconds
	Completed      bool      `structs:"completed" json:"completed"`
	Platform       string    `structs:"platform" json:"platform"` // web, mobile, desktop
	CreatedAt      time.Time `structs:"created_at" json:"createdAt"`
}

// WrappedStats contains all statistics for a user's wrapped report
type WrappedStats struct {
	UserID   string `json:"userId"`
	Year     int    `json:"year"`
	Period   string `json:"period"` // "year", "month", "all-time"
	PeriodID string `json:"periodId"` // "2024", "2024-01", etc.

	// Basic stats
	TotalMinutes  int `json:"totalMinutes"`
	TotalTracks   int `json:"totalTracks"`
	UniqueArtists int `json:"uniqueArtists"`
	UniqueAlbums  int `json:"uniqueAlbums"`

	// Top lists
	TopTracks  []WrappedTrack  `json:"topTracks"`
	TopArtists []WrappedArtist `json:"topArtists"`
	TopAlbums  []WrappedAlbum  `json:"topAlbums"`
	TopGenres  []WrappedGenre  `json:"topGenres"`

	// Time-based statistics
	MonthlyStats map[string]int `json:"monthlyStats"` // month -> play_count
	HourlyStats  map[int]int    `json:"hourlyStats"`  // hour (0-23) -> play_count
	WeekdayStats map[string]int `json:"weekdayStats"` // weekday -> play_count

	// Discoveries
	NewArtists  []WrappedArtist `json:"newArtists"`
	Discoveries []WrappedTrack  `json:"discoveries"` // tracks added to favorites this period

	// Achievements
	Badges []Badge `json:"badges"`

	// Community comparison
	TopPercentile float64 `json:"topPercentile"` // user is in top X%

	GeneratedAt time.Time `json:"generatedAt"`
	ShareID     string    `json:"shareId,omitempty"` // for public sharing
}

// WrappedTrack represents a track in wrapped statistics
type WrappedTrack struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Artist       string `json:"artist"`
	ArtistID     string `json:"artistId"`
	Album        string `json:"album"`
	AlbumID      string `json:"albumId"`
	PlayCount    int    `json:"playCount"`
	TotalMinutes int    `json:"totalMinutes"`
	CoverArt     string `json:"coverArt"`
	Year         int    `json:"year,omitempty"`
}

// WrappedArtist represents an artist in wrapped statistics
type WrappedArtist struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	PlayCount    int    `json:"playCount"`
	TotalMinutes int    `json:"totalMinutes"`
	UniqueTracks int    `json:"uniqueTracks"`
	TopTrack     string `json:"topTrack"`
	TopTrackID   string `json:"topTrackId"`
	Image        string `json:"image"`
}

// WrappedAlbum represents an album in wrapped statistics
type WrappedAlbum struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	Artist          string `json:"artist"`
	ArtistID        string `json:"artistId"`
	PlayCount       int    `json:"playCount"`
	TotalMinutes    int    `json:"totalMinutes"`
	CoverArt        string `json:"coverArt"`
	TracksInAlbum   int    `json:"tracksInAlbum"`
	TracksListened  int    `json:"tracksListened"`
	CompletionRate  float64 `json:"completionRate"` // percentage
}

// WrappedGenre represents genre statistics
type WrappedGenre struct {
	Name       string  `json:"name"`
	PlayCount  int     `json:"playCount"`
	Percentage float64 `json:"percentage"`
	TopArtist  string  `json:"topArtist"`
}

// Badge represents an achievement badge
type Badge struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	Rarity      string `json:"rarity"` // common, rare, epic, legendary
	EarnedAt    time.Time `json:"earnedAt"`
}

// WrappedRepository provides access to wrapped statistics
type WrappedRepository interface {
	// Play history tracking
	AddPlayHistory(history *PlayHistory) error

	// Wrapped generation
	GenerateWrapped(userID string, year int, period string) (*WrappedStats, error)
	GetAvailableYears(userID string) ([]int, error)

	// Public sharing
	CreatePublicShare(stats *WrappedStats, expiresAt *time.Time) (string, error) // returns shareID
	GetPublicShare(shareID string) (*WrappedStats, error)
}
