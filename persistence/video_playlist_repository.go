package persistence

import (
	"context"
	"errors"
	"strings"
	"time"

	. "github.com/Masterminds/squirrel"
	"github.com/deluan/rest"
	"github.com/navidrome/navidrome/model"
	"github.com/navidrome/navidrome/model/id"
	"github.com/pocketbase/dbx"
)

type videoPlaylistRepository struct {
	sqlRepository
}

func NewVideoPlaylistRepository(ctx context.Context, db dbx.Builder) model.VideoPlaylistRepository {
	r := &videoPlaylistRepository{}
	r.ctx = ctx
	r.db = db

	r.registerModel(&model.VideoPlaylist{}, map[string]filterFunc{
		"q": func(_ string, value any) Sqlizer {
			s, _ := value.(string)
			s = strings.ToLower(s)
			return Expr(
				"video_playlist.title_lower LIKE ? OR video_playlist.channel_name LIKE ?",
				"%"+s+"%", "%"+s+"%",
			)
		},
		"title": func(_ string, value any) Sqlizer {
			s, _ := value.(string)
			s = strings.ToLower(s)
			return Expr("video_playlist.title_lower LIKE ?", "%"+s+"%")
		},
		"channel_id": func(_ string, value any) Sqlizer {
			s, _ := value.(string)
			return Eq{"video_playlist.channel_id": s}
		},
		"is_channel_videos": func(_ string, value any) Sqlizer {
			b, _ := value.(bool)
			if b {
				return Eq{"video_playlist.is_channel_videos": 1}
			}
			return Eq{"video_playlist.is_channel_videos": 0}
		},
	})

	return r
}

func (r *videoPlaylistRepository) isPermitted() bool {
	user := loggedUser(r.ctx)
	return user.IsAdmin
}

func (r *videoPlaylistRepository) CountAll(options ...model.QueryOptions) (int64, error) {
	sql := r.newSelect()
	return r.count(sql, options...)
}

func (r *videoPlaylistRepository) Delete(id string) error {
	if !r.isPermitted() {
		return rest.ErrPermissionDenied
	}
	return r.delete(Eq{"id": id})
}

func (r *videoPlaylistRepository) Get(id string) (*model.VideoPlaylist, error) {
	sel := r.newSelect().Where(Eq{"id": id}).Columns("*")
	res := model.VideoPlaylist{}
	err := r.queryOne(sel, &res)
	return &res, err
}

func (r *videoPlaylistRepository) GetByYoutubeID(youtubeID string) (*model.VideoPlaylist, error) {
	sel := r.newSelect().Where(Eq{"youtube_id": youtubeID}).Columns("*")
	res := model.VideoPlaylist{}
	err := r.queryOne(sel, &res)
	return &res, err
}

