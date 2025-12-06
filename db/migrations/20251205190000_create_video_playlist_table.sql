-- +goose Up

-- Таблица для плейлистов видео (соответствует плейлистам YouTube)
CREATE TABLE IF NOT EXISTS video_playlist (
    id TEXT NOT NULL PRIMARY KEY,
    youtube_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    title_lower TEXT DEFAULT '' NOT NULL,
    description TEXT DEFAULT '' NOT NULL,
    thumbnail_url TEXT DEFAULT '' NOT NULL,
    channel_id TEXT DEFAULT '' NOT NULL,
    channel_name TEXT DEFAULT '' NOT NULL,
    video_count INTEGER DEFAULT 0 NOT NULL,
    is_channel_videos INTEGER DEFAULT 0 NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

-- Связующая таблица для клипов в плейлистах
CREATE TABLE IF NOT EXISTS video_playlist_clip (
    playlist_id TEXT NOT NULL,
    clip_id TEXT NOT NULL,
    position INTEGER DEFAULT 0 NOT NULL,
    added_at DATETIME NOT NULL,
    PRIMARY KEY (playlist_id, clip_id),
    FOREIGN KEY (playlist_id) REFERENCES video_playlist(id) ON DELETE CASCADE,
    FOREIGN KEY (clip_id) REFERENCES video_clip(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS video_playlist_youtube_id ON video_playlist(youtube_id);
CREATE INDEX IF NOT EXISTS video_playlist_channel_id ON video_playlist(channel_id);
CREATE INDEX IF NOT EXISTS video_playlist_clip_playlist_id ON video_playlist_clip(playlist_id);
CREATE INDEX IF NOT EXISTS video_playlist_clip_clip_id ON video_playlist_clip(clip_id);

-- +goose Down
DROP TABLE IF EXISTS video_playlist_clip;
DROP TABLE IF EXISTS video_playlist;
