package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upCreateWrappedSharesTable, downCreateWrappedSharesTable)
}

func upCreateWrappedSharesTable(_ context.Context, tx *sql.Tx) error {
	_, err := tx.Exec(`
CREATE TABLE IF NOT EXISTS wrapped_shares (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    period TEXT NOT NULL DEFAULT 'year',
    share_id TEXT NOT NULL UNIQUE,
    data TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wrapped_shares_share_id
ON wrapped_shares(share_id);

CREATE INDEX IF NOT EXISTS idx_wrapped_shares_user_year
ON wrapped_shares(user_id, year, period);

CREATE INDEX IF NOT EXISTS idx_wrapped_shares_expires
ON wrapped_shares(expires_at);
	`)
	return err
}

func downCreateWrappedSharesTable(_ context.Context, tx *sql.Tx) error {
	_, err := tx.Exec(`
DROP INDEX IF EXISTS idx_wrapped_shares_expires;
DROP INDEX IF EXISTS idx_wrapped_shares_user_year;
DROP INDEX IF EXISTS idx_wrapped_shares_share_id;
DROP TABLE IF EXISTS wrapped_shares;
	`)
	return err
}
