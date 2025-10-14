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

type karaokeRepository struct {
	sqlRepository
}

func NewKaraokeRepository(ctx context.Context, db dbx.Builder) model.KaraokeRepository {
	r := &karaokeRepository{}
	r.ctx = ctx
	r.db = db

	r.registerModel(&model.KaraokeSong{}, map[string]filterFunc{
		"q": func(_ string, value any) Sqlizer {
			s, _ := value.(string)
			s = strings.ToLower(s)
			return Expr(
				"karaoke_song.title_lower LIKE ? OR karaoke_song.artist_lower LIKE ?",
				"%"+s+"%", "%"+s+"%",
			)
		},
		"title": func(_ string, value any) Sqlizer {
			s, _ := value.(string)
			s = strings.ToLower(s)
			return Expr("karaoke_song.title_lower LIKE ?", "%"+s+"%")
		},
		"artist": func(_ string, value any) Sqlizer {
			s, _ := value.(string)
			s = strings.ToLower(s)
			return Expr("karaoke_song.artist_lower LIKE ?", "%"+s+"%")
		},
	})

	return r
}

func (r *karaokeRepository) isPermitted() bool {
	user := loggedUser(r.ctx)
	return user.IsAdmin
}

func (r *karaokeRepository) CountAll(options ...model.QueryOptions) (int64, error) {
	sql := r.newSelect()
	return r.count(sql, options...)
}

func (r *karaokeRepository) Delete(id string) error {
	if !r.isPermitted() {
		return rest.ErrPermissionDenied
	}
	return r.delete(Eq{"id": id})
}

func (r *karaokeRepository) Get(id string) (*model.KaraokeSong, error) {
	sel := r.newSelect().Where(Eq{"id": id}).Columns("*")
	res := model.KaraokeSong{}
	err := r.queryOne(sel, &res)
	return &res, err
}

func (r *karaokeRepository) GetAll(options ...model.QueryOptions) (model.KaraokeSongs, error) {
	sel := r.newSelect(options...).Columns("*")
	res := model.KaraokeSongs{}
	err := r.queryAll(sel, &res)
	return res, err
}

func (r *karaokeRepository) Put(k *model.KaraokeSong) error {
	if !r.isPermitted() {
		return rest.ErrPermissionDenied
	}

	// Приводим к нижнему регистру перед сохранением
	k.TitleLower = strings.ToLower(k.Title)
	k.ArtistLower = strings.ToLower(k.Artist)
	k.UpdatedAt = time.Now()

	if k.ID == "" {
		// Новый объект — генерируем ID и устанавливаем CreatedAt
		k.ID = id.NewRandom()
		k.CreatedAt = time.Now()
	}

	// Теперь конвертируем в SQL args после установки всех полей
	values, _ := toSQLArgs(*k)

	if k.CreatedAt.IsZero() {
		// Это обновление существующей записи
		update := Update(r.tableName).
			Where(Eq{"id": k.ID}).
			SetMap(values)
		count, err := r.executeSQL(update)
		if err != nil {
			return err
		}
		if count > 0 {
			return nil
		}
		// Если запись не найдена, создаем новую (fallback)
		k.CreatedAt = time.Now()
		values["created_at"] = k.CreatedAt
	}

	// Создание новой записи
	insert := Insert(r.tableName).SetMap(values)
	_, err := r.executeSQL(insert)
	return err
}

func (r *karaokeRepository) Count(options ...rest.QueryOptions) (int64, error) {
	return r.CountAll(r.parseRestOptions(r.ctx, options...))
}

func (r *karaokeRepository) EntityName() string {
	return "karaoke"
}

func (r *karaokeRepository) NewInstance() interface{} {
	return &model.KaraokeSong{}
}

func (r *karaokeRepository) Read(id string) (interface{}, error) {
	return r.Get(id)
}

func (r *karaokeRepository) ReadAll(options ...rest.QueryOptions) (interface{}, error) {
	return r.GetAll(r.parseRestOptions(r.ctx, options...))
}

func (r *karaokeRepository) Save(entity interface{}) (string, error) {
	t := entity.(*model.KaraokeSong)
	if !r.isPermitted() {
		return "", rest.ErrPermissionDenied
	}
	err := r.Put(t)
	if errors.Is(err, model.ErrNotFound) {
		return "", rest.ErrNotFound
	}
	return t.ID, err
}

func (r *karaokeRepository) Update(id string, entity interface{}, cols ...string) error {
	t := entity.(*model.KaraokeSong)
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

var _ model.KaraokeRepository = (*karaokeRepository)(nil)
var _ rest.Repository = (*karaokeRepository)(nil)
var _ rest.Persistable = (*karaokeRepository)(nil)
