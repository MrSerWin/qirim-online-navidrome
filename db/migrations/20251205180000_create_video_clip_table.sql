-- +goose Up
CREATE TABLE IF NOT EXISTS video_clip (
    id TEXT NOT NULL PRIMARY KEY,
    youtube_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    title_lower TEXT DEFAULT '' NOT NULL,
    artist TEXT DEFAULT '' NOT NULL,
    artist_lower TEXT DEFAULT '' NOT NULL,
    channel_id TEXT DEFAULT '' NOT NULL,
    channel_name TEXT DEFAULT '' NOT NULL,
    description TEXT DEFAULT '' NOT NULL,
    duration INTEGER DEFAULT 0 NOT NULL,
    thumbnail_url TEXT DEFAULT '' NOT NULL,
    view_count INTEGER DEFAULT 0 NOT NULL,
    published_at DATETIME,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS video_clip_youtube_id ON video_clip(youtube_id);
CREATE INDEX IF NOT EXISTS video_clip_channel_id ON video_clip(channel_id);
CREATE INDEX IF NOT EXISTS video_clip_title_lower ON video_clip(title_lower);
CREATE INDEX IF NOT EXISTS video_clip_artist_lower ON video_clip(artist_lower);
CREATE INDEX IF NOT EXISTS video_clip_published_at ON video_clip(published_at);
CREATE INDEX IF NOT EXISTS video_clip_created_at ON video_clip(created_at);

-- +goose Down
DROP TABLE IF EXISTS video_clip;