func (r *videoPlaylistRepository) Exists(youtubeID string) (bool, error) {
	sel := r.newSelect().Where(Eq{"youtube_id": youtubeID}).Columns("id")
	res := model.VideoPlaylist{}
	err := r.queryOne(sel, &res)
	if errors.Is(err, model.ErrNotFound) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (r *videoPlaylistRepository) GetAll(options ...model.QueryOptions) (model.VideoPlaylists, error) {
	sel := r.newSelect(options...).Columns("*")
	res := model.VideoPlaylists{}
	err := r.queryAll(sel, &res)
	return res, err
}

func (r *videoPlaylistRepository) Put(v *model.VideoPlaylist) error {
	v.TitleLower = strings.ToLower(v.Title)
	v.UpdatedAt = time.Now()

	if v.ID == "" {
		v.ID = id.NewRandom()
		v.CreatedAt = time.Now()
	}

	values, _ := toSQLArgs(*v)

	if v.CreatedAt.IsZero() {
		update := Update(r.tableName).
			Where(Eq{"id": v.ID}).
			SetMap(values)
		count, err := r.executeSQL(update)
		if err != nil {
			return err
		}
		if count > 0 {
			return nil
		}
		v.CreatedAt = time.Now()
		values["created_at"] = v.CreatedAt
	}

	insert := Insert(r.tableName).SetMap(values)
	_, err := r.executeSQL(insert)
	return err
}

// AddClip adds a video clip to the playlist
func (r *videoPlaylistRepository) AddClip(playlistID, clipID string, position int) error {
	if !r.isPermitted() {
		return rest.ErrPermissionDenied
	}

	values := map[string]interface{}{
		"playlist_id": playlistID,
		"clip_id":     clipID,
		"position":    position,
		"added_at":    time.Now(),
	}

	insert := Insert("video_playlist_clip").SetMap(values)
	_, err := r.executeSQL(insert)
	if err != nil {
		return err
	}

	return r.UpdateVideoCount(playlistID)
}

// RemoveClip removes a video clip from the playlist
func (r *videoPlaylistRepository) RemoveClip(playlistID, clipID string) error {
	if !r.isPermitted() {
		return rest.ErrPermissionDenied
	}

	del := Delete("video_playlist_clip").Where(And{
		Eq{"playlist_id": playlistID},
		Eq{"clip_id": clipID},
	})
	_, err := r.executeSQL(del)
	if err != nil {
		return err
	}

	return r.UpdateVideoCount(playlistID)
}

// GetClips returns all video clips in the playlist
func (r *videoPlaylistRepository) GetClips(playlistID string, options ...model.QueryOptions) (model.VideoClips, error) {
	sel := Select("video_clip.*").
		From("video_clip").
		Join("video_playlist_clip ON video_clip.id = video_playlist_clip.clip_id").
		Where(Eq{"video_playlist_clip.playlist_id": playlistID}).
		OrderBy("video_playlist_clip.position ASC")

	res := model.VideoClips{}
	err := r.queryAll(sel, &res)
	return res, err
}

// GetClipCount returns the number of clips in the playlist
func (r *videoPlaylistRepository) GetClipCount(playlistID string) (int, error) {
	sel := Select("COUNT(*)").
		From("video_playlist_clip").
		Where(Eq{"playlist_id": playlistID})

	var count int
	err := r.queryOne(sel, &count)
	return count, err
}

// UpdateVideoCount updates the video_count field in the playlist
func (r *videoPlaylistRepository) UpdateVideoCount(playlistID string) error {
	count, err := r.GetClipCount(playlistID)
	if err != nil {
		return err
	}

	update := Update("video_playlist").
		Set("video_count", count).
		Set("updated_at", time.Now()).
		Where(Eq{"id": playlistID})

	_, err = r.executeSQL(update)
	return err
}

func (r *videoPlaylistRepository) Count(options ...rest.QueryOptions) (int64, error) {
	return r.CountAll(r.parseRestOptions(r.ctx, options...))
}

func (r *videoPlaylistRepository) EntityName() string {
	return "videoPlaylist"
}

func (r *videoPlaylistRepository) NewInstance() interface{} {
	return &model.VideoPlaylist{}
}

func (r *videoPlaylistRepository) Read(id string) (interface{}, error) {
	return r.Get(id)
}

func (r *videoPlaylistRepository) ReadAll(options ...rest.QueryOptions) (interface{}, error) {
	return r.GetAll(r.parseRestOptions(r.ctx, options...))
}

func (r *videoPlaylistRepository) Save(entity interface{}) (string, error) {
	t := entity.(*model.VideoPlaylist)
	if !r.isPermitted() {
		return "", rest.ErrPermissionDenied
	}
	err := r.Put(t)
	if errors.Is(err, model.ErrNotFound) {
		return "", rest.ErrNotFound
	}
	return t.ID, err
}

func (r *videoPlaylistRepository) Update(id string, entity interface{}, cols ...string) error {
	t := entity.(*model.VideoPlaylist)
	t.ID = id
	if !r.isPermitted() {
		return rest.ErrPermissionDenied
	}
	err := r.Put(t)
	if errors.Is(err, model.ErrNotFound) {
		return rest.ErrNotFound
	}
	return err
}

var _ model.VideoPlaylistRepository = (*videoPlaylistRepository)(nil)
var _ rest.Repository = (*videoPlaylistRepository)(nil)
var _ rest.Persistable = (*videoPlaylistRepository)(nil)
