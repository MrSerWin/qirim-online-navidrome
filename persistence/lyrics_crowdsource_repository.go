package persistence

import (
	"context"
	"time"

	. "github.com/Masterminds/squirrel"
	"github.com/google/uuid"
	"github.com/navidrome/navidrome/log"
	"github.com/navidrome/navidrome/model"
	"github.com/pocketbase/dbx"
)

type lyricsCrowdsourceRepository struct {
	sqlRepository
}

func NewLyricsCrowdsourceRepository(ctx context.Context, db dbx.Builder) model.LyricsCrowdsourceRepository {
	r := &lyricsCrowdsourceRepository{}
	r.ctx = ctx
	r.db = db
	r.tableName = "lyrics_crowdsource"
	return r
}

// GetApproved gets the current approved lyrics for a media file
func (r *lyricsCrowdsourceRepository) GetApproved(mediaFileID string) (*model.LyricsCrowdsource, error) {
	sql := Select("*").From(r.tableName).
		Where(Eq{
			"media_file_id": mediaFileID,
			"status":        model.LyricsStatusApproved,
			"is_current":    true,
		}).
		OrderBy("created_at DESC").
		Limit(1)

	var lyrics model.LyricsCrowdsource
	err := r.queryOne(sql, &lyrics)
	return &lyrics, err
}

// GetAll gets all versions (including pending) for a media file
func (r *lyricsCrowdsourceRepository) GetAll(mediaFileID string) (model.LyricsCrowdsources, error) {
	sql := Select("*").From(r.tableName).
		Where(Eq{"media_file_id": mediaFileID}).
		OrderBy("version DESC")

	var lyrics model.LyricsCrowdsources
	err := r.queryAll(sql, &lyrics)
	return lyrics, err
}

// Get gets a specific lyrics by ID
func (r *lyricsCrowdsourceRepository) Get(id string) (*model.LyricsCrowdsource, error) {
	sql := Select("*").From(r.tableName).
		Where(Eq{"id": id})

	var lyrics model.LyricsCrowdsource
	err := r.queryOne(sql, &lyrics)
	return &lyrics, err
}

// Submit creates a new pending lyrics submission
func (r *lyricsCrowdsourceRepository) Submit(lyrics *model.LyricsCrowdsource) error {
	if lyrics.ID == "" {
		lyrics.ID = uuid.NewString()
	}
	lyrics.Status = model.LyricsStatusPending
	lyrics.Version = 1
	lyrics.IsCurrent = false
	lyrics.CreatedAt = time.Now()

	sql := Insert(r.tableName).
		Columns("id", "media_file_id", "content", "language", "status", "version", "is_current", "created_by", "created_at").
		Values(lyrics.ID, lyrics.MediaFileID, lyrics.Content, lyrics.Language, lyrics.Status, lyrics.Version, lyrics.IsCurrent, lyrics.CreatedBy, lyrics.CreatedAt)

	_, err := r.executeSQL(sql)
	return err
}

// Update creates a new version of existing lyrics
func (r *lyricsCrowdsourceRepository) Update(lyrics *model.LyricsCrowdsource, changeNote string) error {
	// Get current lyrics to increment version
	current, err := r.Get(lyrics.ID)
	if err != nil {
		return err
	}

	// Use dbx.DB to start transaction
	dbConn, ok := r.db.(*dbx.DB)
	if !ok {
		return model.ErrNotAvailable
	}

	return dbConn.Transactional(func(tx *dbx.Tx) error {
		// Save to history
		historyID := uuid.NewString()
		historySql := Insert("lyrics_history").
			Columns("id", "lyrics_id", "media_file_id", "content", "language", "version", "created_by", "created_at", "change_note").
			Values(historyID, current.ID, current.MediaFileID, current.Content, current.Language, current.Version, current.CreatedBy, current.CreatedAt, &changeNote)

		query, params, err := r.toSQL(historySql)
		if err != nil {
			return err
		}

		_, err = tx.NewQuery(query).Bind(params).WithContext(r.ctx).Execute()
		if err != nil {
			return err
		}

		// Update lyrics with new version
		newVersion := current.Version + 1
		updateSql := Update(r.tableName).
			Set("content", lyrics.Content).
			Set("language", lyrics.Language).
			Set("version", newVersion).
			Set("status", model.LyricsStatusPending).
			Set("is_current", false).
			Set("moderation_note", nil).
			Set("moderated_by", nil).
			Set("moderated_at", nil).
			Where(Eq{"id": lyrics.ID})

		query, params, err = r.toSQL(updateSql)
		if err != nil {
			return err
		}

		_, err = tx.NewQuery(query).Bind(params).WithContext(r.ctx).Execute()
		return err
	})
}

