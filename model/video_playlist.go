package model

import "time"

// VideoPlaylist represents a YouTube playlist or channel's video collection
type VideoPlaylist struct {
	ID              string    `structs:"id" json:"id"`
	YoutubeID       string    `structs:"youtube_id" json:"youtubeId" db:"youtube_id"`
	Title           string    `structs:"title" json:"title"`
	TitleLower      string    `structs:"title_lower" json:"titleLower" db:"title_lower"`
	Description     string    `structs:"description" json:"description"`
	ThumbnailURL    string    `structs:"thumbnail_url" json:"thumbnailUrl" db:"thumbnail_url"`
	ChannelID       string    `structs:"channel_id" json:"channelId" db:"channel_id"`
	ChannelName     string    `structs:"channel_name" json:"channelName" db:"channel_name"`
	VideoCount      int       `structs:"video_count" json:"videoCount" db:"video_count"`
	IsChannelVideos bool      `structs:"is_channel_videos" json:"isChannelVideos" db:"is_channel_videos"`
	CreatedAt       time.Time `structs:"created_at" json:"createdAt"`
	UpdatedAt       time.Time `structs:"updated_at" json:"updatedAt"`
}

type VideoPlaylists []VideoPlaylist

// VideoPlaylistClip represents the relationship between a playlist and a clip
type VideoPlaylistClip struct {
	PlaylistID string    `structs:"playlist_id" json:"playlistId" db:"playlist_id"`
	ClipID     string    `structs:"clip_id" json:"clipId" db:"clip_id"`
	Position   int       `structs:"position" json:"position"`
	AddedAt    time.Time `structs:"added_at" json:"addedAt" db:"added_at"`
}

type VideoPlaylistClips []VideoPlaylistClip

// VideoPlaylistRepository defines persistence methods for video playlists
type VideoPlaylistRepository interface {
	ResourceRepository
	CountAll(options ...QueryOptions) (int64, error)
	Delete(id string) error
	Get(id string) (*VideoPlaylist, error)
	GetByYoutubeID(youtubeID string) (*VideoPlaylist, error)
	GetAll(options ...QueryOptions) (VideoPlaylists, error)
	Put(v *VideoPlaylist) error
	Exists(youtubeID string) (bool, error)

	// Clip relationship methods
	AddClip(playlistID, clipID string, position int) error
	RemoveClip(playlistID, clipID string) error
	GetClips(playlistID string, options ...QueryOptions) (VideoClips, error)
	GetClipCount(playlistID string) (int, error)
	UpdateVideoCount(playlistID string) error
}
