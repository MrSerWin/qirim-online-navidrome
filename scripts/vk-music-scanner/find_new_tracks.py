#!/usr/bin/env python3
"""
Find new tracks on VK for artists in Navidrome database.
Compares VK results with existing tracks and shows potential new downloads.
"""

import sqlite3
import json
import re
import unicodedata
from vkpymusic import Service

KATE_USER_AGENT = "KateMobileAndroid/56 lite-460 (Android 9; SDK 28; arm64-v8a; HUAWEI COL-L29; en)"

# Load config
with open('config.json', 'r') as f:
    config = json.load(f)

DB_PATH = '/Volumes/T9/1_dev/1_QO/myQO/navidrome-data/navidrome.db'


def normalize_text(text: str) -> str:
    """Normalize text for comparison - remove special chars, lowercase, etc."""
    if not text:
        return ""
    # Convert to lowercase
    text = text.lower()
    # Normalize unicode
    text = unicodedata.normalize('NFKD', text)
    # Remove special characters but keep letters and numbers
    text = re.sub(r'[^\w\s]', '', text)
    # Remove extra whitespace
    text = ' '.join(text.split())
    return text


def get_artists_with_tracks(db_path: str) -> dict:
    """Get all artists and their track titles from Navidrome"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get artists with track count
    cursor.execute('''
        SELECT artist, COUNT(*) as cnt
        FROM media_file
        WHERE artist IS NOT NULL AND artist != ''
        GROUP BY artist
        ORDER BY cnt DESC
    ''')
    artists = cursor.fetchall()

    result = {}
    for artist_name, count in artists:
        # Get existing tracks for this artist
        cursor.execute('''
            SELECT DISTINCT title
            FROM media_file
            WHERE artist = ?
        ''', (artist_name,))
        tracks = {normalize_text(row[0]) for row in cursor.fetchall()}
        result[artist_name] = {
            'count': count,
            'tracks': tracks
        }

    conn.close()
    return result


def search_vk_artist(service: Service, artist_name: str, count: int = 50) -> list:
    """Search VK for artist tracks"""
    try:
        tracks = service.search_songs_by_text(artist_name, count=count)
        return [{
            'artist': t.artist,
            'title': t.title,
            'duration': t.duration,
            'url': t.url
        } for t in tracks]
    except Exception as e:
        print(f"  Error searching: {e}")
        return []


def is_artist_match(vk_artist: str, db_artist: str) -> bool:
    """Check if VK artist matches database artist"""
    vk_norm = normalize_text(vk_artist)
    db_norm = normalize_text(db_artist)

    # Exact match
    if vk_norm == db_norm:
        return True

    # One contains the other
    if vk_norm in db_norm or db_norm in vk_norm:
        return True

    # Check if significant part matches (at least 70%)
    vk_words = set(vk_norm.split())
    db_words = set(db_norm.split())
    if vk_words and db_words:
        common = vk_words & db_words
        match_ratio = len(common) / min(len(vk_words), len(db_words))
        if match_ratio >= 0.7:
            return True

    return False


def is_track_new(vk_title: str, existing_tracks: set) -> bool:
    """Check if VK track is new (not in existing tracks)"""
    vk_norm = normalize_text(vk_title)

    for existing in existing_tracks:
        # Exact match
        if vk_norm == existing:
            return False
        # Similar enough (one contains the other)
        if len(vk_norm) > 3 and len(existing) > 3:
            if vk_norm in existing or existing in vk_norm:
                return False

    return True


def main():
    print("=" * 70)
    print("VK NEW TRACKS FINDER")
    print("=" * 70)

    # Initialize VK service
    token = config['vk']['token']
    service = Service(user_agent=KATE_USER_AGENT, token=token)
    print("✓ VK service initialized\n")

    # Get artists from database
    print("Loading artists from Navidrome database...")
    artists_data = get_artists_with_tracks(DB_PATH)
    print(f"✓ Found {len(artists_data)} artists\n")

    # Search for top artists (more than 5 tracks)
    top_artists = [(name, data) for name, data in artists_data.items()
                   if data['count'] >= 5 and name != '[Unknown Artist]']

    print(f"Scanning {len(top_artists)} artists with 5+ tracks...\n")
    print("-" * 70)

    all_new_tracks = []

    for artist_name, artist_data in top_artists[:50]:  # Limit to first 50 for testing
        existing_tracks = artist_data['tracks']

        print(f"\n🔍 {artist_name} ({artist_data['count']} existing tracks)")

        # Search VK
        vk_tracks = search_vk_artist(service, artist_name, count=30)

        # Filter matching artist
        matching_tracks = [t for t in vk_tracks if is_artist_match(t['artist'], artist_name)]

        # Find new tracks
        new_tracks = []
        for track in matching_tracks:
            if track['duration'] >= 60:  # At least 1 minute
                if is_track_new(track['title'], existing_tracks):
                    new_tracks.append(track)

        if new_tracks:
            print(f"   ✅ Found {len(new_tracks)} NEW tracks:")
            for t in new_tracks[:5]:
                mins = t['duration'] // 60
                secs = t['duration'] % 60
                print(f"      • {t['artist']} - {t['title']} [{mins}:{secs:02d}]")
            if len(new_tracks) > 5:
                print(f"      ... and {len(new_tracks) - 5} more")

            for t in new_tracks:
                t['db_artist'] = artist_name
                all_new_tracks.append(t)
        else:
            if matching_tracks:
                print(f"   ⏭ No new tracks (all {len(matching_tracks)} already exist)")
            else:
                print(f"   ❌ No matching tracks found on VK")

    print("\n" + "=" * 70)
    print(f"SUMMARY: Found {len(all_new_tracks)} new tracks")
    print("=" * 70)

    if all_new_tracks:
        # Save to file
        with open('new_tracks_found.json', 'w', encoding='utf-8') as f:
            json.dump(all_new_tracks, f, ensure_ascii=False, indent=2)
        print(f"\n📁 Saved to new_tracks_found.json")

        # Print summary by artist
        print("\nNew tracks by artist:")
        by_artist = {}
        for t in all_new_tracks:
            artist = t['db_artist']
            if artist not in by_artist:
                by_artist[artist] = []
            by_artist[artist].append(t)

        for artist, tracks in sorted(by_artist.items(), key=lambda x: -len(x[1])):
            print(f"  {len(tracks):2} - {artist}")


if __name__ == '__main__':
    main()