// GetPending gets pending lyrics for moderation (admin only)
func (r *lyricsCrowdsourceRepository) GetPending(limit, offset int) (model.LyricsCrowdsources, error) {
	sql := Select(
		r.tableName+".*",
		"media_file.title as song_title",
		"media_file.artist as song_artist",
		"user.user_name as created_by_name",
	).From(r.tableName).
		LeftJoin("media_file ON media_file.id = "+r.tableName+".media_file_id").
		LeftJoin("user ON user.id = "+r.tableName+".created_by").
		Where(Eq{r.tableName + ".status": model.LyricsStatusPending}).
		OrderBy(r.tableName + ".created_at ASC").
		Limit(uint64(limit)).
		Offset(uint64(offset))

	var lyrics model.LyricsCrowdsources
	err := r.queryAll(sql, &lyrics)
	return lyrics, err
}

// CountPending counts pending lyrics
func (r *lyricsCrowdsourceRepository) CountPending() (int64, error) {
	sql := Select("count(*)").From(r.tableName).
		Where(Eq{"status": model.LyricsStatusPending})

	query, args, err := r.toSQL(sql)
	if err != nil {
		return 0, err
	}

	var count int64
	err = r.db.NewQuery(query).Bind(args).WithContext(r.ctx).Row(&count)
	return count, err
}

// GetAllApproved gets all approved lyrics (admin only)
func (r *lyricsCrowdsourceRepository) GetAllApproved(limit, offset int) (model.LyricsCrowdsources, error) {
	sql := Select(
		r.tableName+".*",
		"media_file.title as song_title",
		"media_file.artist as song_artist",
		"user.user_name as created_by_name",
	).From(r.tableName).
		LeftJoin("media_file ON media_file.id = "+r.tableName+".media_file_id").
		LeftJoin("user ON user.id = "+r.tableName+".created_by").
		Where(Eq{r.tableName + ".status": model.LyricsStatusApproved, r.tableName + ".is_current": true}).
		OrderBy(r.tableName + ".created_at DESC").
		Limit(uint64(limit)).
		Offset(uint64(offset))

	var lyrics model.LyricsCrowdsources
	err := r.queryAll(sql, &lyrics)
	return lyrics, err
}

// CountApproved counts approved lyrics
func (r *lyricsCrowdsourceRepository) CountApproved() (int64, error) {
	sql := Select("count(*)").From(r.tableName).
		Where(Eq{"status": model.LyricsStatusApproved, "is_current": true})

	query, args, err := r.toSQL(sql)
	if err != nil {
		return 0, err
	}

	var count int64
	err = r.db.NewQuery(query).Bind(args).WithContext(r.ctx).Row(&count)
	return count, err
}

// Delete deletes lyrics and all its history (admin only)
func (r *lyricsCrowdsourceRepository) Delete(id string) error {
	// Get the lyrics to find all related entries
	lyrics, err := r.Get(id)
	if err != nil {
		return err
	}

	// Use dbx.DB to start transaction
	dbConn, ok := r.db.(*dbx.DB)
	if !ok {
		return model.ErrNotAvailable
	}

	return dbConn.Transactional(func(tx *dbx.Tx) error {
		// Delete history entries
		deleteHistorySql := Delete("lyrics_history").
			Where(Eq{"lyrics_id": id})

		query, params, err := r.toSQL(deleteHistorySql)
		if err != nil {
			return err
		}

		_, err = tx.NewQuery(query).Bind(params).WithContext(r.ctx).Execute()
		if err != nil {
			return err
		}

		// Delete the lyrics entry
		deleteSql := Delete(r.tableName).
			Where(Eq{"id": id})

		query, params, err = r.toSQL(deleteSql)
		if err != nil {
			return err
		}

		_, err = tx.NewQuery(query).Bind(params).WithContext(r.ctx).Execute()
		if err != nil {
			return err
		}

		// If this was the current version, check if there are other versions for the same media file
		// and make the latest one current
		if lyrics.IsCurrent {
			selectLatestSql := Select("id").From(r.tableName).
				Where(Eq{"media_file_id": lyrics.MediaFileID, "status": model.LyricsStatusApproved}).
				OrderBy("version DESC").
				Limit(1)

			query, params, err = r.toSQL(selectLatestSql)
			if err != nil {
				return err
			}

			var latestID string
			err = tx.NewQuery(query).Bind(params).WithContext(r.ctx).Row(&latestID)
			if err == nil && latestID != "" {
				// Make the latest version current
				updateLatestSql := Update(r.tableName).
					Set("is_current", true).
					Where(Eq{"id": latestID})

				query, params, err = r.toSQL(updateLatestSql)
				if err != nil {
					return err
				}

				_, err = tx.NewQuery(query).Bind(params).WithContext(r.ctx).Execute()
				if err != nil {
					return err
				}
			}
		}

		return nil
	})
}

