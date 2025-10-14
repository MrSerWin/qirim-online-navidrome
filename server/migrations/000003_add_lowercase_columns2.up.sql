ALTER TABLE karaoke_song ADD COLUMN title_lower TEXT;
ALTER TABLE karaoke_song ADD COLUMN artist_lower TEXT;

-- Заполняем существующие записи
UPDATE karaoke_song
SET 
    title_lower = LOWER(title),
    artist_lower = LOWER(artist);
