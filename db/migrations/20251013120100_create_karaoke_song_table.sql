-- +goose Up
CREATE TABLE IF NOT EXISTS karaoke_song (
    id varchar(255) not null primary key,
    title varchar not null,
    artist varchar default '' not null,
    youtube_url varchar not null,
    created_at datetime,
    updated_at datetime
);

-- +goose Down
DROP TABLE IF EXISTS karaoke_song;
