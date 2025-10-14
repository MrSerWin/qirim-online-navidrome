package model

import "time"

// KaraokeSong represents a karaoke entry added by admin
type KaraokeSong struct {
	ID          string    `structs:"id" json:"id"`
	Title       string    `structs:"title" json:"title"`
	TitleLower  string    `structs:"title_lower" json:"titleLower" db:"title_lower"`
	Artist      string    `structs:"artist" json:"artist" db:"artist"`
	ArtistLower string    `structs:"artist_lower" json:"artistLower" db:"artist_lower"`
	YoutubeUrl  string    `structs:"youtube_url" json:"youtubeUrl"`
	CreatedAt   time.Time `structs:"created_at" json:"createdAt"`
	UpdatedAt   time.Time `structs:"updated_at" json:"updatedAt"`
}

type KaraokeSongs []KaraokeSong

// KaraokeRepository defines persistence methods for karaoke songs
type KaraokeRepository interface {
	ResourceRepository
	CountAll(options ...QueryOptions) (int64, error)
	Delete(id string) error
	Get(id string) (*KaraokeSong, error)
	GetAll(options ...QueryOptions) (KaraokeSongs, error)
	Put(k *KaraokeSong) error
}