// Approve approves pending lyrics (admin only)
func (r *lyricsCrowdsourceRepository) Approve(id string, moderatorID string) error {
	// Get the lyrics being approved
	lyrics, err := r.Get(id)
	if err != nil {
		return err
	}

	if lyrics.Status != model.LyricsStatusPending {
		return model.ErrNotAvailable
	}

	now := time.Now()

	// Use dbx.DB to start transaction
	dbConn, ok := r.db.(*dbx.DB)
	if !ok {
		return model.ErrNotAvailable
	}

	return dbConn.Transactional(func(tx *dbx.Tx) error {
		// Mark all other lyrics for this media file as not current
		unsetCurrentSql := Update(r.tableName).
			Set("is_current", false).
			Where(Eq{"media_file_id": lyrics.MediaFileID})

		query, params, err := r.toSQL(unsetCurrentSql)
		if err != nil {
			return err
		}

		_, err = tx.NewQuery(query).Bind(params).WithContext(r.ctx).Execute()
		if err != nil {
			return err
		}

		// Approve this lyrics and mark as current
		approveSql := Update(r.tableName).
			Set("status", model.LyricsStatusApproved).
			Set("is_current", true).
			Set("moderated_by", moderatorID).
			Set("moderated_at", now).
			Where(Eq{"id": id})

		query, params, err = r.toSQL(approveSql)
		if err != nil {
			return err
		}

		_, err = tx.NewQuery(query).Bind(params).WithContext(r.ctx).Execute()
		return err
	})
}

// Reject rejects pending lyrics (admin only)
func (r *lyricsCrowdsourceRepository) Reject(id string, moderatorID string, note string) error {
	lyrics, err := r.Get(id)
	if err != nil {
		return err
	}

	if lyrics.Status != model.LyricsStatusPending {
		return model.ErrNotAvailable
	}

	now := time.Now()
	sql := Update(r.tableName).
		Set("status", model.LyricsStatusRejected).
		Set("moderation_note", &note).
		Set("moderated_by", moderatorID).
		Set("moderated_at", now).
		Where(Eq{"id": id})

	_, err = r.executeSQL(sql)
	return err
}

// GetHistory gets history for specific lyrics
func (r *lyricsCrowdsourceRepository) GetHistory(lyricsID string) ([]model.LyricsCrowdsourceHistory, error) {
	sql := Select("*").From("lyrics_history").
		Where(Eq{"lyrics_id": lyricsID}).
		OrderBy("version DESC")

	var history []model.LyricsCrowdsourceHistory
	err := r.queryAll(sql, &history)
	return history, err
}

// GetMediaFileHistory gets history for media file
func (r *lyricsCrowdsourceRepository) GetMediaFileHistory(mediaFileID string) ([]model.LyricsCrowdsourceHistory, error) {
	sql := Select("*").From("lyrics_history").
		Where(Eq{"media_file_id": mediaFileID}).
		OrderBy("created_at DESC")

	var history []model.LyricsCrowdsourceHistory
	err := r.queryAll(sql, &history)
	if err == nil {
		log.Debug(r.ctx, "Retrieved lyrics history for media file", "mediaFileId", mediaFileID, "count", len(history))
	}
	return history, err
}
