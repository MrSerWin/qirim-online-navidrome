package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upAddURLAliases, downAddURLAliases)
}

func upAddURLAliases(ctx context.Context, tx *sql.Tx) error {
	// Add url_alias columns to all tables
	_, err := tx.ExecContext(ctx, `
		ALTER TABLE media_file ADD COLUMN url_alias VARCHAR(255) DEFAULT '';
		ALTER TABLE album ADD COLUMN url_alias VARCHAR(255) DEFAULT '';
		ALTER TABLE artist ADD COLUMN url_alias VARCHAR(255) DEFAULT '';
		
		-- Create indexes for url_alias columns
		CREATE INDEX IF NOT EXISTS idx_media_file_url_alias ON media_file(url_alias);
		CREATE INDEX IF NOT EXISTS idx_album_url_alias ON album(url_alias);
		CREATE INDEX IF NOT EXISTS idx_artist_url_alias ON artist(url_alias);
	`)
	return err
}

func downAddURLAliases(ctx context.Context, tx *sql.Tx) error {
	// Drop indexes
	_, err := tx.ExecContext(ctx, `
		DROP INDEX IF EXISTS idx_media_file_url_alias;
		DROP INDEX IF EXISTS idx_album_url_alias;
		DROP INDEX IF EXISTS idx_artist_url_alias;
		
		-- Drop columns
		ALTER TABLE media_file DROP COLUMN url_alias;
		ALTER TABLE album DROP COLUMN url_alias;
		ALTER TABLE artist DROP COLUMN url_alias;
	`)
	return err
}
