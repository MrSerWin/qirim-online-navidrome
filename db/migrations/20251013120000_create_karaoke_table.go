package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upCreateKaraokeTable, downCreateKaraokeTable)
}

func upCreateKaraokeTable(_ context.Context, tx *sql.Tx) error {
	_, err := tx.Exec(`
        CREATE TABLE IF NOT EXISTS karaoke_song (
            id varchar(255) not null primary key,
            title varchar not null,
            artist varchar default '' not null,
            youtube_url varchar not null,
            created_at datetime,
            updated_at datetime
        );
    `)
	return err
}

func downCreateKaraokeTable(_ context.Context, tx *sql.Tx) error {
	_, err := tx.Exec(`DROP TABLE IF EXISTS karaoke_song;`)
	return err
}
