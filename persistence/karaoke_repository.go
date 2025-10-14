package persistence

import (
	"context"
	"errors"
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
		"q":      karaokeFilter,
		"title":  containsFilter("title"),
		"artist": containsFilter("artist"),
	})
	return r
}

func karaokeFilter(_ string, value interface{}) Sqlizer {
	return Or{
		substringFilter("karaoke_song.title", value),
		substringFilter("karaoke_song.artist", value),
	}
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

	var values map[string]interface{}

	k.UpdatedAt = time.Now()

	if k.ID == "" {
		k.CreatedAt = time.Now()
		k.ID = id.NewRandom()
		values, _ = toSQLArgs(*k)
	} else {
		values, _ = toSQLArgs(*k)
		update := Update(r.tableName).Where(Eq{"id": k.ID}).SetMap(values)
		count, err := r.executeSQL(update)
		if err != nil {
			return err
		} else if count > 0 {
			return nil
		}
	}

	values["created_at"] = time.Now()
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
