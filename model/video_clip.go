package model

import "time"

// VideoClip represents a music video clip from YouTube
type VideoClip struct {
	ID           string    `structs:"id" json:"id"`
	YoutubeID    string    `structs:"youtube_id" json:"youtubeId"`
	Title        string    `structs:"title" json:"title"`
	TitleLower   string    `structs:"title_lower" json:"titleLower" db:"title_lower"`
	Artist       string    `structs:"artist" json:"artist"`
	ArtistLower  string    `structs:"artist_lower" json:"artistLower" db:"artist_lower"`
	ChannelID    string    `structs:"channel_id" json:"channelId" db:"channel_id"`
	ChannelName  string    `structs:"channel_name" json:"channelName" db:"channel_name"`
	Description  string    `structs:"description" json:"description"`
	Duration     int       `structs:"duration" json:"duration"`
	ThumbnailURL string    `structs:"thumbnail_url" json:"thumbnailUrl" db:"thumbnail_url"`
	ViewCount    int64     `structs:"view_count" json:"viewCount" db:"view_count"`
	PublishedAt  time.Time `structs:"published_at" json:"publishedAt" db:"published_at"`
	CreatedAt    time.Time `structs:"created_at" json:"createdAt"`
	UpdatedAt    time.Time `structs:"updated_at" json:"updatedAt"`
}

type VideoClips []VideoClip

// VideoClipRepository defines persistence methods for video clips
type VideoClipRepository interface {
	ResourceRepository
	CountAll(options ...QueryOptions) (int64, error)
	Delete(id string) error
	Get(id string) (*VideoClip, error)
	GetByYoutubeID(youtubeID string) (*VideoClip, error)
	GetAll(options ...QueryOptions) (VideoClips, error)
	Put(v *VideoClip) error
	Exists(youtubeID string) (bool, error)
}
