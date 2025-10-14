-- Karaoke Migration Script
-- This script adds the missing columns to the karaoke_song table
-- Run this on the server database after deployment

-- Add lowercase columns for case-insensitive search
ALTER TABLE karaoke_song ADD COLUMN title_lower TEXT;
ALTER TABLE karaoke_song ADD COLUMN artist_lower TEXT;

-- Add new optional fields
ALTER TABLE karaoke_song ADD COLUMN source TEXT;
ALTER TABLE karaoke_song ADD COLUMN description TEXT;

-- Backfill lowercase values for existing records
UPDATE karaoke_song SET title_lower = LOWER(title);
UPDATE karaoke_song SET artist_lower = LOWER(artist);

-- Create indexes for better search performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_karaoke_title_lower ON karaoke_song(title_lower);
CREATE INDEX IF NOT EXISTS idx_karaoke_artist_lower ON karaoke_song(artist_lower);
