#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Import lyrics from CSV file with IsMatch column.
Reads lyrics_mapping_compared.csv and imports lyrics where IsMatch='Y'.
"""

import sqlite3
import csv
import sys
from pathlib import Path
from datetime import datetime

def read_lyrics_file(file_path):
    """Read lyrics content from file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read().strip()
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return None

def import_lyrics_from_csv(db_path, csv_path, created_by_id='admin'):
    """Import lyrics from CSV where IsMatch='Y'."""

    if not Path(csv_path).exists():
        print(f"Error: CSV file not found: {csv_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check if admin user exists, if not use first user
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

    print(f"Using user ID for import: {created_by_id}")
    print()

    imported_count = 0
    skipped_count = 0
    error_count = 0

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter=';')

        for row in reader:
            is_match = row.get('IsMatch', '').strip().upper()

            # Skip if not marked for import
            if is_match != 'Y':
                skipped_count += 1
                continue

            song_id = row.get('Song ID', '').strip()
            file_path = row.get('File Path', '').strip()
            source = row.get('Source', '').strip()
            song_title = row.get('Song Title', '').strip()
            artist = row.get('Artist', '').strip()

            if not song_id or not file_path:
                print(f"⚠ Skipping row: missing Song ID or File Path")
                error_count += 1
                continue

            # Read lyrics content
            lyrics_content = read_lyrics_file(file_path)
            if not lyrics_content:
                print(f"✗ Error reading lyrics for: {song_title} - {artist}")
                error_count += 1
                continue

            # Generate unique ID
            import hashlib
            lyrics_id = hashlib.sha256(f"{song_id}{datetime.utcnow().isoformat()}".encode()).hexdigest()[:22]

            try:
                # Check if approved lyrics already exist for this song
                cursor.execute("""
                    SELECT id FROM lyrics_crowdsource
                    WHERE media_file_id = ? AND status = 'approved'
                """, (song_id,))

                existing = cursor.fetchone()
                if existing:
                    print(f"⚠ Skipping (already has approved lyrics): {song_title} - {artist}")
                    skipped_count += 1
                    continue

                # Insert new approved lyrics
                now = datetime.utcnow().isoformat()
                cursor.execute("""
                    INSERT INTO lyrics_crowdsource (
                        id, media_file_id, content, language, status,
                        created_by, created_at,
                        moderated_by, moderated_at, moderation_note
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    lyrics_id,
                    song_id,
                    lyrics_content,
                    'crh',  # Crimean Tatar
                    'approved',
                    created_by_id,
                    now,
                    created_by_id,
                    now,
                    f'Imported from {source} via script'
                ))

                # Add history entry
                history_id = hashlib.sha256(f"{lyrics_id}{now}".encode()).hexdigest()[:22]
                cursor.execute("""
                    INSERT INTO lyrics_history (
                        id, lyrics_id, media_file_id, version, content, language,
                        created_by, created_at, change_note
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    history_id,
                    lyrics_id,
                    song_id,
                    1,
                    lyrics_content,
                    'crh',
                    created_by_id,
                    now,
                    f'Initial import from {source}'
                ))

                conn.commit()
                print(f"✓ Imported: [{source}] {song_title} - {artist}")
                imported_count += 1

            except Exception as e:
                print(f"✗ Error importing {song_title} - {artist}: {e}")
                error_count += 1
                conn.rollback()

    conn.close()

    print()
    print("=" * 80)
    print("IMPORT SUMMARY")
    print("=" * 80)
    print(f"✓ Imported: {imported_count}")
    print(f"⚠ Skipped:  {skipped_count}")
    print(f"✗ Errors:   {error_count}")
    print("=" * 80)

if __name__ == '__main__':
    DB_PATH = '../navidrome-data/navidrome.db'
    CSV_PATH = 'scripts/lyrics_mapping_compared.csv'

    print("=" * 80)
    print("LYRICS IMPORT FROM CSV (IsMatch='Y')")
    print("=" * 80)
    print()

    import_lyrics_from_csv(DB_PATH, CSV_PATH)
    print("\nDone!")
