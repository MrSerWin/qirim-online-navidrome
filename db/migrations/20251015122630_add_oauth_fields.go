package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upAddOAuthFields, downAddOAuthFields)
}

func upAddOAuthFields(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, `
		-- Add OAuth provider ID fields to user table
		ALTER TABLE user ADD COLUMN google_id VARCHAR(255) DEFAULT '';
		ALTER TABLE user ADD COLUMN apple_id VARCHAR(255) DEFAULT '';
		ALTER TABLE user ADD COLUMN instagram_id VARCHAR(255) DEFAULT '';
		ALTER TABLE user ADD COLUMN facebook_id VARCHAR(255) DEFAULT '';

		-- Create indexes for OAuth lookups
		CREATE INDEX idx_user_google_id ON user(google_id);
		CREATE INDEX idx_user_apple_id ON user(apple_id);
		CREATE INDEX idx_user_instagram_id ON user(instagram_id);
		CREATE INDEX idx_user_facebook_id ON user(facebook_id);
	`)
	return err
}

func downAddOAuthFields(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, `
		-- Drop OAuth indexes
		DROP INDEX IF EXISTS idx_user_facebook_id;
		DROP INDEX IF EXISTS idx_user_instagram_id;
		DROP INDEX IF EXISTS idx_user_apple_id;
		DROP INDEX IF EXISTS idx_user_google_id;

		-- Drop OAuth fields
		ALTER TABLE user DROP COLUMN IF EXISTS facebook_id;
		ALTER TABLE user DROP COLUMN IF EXISTS instagram_id;
		ALTER TABLE user DROP COLUMN IF EXISTS apple_id;
		ALTER TABLE user DROP COLUMN IF EXISTS google_id;
	`)
	return err
}
