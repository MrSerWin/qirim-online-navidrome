package model

import "time"

// LyricsCrowdsource represents a user-submitted lyrics with moderation
type LyricsCrowdsource struct {
	ID           string    `structs:"id" json:"id"`
	MediaFileID  string    `structs:"media_file_id" json:"mediaFileId"`
	Content      string    `structs:"content" json:"content"`
	Language     string    `structs:"language" json:"language"`
	Status       string    `structs:"status" json:"status"` // pending, approved, rejected
	ModerationNote *string  `structs:"moderation_note,omitempty" json:"moderationNote,omitempty"`
	Version      int       `structs:"version" json:"version"`
	IsCurrent    bool      `structs:"is_current" json:"isCurrent"`
	CreatedBy    string    `structs:"created_by" json:"createdBy"`
	CreatedAt    time.Time `structs:"created_at" json:"createdAt"`
	ModeratedBy  *string   `structs:"moderated_by,omitempty" json:"moderatedBy,omitempty"`
	ModeratedAt  *time.Time `structs:"moderated_at,omitempty" json:"moderatedAt,omitempty"`

	// Song info (populated from media_file for moderation)
	SongTitle  string `structs:"song_title" json:"songTitle,omitempty"`
	SongArtist string `structs:"song_artist" json:"songArtist,omitempty"`

	// User info (populated from user table for moderation)
	CreatedByName string `structs:"created_by_name" json:"createdByName,omitempty"`
}

type LyricsCrowdsourceHistory struct {
	ID           string    `structs:"id" json:"id"`
	LyricsID     string    `structs:"lyrics_id" json:"lyricsId"`
	MediaFileID  string    `structs:"media_file_id" json:"mediaFileId"`
	Content      string    `structs:"content" json:"content"`
	Language     string    `structs:"language" json:"language"`
	Version      int       `structs:"version" json:"version"`
	CreatedBy    string    `structs:"created_by" json:"createdBy"`
	CreatedAt    time.Time `structs:"created_at" json:"createdAt"`
	ChangeNote   *string    `structs:"change_note,omitempty" json:"changeNote,omitempty"`
}

type LyricsCrowdsources []LyricsCrowdsource

// Repository interfaces
type LyricsCrowdsourceRepository interface {
	// Get current approved lyrics for a media file
	GetApproved(mediaFileID string) (*LyricsCrowdsource, error)

	// Get all versions (including pending) for a media file
	GetAll(mediaFileID string) (LyricsCrowdsources, error)

	// Get by ID
	Get(id string) (*LyricsCrowdsource, error)

	// Submit new lyrics (creates pending submission)
	Submit(lyrics *LyricsCrowdsource) error

	// Update existing lyrics (creates new version)
	Update(lyrics *LyricsCrowdsource, changeNote string) error

	// Get pending lyrics for moderation (admin only)
	GetPending(limit, offset int) (LyricsCrowdsources, error)

	// Count pending lyrics
	CountPending() (int64, error)

	// Get all approved lyrics (admin only)
	GetAllApproved(limit, offset int) (LyricsCrowdsources, error)

	// Count approved lyrics
	CountApproved() (int64, error)

	// Delete lyrics (admin only)
	Delete(id string) error

	// Approve lyrics (admin only)
	Approve(id string, moderatorID string) error

	// Reject lyrics (admin only)
	Reject(id string, moderatorID string, note string) error

	// Get history for specific lyrics
	GetHistory(lyricsID string) ([]LyricsCrowdsourceHistory, error)

	// Get history for media file
	GetMediaFileHistory(mediaFileID string) ([]LyricsCrowdsourceHistory, error)
}

// Constants for lyrics status
const (
	LyricsStatusPending  = "pending"
	LyricsStatusApproved = "approved"
	LyricsStatusRejected = "rejected"
)

// Constants for language codes
const (
	LangCrimeanTatar = "crh" // Crimean Tatar
	LangTurkish      = "tr"  // Turkish
	LangRussian      = "ru"  // Russian
	LangEnglish      = "en"  // English
	LangUkrainian    = "uk"  // Ukrainian
)
