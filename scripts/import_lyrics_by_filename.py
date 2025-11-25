#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Import lyrics by matching filenames with song titles.
For production use - automatically matches and imports lyrics where filename matches song title.
"""

import sqlite3
import os
import re
from pathlib import Path
from datetime import datetime
import hashlib
import unicodedata

# Transliteration map: Cyrillic Crimean Tatar -> Latin
TRANSLIT_MAP = {
    'А': 'A', 'а': 'a',
    'Б': 'B', 'б': 'b',
    'В': 'V', 'в': 'v',
    'Г': 'G', 'г': 'g',
    'Гъ': 'Ğ', 'гъ': 'ğ',
    'Д': 'D', 'д': 'd',
    'Е': 'E', 'е': 'e',
    'Ё': 'Yo', 'ё': 'yo',
    'Ж': 'J', 'ж': 'j',
    'З': 'Z', 'з': 'z',
    'И': 'İ', 'и': 'i',
    'Й': 'Y', 'й': 'y',
    'К': 'K', 'к': 'k',
    'Къ': 'Q', 'къ': 'q',
    'Л': 'L', 'л': 'l',
    'М': 'M', 'м': 'm',
    'Н': 'N', 'н': 'n',
    'Нъ': 'Ñ', 'нъ': 'ñ',
    'О': 'O', 'о': 'o',
    'П': 'P', 'п': 'p',
    'Р': 'R', 'р': 'r',
    'С': 'S', 'с': 's',
    'Т': 'T', 'т': 't',
    'У': 'U', 'у': 'u',
    'Ф': 'F', 'ф': 'f',
    'Х': 'H', 'х': 'h',
    'Ц': 'Ts', 'ц': 'ts',
    'Ч': 'Ç', 'ч': 'ç',
    'Дж': 'C', 'дж': 'c',
    'Ш': 'Ş', 'ш': 'ş',
    'Щ': 'Şç', 'щ': 'şç',
    'Ъ': '', 'ъ': '',
    'Ы': 'I', 'ы': 'ı',
    'Ь': '', 'ь': '',
    'Э': 'E', 'э': 'e',
    'Ю': 'Yu', 'ю': 'yu',
    'Я': 'Ya', 'я': 'ya',
    'Ё': 'Yo', 'ё': 'yo',
    'І': 'İ', 'і': 'i',
    'Ї': 'Yi', 'ї': 'yi',
    'Ґ': 'G', 'ґ': 'g',
}

def transliterate(text):
    """Convert Cyrillic to Latin using Crimean Tatar transliteration."""
    result = text
    # Sort by length descending to handle multi-char mappings first
    for cyr, lat in sorted(TRANSLIT_MAP.items(), key=lambda x: -len(x[0])):
        result = result.replace(cyr, lat)
    return result

def normalize_title(title):
    """Normalize title for comparison: lowercase, remove special chars."""
    # Normalize Unicode to NFC form (composed) to handle combining characters
    title = unicodedata.normalize('NFC', title)

    # Transliterate if contains Cyrillic
    if re.search('[А-Яа-яЁёҐґІіЇї]', title):
        title = transliterate(title)

    # Lowercase and remove special characters
    title = title.lower()
    title = re.sub(r'[^a-zäöüğçşñıə0-9\s]', '', title)
    # Remove extra spaces
    title = re.sub(r'\s+', ' ', title).strip()
    return title

def extract_song_title(title):
    """Extract song title from 'Artist - Title' or 'Artist-Title' format."""
    if '-' in title:
        parts = title.split('-', 1)
        if len(parts) == 2:
            return parts[1].strip()
    return title

def read_lyrics_file(file_path):
    """Read lyrics content from file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read().strip()
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return None

def get_all_songs_from_db(db_path):
    """Get all songs from database, grouped by normalized title."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, title, artist, album
        FROM media_file
        ORDER BY title
    """)

    # Group songs by normalized title (both full title and extracted song title)
    songs_by_title = {}
    for row in cursor.fetchall():
        song = {
            'id': row[0],
            'title': row[1],
            'artist': row[2],
            'album': row[3],
        }

        # Add to both full normalized title and extracted song title
        full_normalized = normalize_title(row[1])
        song_title_only = extract_song_title(row[1])
        title_normalized = normalize_title(song_title_only)

        # Group by full normalized title
        if full_normalized not in songs_by_title:
            songs_by_title[full_normalized] = []
        songs_by_title[full_normalized].append(song)

        # Also group by extracted song title (if different)
        if title_normalized != full_normalized:
            if title_normalized not in songs_by_title:
                songs_by_title[title_normalized] = []
            # Avoid duplicates
            if song not in songs_by_title[title_normalized]:
                songs_by_title[title_normalized].append(song)

    conn.close()
    return songs_by_title

def get_lyrics_files(lyrics_dirs):
    """Get all lyrics files from multiple directories."""
    lyrics_files = []
    for source_name, lyrics_dir in lyrics_dirs.items():
        lyrics_path = Path(lyrics_dir)
        if not lyrics_path.exists():
            print(f"Warning: Directory {lyrics_dir} does not exist, skipping...")
            continue

        for file_path in lyrics_path.glob('*.txt'):
            if file_path.name == '_progress.txt':
                continue

            filename = file_path.stem  # Without extension
            normalized = normalize_title(filename)

            lyrics_files.append({
                'path': str(file_path),
                'filename': filename,
                'normalized': normalized,
                'source': source_name
            })

    return lyrics_files

