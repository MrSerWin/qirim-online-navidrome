#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Import lyrics from CSV - applies lyrics to ALL matching songs with same title.
For example, if there are 18 songs named "Bağçalarda kestane",
lyrics will be applied to all 18 songs.
"""

import sqlite3
import csv
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
    'І': 'İ', 'і': 'i',
    'Ї': 'Yi', 'ї': 'yi',
    'Ґ': 'G', 'ґ': 'g',
}

def transliterate(text):
    """Convert Cyrillic to Latin using Crimean Tatar transliteration."""
    result = text
    for cyr, lat in sorted(TRANSLIT_MAP.items(), key=lambda x: -len(x[0])):
        result = result.replace(cyr, lat)
    return result

def normalize_title(title):
    """Normalize title for comparison."""
    # Normalize Unicode to NFC form (composed) to handle combining characters
    title = unicodedata.normalize('NFC', title)

    if re.search('[А-Яа-яЁёҐґІіЇї]', title):
        title = transliterate(title)
    title = title.lower()
    title = re.sub(r'[^a-zäöüğçşñıə0-9\s]', '', title)
    title = re.sub(r'\s+', ' ', title).strip()
    return title

def extract_song_title(title):
    """Extract song title from 'Artist - Title' or 'Artist-Title' format."""
    # If there's a dash, assume format is "Artist - Title" and extract title part
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

def find_all_matching_songs(cursor, normalized_title):
    """Find ALL songs in database that match the normalized title."""
    cursor.execute("""
        SELECT id, title, artist, album
        FROM media_file
    """)

    matching_songs = []
    for row in cursor.fetchall():
        # Try both: full title match AND song-title-only match (after extracting from "Artist-Title")
        song_full_normalized = normalize_title(row[1])
        song_title_only = extract_song_title(row[1])
        song_title_normalized = normalize_title(song_title_only)

        if song_full_normalized == normalized_title or song_title_normalized == normalized_title:
            matching_songs.append({
                'id': row[0],
                'title': row[1],
                'artist': row[2],
                'album': row[3]
            })

    return matching_songs

def import_lyrics_multi_match(db_path, csv_path):
    """Import lyrics from CSV, applying to ALL songs with matching titles."""

    if not Path(csv_path).exists():
        print(f"Error: CSV file not found: {csv_path}")
        return

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

    print(f"Using user ID for import: {created_by_id}\n")

    imported_count = 0
    skipped_count = 0
    error_count = 0
    total_songs_updated = 0

    # Track processed lyrics files to avoid duplicates
    processed_files = set()

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter=';')

        for row in reader:
            is_match = row.get('IsMatch', '').strip().upper()

            if is_match != 'Y':
                skipped_count += 1
                continue

            file_path = row.get('File Path', '').strip()
            source = row.get('Source', '').strip()
            lyrics_file = row.get('Lyrics File', '').strip()

            if not file_path:
                error_count += 1
                continue

            # Skip if we've already processed this lyrics file
            if file_path in processed_files:
                continue

            processed_files.add(file_path)

            # Read lyrics content
            lyrics_content = read_lyrics_file(file_path)
            if not lyrics_content:
                print(f"✗ Error reading file: {lyrics_file}")
                error_count += 1
                continue

            # Extract song title from lyrics filename (remove artist if present)
            # For "Tatar Folk - Bağçalarda kestane" -> "Bağçalarda kestane"
            song_title_from_lyrics = extract_song_title(lyrics_file)
            normalized_title = normalize_title(song_title_from_lyrics)

            # Find ALL matching songs
            matching_songs = find_all_matching_songs(cursor, normalized_title)

            if not matching_songs:
                print(f"⚠ No songs found for: {lyrics_file}")
                skipped_count += 1
                continue

            print(f"\n📝 Processing: [{source}] {lyrics_file}")
            print(f"   Found {len(matching_songs)} matching songs")

            songs_updated_for_this_file = 0

            for song in matching_songs:
                try:
                    # Check if this song already has approved lyrics
                    cursor.execute("""
                        SELECT id FROM lyrics_crowdsource
                        WHERE media_file_id = ? AND status = 'approved'
                    """, (song['id'],))

                    if cursor.fetchone():
                        print(f"   ⊘ Skipped (has lyrics): {song['title']} - {song['artist']}")
                        continue

                    # Insert lyrics for this song
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
                        lyrics_content,
                        'crh',
                        'approved',
                        created_by_id,
                        now,
                        created_by_id,
                        now,
                        f'Imported from {source} via script'
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
                        lyrics_content,
                        'crh',
                        created_by_id,
                        now,
                        f'Initial import from {source}'
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
                imported_count += 1

    conn.close()

    print("\n" + "=" * 80)
    print("IMPORT SUMMARY")
    print("=" * 80)
    print(f"✓ Lyrics files processed: {imported_count}")
    print(f"✓ Total songs updated:    {total_songs_updated}")
    print(f"⚠ Skipped:                {skipped_count}")
    print(f"✗ Errors:                 {error_count}")
    print("=" * 80)

if __name__ == '__main__':
    DB_PATH = '../navidrome-data/navidrome.db'
    CSV_PATH = 'scripts/lyrics_mapping_compared.csv'

    print("=" * 80)
    print("LYRICS IMPORT - MULTI-MATCH MODE")
    print("Applies same lyrics to all songs with matching titles")
    print("=" * 80)
    print()

    import_lyrics_multi_match(DB_PATH, CSV_PATH)
    print("\nDone!")
