-- +goose Up
-- Table for lyrics submissions with versioning and moderation
CREATE TABLE IF NOT EXISTS lyrics_crowdsource (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    media_file_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'crh', -- Language code (crh, tr, en, ru, etc.)

    -- Moderation fields
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    moderation_note TEXT,

    -- Versioning and tracking
    version INTEGER NOT NULL DEFAULT 1,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,

    -- User tracking
    created_by VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL,
    moderated_by VARCHAR(255),
    moderated_at DATETIME,

    FOREIGN KEY (media_file_id) REFERENCES media_file(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (moderated_by) REFERENCES user(id) ON DELETE SET NULL
);

-- Index for fast lookup by media file
CREATE INDEX IF NOT EXISTS idx_lyrics_crowdsource_media_file ON lyrics_crowdsource(media_file_id);

-- Index for finding current approved lyrics
CREATE INDEX IF NOT EXISTS idx_lyrics_crowdsource_current_approved ON lyrics_crowdsource(media_file_id, is_current, status);

-- Index for moderation queue
CREATE INDEX IF NOT EXISTS idx_lyrics_crowdsource_pending ON lyrics_crowdsource(status, created_at);

-- Table for lyrics edit history
CREATE TABLE IF NOT EXISTS lyrics_history (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    lyrics_id VARCHAR(255) NOT NULL,
    media_file_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    language VARCHAR(10),
    version INTEGER NOT NULL,

    -- Who made the change
    created_by VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL,

    -- Why was it changed
    change_note TEXT,

    FOREIGN KEY (lyrics_id) REFERENCES lyrics_crowdsource(id) ON DELETE CASCADE,
    FOREIGN KEY (media_file_id) REFERENCES media_file(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES user(id) ON DELETE CASCADE
);

-- Index for history lookup
CREATE INDEX IF NOT EXISTS idx_lyrics_history_lookup ON lyrics_history(lyrics_id, version);
CREATE INDEX IF NOT EXISTS idx_lyrics_history_media_file ON lyrics_history(media_file_id);

-- +goose Down

DROP INDEX IF EXISTS idx_lyrics_history_media_file;
DROP INDEX IF EXISTS idx_lyrics_history_lookup;
DROP TABLE IF EXISTS lyrics_history;

DROP INDEX IF EXISTS idx_lyrics_crowdsource_pending;
DROP INDEX IF EXISTS idx_lyrics_crowdsource_current_approved;
DROP INDEX IF EXISTS idx_lyrics_crowdsource_media_file;
DROP TABLE IF EXISTS lyrics_crowdsource;