def import_matched_lyrics(db_path, lyrics_dirs, dry_run=False):
    """Import lyrics where filename matches song title - applies to ALL matching songs."""

    print("Loading songs from database...")
    songs_by_title = get_all_songs_from_db(db_path)
    total_songs = sum(len(songs) for songs in songs_by_title.values())
    print(f"Found {total_songs} songs (grouped by {len(songs_by_title)} unique titles)\n")

    print("Loading lyrics files...")
    lyrics_files = get_lyrics_files(lyrics_dirs)

    # Stats per source
    source_counts = {}
    for lf in lyrics_files:
        source_counts[lf['source']] = source_counts.get(lf['source'], 0) + 1

    for source, count in source_counts.items():
        print(f"  [{source}]: {count} files")
    print(f"Total: {len(lyrics_files)} lyrics files\n")

    if dry_run:
        print("=" * 80)
        print("DRY RUN - No changes will be made")
        print("=" * 80)
        print()

    # Import matches
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get admin user ID
    cursor.execute("SELECT id FROM user WHERE is_admin = 1 LIMIT 1")
    admin = cursor.fetchone()
    if admin:
        created_by_id = admin[0]
    else:
        cursor.execute("SELECT id FROM user LIMIT 1")
        first_user = cursor.fetchone()
        if first_user:
            created_by_id = first_user[0]
        else:
            print("Error: No users found in database")
            conn.close()
            return

    files_processed = 0
    total_songs_updated = 0
    skipped_no_match = 0
    skipped_has_lyrics = 0
    error_count = 0

    # Track processed files to avoid duplicates
    processed_files = set()

    for lyrics in lyrics_files:
        if lyrics['path'] in processed_files:
            continue
        processed_files.add(lyrics['path'])

        # Extract song title from lyrics filename (remove artist if present)
        song_title_from_lyrics = extract_song_title(lyrics['filename'])
        normalized_title = normalize_title(song_title_from_lyrics)

        # Find all matching songs
        matching_songs = songs_by_title.get(normalized_title, [])

        if not matching_songs:
            skipped_no_match += 1
            continue

        # Read lyrics content
        content = read_lyrics_file(lyrics['path'])
        if not content:
            print(f"✗ Error reading file: [{lyrics['source']}] {lyrics['filename']}")
            error_count += 1
            continue

        print(f"\n📝 Processing: [{lyrics['source']}] {lyrics['filename']}")
        print(f"   Found {len(matching_songs)} matching songs")

        songs_updated_for_this_file = 0

        for song in matching_songs:
            # Check if approved lyrics already exist
            cursor.execute("""
                SELECT id FROM lyrics_crowdsource
                WHERE media_file_id = ? AND status = 'approved'
            """, (song['id'],))

            if cursor.fetchone():
                print(f"   ⊘ Skipped (has lyrics): {song['title']} - {song['artist']}")
                skipped_has_lyrics += 1
                continue

            if dry_run:
                print(f"   [DRY RUN] Would add: {song['title']} - {song['artist']}")
                songs_updated_for_this_file += 1
                total_songs_updated += 1
                continue

            # Import lyrics
            try:
                now = datetime.utcnow().isoformat()
                lyrics_id = hashlib.sha256(f"{song['id']}{now}".encode()).hexdigest()[:22]

                cursor.execute("""
                    INSERT INTO lyrics_crowdsource (
                        id, media_file_id, content, language, status,
                        created_by, created_at,
                        moderated_by, moderated_at, moderation_note
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    lyrics_id,
                    song['id'],
                    content,
                    'crh',
                    'approved',
                    created_by_id,
                    now,
                    created_by_id,
                    now,
                    f'Auto-imported from {lyrics["source"]} by filename match'
                ))

                # Add history entry
                history_id = hashlib.sha256(f"{lyrics_id}{now}h".encode()).hexdigest()[:22]
                cursor.execute("""
                    INSERT INTO lyrics_history (
                        id, lyrics_id, media_file_id, version, content, language,
                        created_by, created_at, change_note
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    history_id,
                    lyrics_id,
                    song['id'],
                    1,
                    content,
                    'crh',
                    created_by_id,
                    now,
                    f'Initial import from {lyrics["source"]}'
                ))

                conn.commit()
                print(f"   ✓ Added: {song['title']} - {song['artist']}")
                songs_updated_for_this_file += 1
                total_songs_updated += 1

            except Exception as e:
                print(f"   ✗ Error: {song['title']} - {e}")
                error_count += 1
                conn.rollback()

        if songs_updated_for_this_file > 0:
            files_processed += 1

    conn.close()

    print()
    print("=" * 80)
    print("IMPORT SUMMARY")
    print("=" * 80)
    print(f"✓ Lyrics files processed: {files_processed}")
    print(f"✓ Total songs updated:    {total_songs_updated}")
    print(f"⊘ Skipped (has lyrics):   {skipped_has_lyrics}")
    print(f"⚠ Skipped (no match):     {skipped_no_match}")
    print(f"✗ Errors:                 {error_count}")
    print("=" * 80)

if __name__ == '__main__':
    import sys

    DB_PATH = '../navidrome-data/navidrome.db'
    LYRICS_DIRS = {
        'sattarov': 'scripts/lyrics_sattarov',
        'crh_lt': 'scripts/lyrics_crh_lt',
        'qmusic': 'scripts/lyrics_qmusic'
    }

    # Check for --dry-run flag
    dry_run = '--dry-run' in sys.argv

    print("=" * 80)
    if dry_run:
        print("LYRICS IMPORT BY FILENAME MATCH (DRY RUN)")
    else:
        print("LYRICS IMPORT BY FILENAME MATCH")
    print("=" * 80)
    print()

    import_matched_lyrics(DB_PATH, LYRICS_DIRS, dry_run=dry_run)

    if dry_run:
        print("\nRun without --dry-run flag to actually import lyrics")
    else:
        print("\nDone!")
