#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to match lyrics files (Cyrillic) with songs in database (Latin).
Uses transliteration and fuzzy matching.
"""

import sqlite3
import os
import re
from pathlib import Path
from difflib import SequenceMatcher
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

def similarity(a, b):
    """Calculate similarity ratio between two strings."""
    return SequenceMatcher(None, a, b).ratio()

def get_songs_from_db(db_path):
    """Get all songs from database."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, title, artist, album
        FROM media_file
        ORDER BY title
    """)

    songs = []
    for row in cursor.fetchall():
        songs.append({
            'id': row[0],
            'title': row[1],
            'artist': row[2],
            'album': row[3],
            'normalized_title': normalize_title(row[1]),
            'normalized_artist': normalize_title(row[2]) if row[2] else ''
        })

    conn.close()
    return songs

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
            lyrics_files.append({
                'path': str(file_path),
                'filename': filename,
                'normalized': normalize_title(filename),
                'source': source_name  # Track which source this came from
            })

    return lyrics_files

def find_matches(songs, lyrics_files, threshold=0.6):
    """Find best matches between songs and lyrics files."""
    # First, find all potential matches for each lyrics file
    lyrics_matches = []

    for lyrics in lyrics_files:
        best_match = None
        best_score = 0
        all_candidates = []

        for song in songs:
            # Compare titles
            title_score = similarity(lyrics['normalized'], song['normalized_title'])

            # Bonus if artist name appears in lyrics filename
            artist_bonus = 0
            if song['normalized_artist'] and song['normalized_artist'] in lyrics['normalized']:
                artist_bonus = 0.1

            total_score = title_score + artist_bonus

            if total_score > threshold:
                all_candidates.append({
                    'song': song,
                    'score': total_score,
                    'title_score': title_score
                })

            if total_score > best_score:
                best_score = total_score
                best_match = song

        # Sort candidates by score
        all_candidates.sort(key=lambda x: x['score'], reverse=True)

        if best_match:
            lyrics_matches.append({
                'lyrics_file': lyrics['filename'],
                'lyrics_path': lyrics['path'],
                'source': lyrics['source'],
                'best_match': best_match,
                'best_score': best_score,
                'all_candidates': all_candidates[:5]  # Top 5
            })

    # Now group by song ID to find overlapping lyrics from different sources
    song_to_lyrics = {}
    for match in lyrics_matches:
        song_id = match['best_match']['id']
        if song_id not in song_to_lyrics:
            song_to_lyrics[song_id] = []
        song_to_lyrics[song_id].append(match)

    # Convert back to list format, marking duplicates
    final_matches = []
    for song_id, lyrics_list in song_to_lyrics.items():
        # Sort by score descending
        lyrics_list.sort(key=lambda x: x['best_score'], reverse=True)

        if len(lyrics_list) > 1:
            # Multiple lyrics files match this song - mark all as variants
            for i, match in enumerate(lyrics_list):
                match['has_variants'] = True
                match['variant_count'] = len(lyrics_list)
                match['variant_rank'] = i + 1
                match['all_variants'] = [
                    {
                        'source': v['source'],
                        'filename': v['lyrics_file'],
                        'path': v['lyrics_path'],
                        'score': v['best_score']
                    }
                    for v in lyrics_list
                ]
                final_matches.append(match)
        else:
            # Single match
            match = lyrics_list[0]
            match['has_variants'] = False
            match['variant_count'] = 1
            final_matches.append(match)

    return final_matches

def print_matches(matches):
    """Print matches in readable format."""
    print("=" * 120)
    print("LYRICS MATCHING RESULTS (ALL SOURCES)")
    print("=" * 120)
    print()

    # Group by confidence level and whether they have variants
    high_confidence = []
    medium_confidence = []
    low_confidence = []
    songs_with_variants = {}

    for match in matches:
        if match['best_score'] >= 0.8:
            high_confidence.append(match)
        elif match['best_score'] >= 0.6:
            medium_confidence.append(match)
        elif match['best_score'] >= 0.4:
            low_confidence.append(match)

        # Track songs with multiple variants
        if match['has_variants']:
            song_id = match['best_match']['id']
            if song_id not in songs_with_variants:
                songs_with_variants[song_id] = match

    # Print songs with multiple variants first (important!)
    if songs_with_variants:
        print(f"⚡ SONGS WITH MULTIPLE LYRICS VARIANTS ({len(songs_with_variants)}):")
        print("-" * 120)
        for song_id, match in songs_with_variants.items():
            song = match['best_match']
            print(f"🎵 {song['title']} - {song['artist']}")
            print(f"   ID: {song_id}")
            print(f"   {match['variant_count']} variants found from different sources:")
            for i, variant in enumerate(match['all_variants'], 1):
                print(f"      {i}. [{variant['source']}] {variant['filename']}")
                print(f"         Score: {variant['score']:.2f} | Path: {variant['path']}")
            print()
        print()

    print(f"HIGH CONFIDENCE MATCHES ({len(high_confidence)}):")
    print("-" * 120)
    for match in high_confidence:
        song = match['best_match']
        variant_marker = f" [VARIANT {match['variant_rank']}/{match['variant_count']}]" if match['has_variants'] else ""
        print(f"✓ [{match['source']}] {match['lyrics_file']}{variant_marker}")
        print(f"  → {song['title']} - {song['artist']}")
        print(f"  Score: {match['best_score']:.2f} | ID: {song['id']}")
        print()

    print()
    print(f"MEDIUM CONFIDENCE MATCHES ({len(medium_confidence)}):")
    print("-" * 120)
    for match in medium_confidence:
        song = match['best_match']
        variant_marker = f" [VARIANT {match['variant_rank']}/{match['variant_count']}]" if match['has_variants'] else ""
        print(f"? [{match['source']}] {match['lyrics_file']}{variant_marker}")
        print(f"  → {song['title']} - {song['artist']}")
        print(f"  Score: {match['best_score']:.2f} | ID: {song['id']}")
        if len(match['all_candidates']) > 1:
            print(f"  Alternative song matches:")
            for i, cand in enumerate(match['all_candidates'][1:3], 1):
                print(f"    {i}. {cand['song']['title']} - {cand['song']['artist']} ({cand['score']:.2f})")
        print()

    print()
    print(f"LOW CONFIDENCE MATCHES ({len(low_confidence)}):")
    print("-" * 120)
    for match in low_confidence:
        song = match['best_match']
        variant_marker = f" [VARIANT {match['variant_rank']}/{match['variant_count']}]" if match['has_variants'] else ""
        print(f"⚠ [{match['source']}] {match['lyrics_file']}{variant_marker}")
        print(f"  → {song['title']} - {song['artist']}")
        print(f"  Score: {match['best_score']:.2f} | ID: {song['id']}")
        print()

    print("=" * 120)
    print(f"SUMMARY: {len(high_confidence)} high, {len(medium_confidence)} medium, "
          f"{len(low_confidence)} low confidence matches")
    print(f"VARIANTS: {len(songs_with_variants)} songs have multiple lyrics files from different sources")
    print("=" * 120)

def save_mapping_csv(matches, output_file):
    """Save mapping to CSV file."""
    import csv

    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'Source', 'Lyrics File', 'Song ID', 'Song Title', 'Artist', 'Album',
            'Score', 'Status', 'Has Variants', 'Variant Rank', 'File Path'
        ])

        for match in matches:
            song = match['best_match']
            status = 'HIGH' if match['best_score'] >= 0.8 else 'MEDIUM' if match['best_score'] >= 0.6 else 'LOW'
            has_variants = 'YES' if match['has_variants'] else 'NO'
            variant_info = f"{match.get('variant_rank', 1)}/{match.get('variant_count', 1)}" if match['has_variants'] else ''

            writer.writerow([
                match['source'],
                match['lyrics_file'],
                song['id'],
                song['title'],
                song['artist'],
                song['album'],
                f"{match['best_score']:.2f}",
                status,
                has_variants,
                variant_info,
                match['lyrics_path']
            ])

if __name__ == '__main__':
    # Paths
    DB_PATH = '../navidrome-data/navidrome.db'
    LYRICS_DIRS = {
        'sattarov': 'scripts/lyrics_sattarov',
        'crh_lt': 'scripts/lyrics_crh_lt',
        'qmusic': 'scripts/lyrics_qmusic'
    }
    OUTPUT_CSV = 'scripts/lyrics_mapping.csv'

    print("Loading songs from database...")
    songs = get_songs_from_db(DB_PATH)
    print(f"Found {len(songs)} songs\n")

    print("Loading lyrics files from all sources...")
    lyrics_files = get_lyrics_files(LYRICS_DIRS)

    # Print stats per source
    source_counts = {}
    for lf in lyrics_files:
        source_counts[lf['source']] = source_counts.get(lf['source'], 0) + 1

    for source, count in source_counts.items():
        print(f"  [{source}]: {count} files")
    print(f"Total: {len(lyrics_files)} lyrics files\n")

    print("Matching lyrics to songs...")
    matches = find_matches(songs, lyrics_files)

    print_matches(matches)

    print(f"\nSaving mapping to {OUTPUT_CSV}...")
    save_mapping_csv(matches, OUTPUT_CSV)
    print(f"Done! Mapping saved to {OUTPUT_CSV}")
