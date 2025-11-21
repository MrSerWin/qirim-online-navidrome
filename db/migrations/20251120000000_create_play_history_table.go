package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upCreatePlayHistoryTable, downCreatePlayHistoryTable)
}

func upCreatePlayHistoryTable(ctx context.Context, tx *sql.Tx) error {
	// Create play_history table for detailed listening history
	_, err := tx.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS play_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    media_file_id TEXT NOT NULL,
    played_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration_played INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT 0,
    platform TEXT DEFAULT 'web',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (media_file_id) REFERENCES media_file(id) ON DELETE CASCADE
);
`)
	if err != nil {
		return err
	}

	// Create indexes for fast queries
	_, err = tx.ExecContext(ctx, `
CREATE INDEX IF NOT EXISTS idx_play_history_user_date
ON play_history(user_id, played_at DESC);
`)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `
CREATE INDEX IF NOT EXISTS idx_play_history_media_file
ON play_history(media_file_id);
`)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `
CREATE INDEX IF NOT EXISTS idx_play_history_user_media
ON play_history(user_id, media_file_id);
`)
	if err != nil {
		return err
	}

	return nil
}

func downCreatePlayHistoryTable(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, `DROP TABLE IF EXISTS play_history;`)
	return err
}
