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

type videoClipRepository struct {
	sqlRepository
}

func NewVideoClipRepository(ctx context.Context, db dbx.Builder) model.VideoClipRepository {
	r := &videoClipRepository{}
	r.ctx = ctx
	r.db = db

	r.registerModel(&model.VideoClip{}, map[string]filterFunc{
		"q": func(_ string, value any) Sqlizer {
			s, _ := value.(string)
			s = strings.ToLower(s)
			return Expr(
				"video_clip.title_lower LIKE ? OR video_clip.artist_lower LIKE ? OR video_clip.channel_name LIKE ?",
				"%"+s+"%", "%"+s+"%", "%"+s+"%",
			)
		},
		"title": func(_ string, value any) Sqlizer {
			s, _ := value.(string)
			s = strings.ToLower(s)
			return Expr("video_clip.title_lower LIKE ?", "%"+s+"%")
		},
		"artist": func(_ string, value any) Sqlizer {
			s, _ := value.(string)
			s = strings.ToLower(s)
			return Expr("video_clip.artist_lower LIKE ?", "%"+s+"%")
		},
		"channel_id": func(_ string, value any) Sqlizer {
			s, _ := value.(string)
			return Eq{"video_clip.channel_id": s}
		},
	})

	return r
}

func (r *videoClipRepository) isPermitted() bool {
	user := loggedUser(r.ctx)
	return user.IsAdmin
}

func (r *videoClipRepository) CountAll(options ...model.QueryOptions) (int64, error) {
	sql := r.newSelect()
	return r.count(sql, options...)
}

func (r *videoClipRepository) Delete(id string) error {
	if !r.isPermitted() {
		return rest.ErrPermissionDenied
	}
	return r.delete(Eq{"id": id})
}

func (r *videoClipRepository) Get(id string) (*model.VideoClip, error) {
	sel := r.newSelect().Where(Eq{"id": id}).Columns("*")
	res := model.VideoClip{}
	err := r.queryOne(sel, &res)
	return &res, err
}

func (r *videoClipRepository) GetByYoutubeID(youtubeID string) (*model.VideoClip, error) {
	sel := r.newSelect().Where(Eq{"youtube_id": youtubeID}).Columns("*")
	res := model.VideoClip{}
	err := r.queryOne(sel, &res)
	return &res, err
}

func (r *videoClipRepository) Exists(youtubeID string) (bool, error) {
	sel := r.newSelect().Where(Eq{"youtube_id": youtubeID}).Columns("id")
	res := model.VideoClip{}
	err := r.queryOne(sel, &res)
	if errors.Is(err, model.ErrNotFound) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (r *videoClipRepository) GetAll(options ...model.QueryOptions) (model.VideoClips, error) {
	sel := r.newSelect(options...).Columns("*")
	res := model.VideoClips{}
	err := r.queryAll(sel, &res)
	return res, err
}

func (r *videoClipRepository) Put(v *model.VideoClip) error {
	// Приводим к нижнему регистру перед сохранением
	v.TitleLower = strings.ToLower(v.Title)
	v.ArtistLower = strings.ToLower(v.Artist)
	v.UpdatedAt = time.Now()

	if v.ID == "" {
		// Новый объект — генерируем ID и устанавливаем CreatedAt
		v.ID = id.NewRandom()
		v.CreatedAt = time.Now()
	}

	// Теперь конвертируем в SQL args после установки всех полей
	values, _ := toSQLArgs(*v)

	if v.CreatedAt.IsZero() {
		// Это обновление существующей записи
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
		// Если запись не найдена, создаем новую (fallback)
		v.CreatedAt = time.Now()
		values["created_at"] = v.CreatedAt
	}

	// Создание новой записи
	insert := Insert(r.tableName).SetMap(values)
	_, err := r.executeSQL(insert)
	return err
}

func (r *videoClipRepository) Count(options ...rest.QueryOptions) (int64, error) {
	return r.CountAll(r.parseRestOptions(r.ctx, options...))
}

func (r *videoClipRepository) EntityName() string {
	return "videoClip"
}

func (r *videoClipRepository) NewInstance() interface{} {
	return &model.VideoClip{}
}

func (r *videoClipRepository) Read(id string) (interface{}, error) {
	return r.Get(id)
}

func (r *videoClipRepository) ReadAll(options ...rest.QueryOptions) (interface{}, error) {
	return r.GetAll(r.parseRestOptions(r.ctx, options...))
}

func (r *videoClipRepository) Save(entity interface{}) (string, error) {
	t := entity.(*model.VideoClip)
	if !r.isPermitted() {
		return "", rest.ErrPermissionDenied
	}
	err := r.Put(t)
	if errors.Is(err, model.ErrNotFound) {
		return "", rest.ErrNotFound
	}
	return t.ID, err
}

func (r *videoClipRepository) Update(id string, entity interface{}, cols ...string) error {
	t := entity.(*model.VideoClip)
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

var _ model.VideoClipRepository = (*videoClipRepository)(nil)
var _ rest.Repository = (*videoClipRepository)(nil)
var _ rest.Persistable = (*videoClipRepository)(nil)
