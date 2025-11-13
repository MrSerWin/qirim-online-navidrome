-- +goose Up
ALTER TABLE media_file ADD COLUMN global_play_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE media_file ADD COLUMN global_last_played DATETIME;

ALTER TABLE album ADD COLUMN global_play_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE album ADD COLUMN global_last_played DATETIME;

ALTER TABLE artist ADD COLUMN global_play_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE artist ADD COLUMN global_last_played DATETIME;

-- +goose Down
ALTER TABLE media_file DROP COLUMN global_play_count;
ALTER TABLE media_file DROP COLUMN global_last_played;

ALTER TABLE album DROP COLUMN global_play_count;
ALTER TABLE album DROP COLUMN global_last_played;

ALTER TABLE artist DROP COLUMN global_play_count;
ALTER TABLE artist DROP COLUMN global_last_played;
