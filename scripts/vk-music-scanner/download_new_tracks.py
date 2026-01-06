#!/usr/bin/env python3
"""
Download new tracks found by find_new_tracks.py
"""

import json
import os
import re
import subprocess
import requests
from pathlib import Path
from datetime import datetime

# Configuration
SCRIPT_DIR = Path(__file__).parent
DOWNLOADS_DIR = SCRIPT_DIR / "downloads"
DOWNLOAD_LOG = SCRIPT_DIR / "downloaded_tracks.json"
NEW_TRACKS_FILE = SCRIPT_DIR / "new_tracks_found.json"
COVER_IMAGE = SCRIPT_DIR.parent / "qo_2000.png"
DOWNLOAD_HISTORY_FILE = SCRIPT_DIR / "download_history.json"


def sanitize_filename(name: str) -> str:
    """Sanitize string for use as filename"""
    if not name:
        return "Unknown"
    # Remove/replace invalid characters
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        name = name.replace(char, '_')
    # Remove leading/trailing dots and spaces
    name = name.strip('. ')
    # Limit length
    if len(name) > 200:
        name = name[:200]
    return name


def transliterate_turkish(text: str) -> str:
    """Transliterate Turkish characters for ID3v1 compatibility"""
    replacements = {
        'ı': 'i', 'İ': 'I',
        'ş': 's', 'Ş': 'S',
        'ğ': 'g', 'Ğ': 'G',
        'ç': 'c', 'Ç': 'C',
        'ö': 'o', 'Ö': 'O',
        'ü': 'u', 'Ü': 'U',
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def get_artist_folder(artist_name: str) -> Path:
    """Get or create folder for artist in downloads directory"""
    folder_name = sanitize_filename(artist_name)

    # Ensure downloads directory exists
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

    # Check if folder already exists (case-insensitive)
    if DOWNLOADS_DIR.exists():
        for existing in DOWNLOADS_DIR.iterdir():
            if existing.is_dir() and existing.name.lower() == folder_name.lower():
                return existing

    # Create new folder
    folder_path = DOWNLOADS_DIR / folder_name
    folder_path.mkdir(parents=True, exist_ok=True)
    return folder_path


def download_track(track: dict, folder: Path) -> Path | None:
    """Download a single track"""
    artist = sanitize_filename(track['artist'])
    title = sanitize_filename(track['title'])
    filename = f"{artist} - {title}.mp3"
    filepath = folder / filename

    # Skip if already exists
    if filepath.exists():
        print(f"  ⏭ Already exists: {filename}")
        return None

    try:
        print(f"  ⬇ Downloading: {filename}")

        response = requests.get(track['url'], stream=True, timeout=120)
        response.raise_for_status()

        # Download to temp file first
        temp_path = filepath.with_suffix('.tmp')
        with open(temp_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        # Rename to final name
        temp_path.rename(filepath)
        print(f"  ✓ Downloaded: {filename}")
        return filepath

    except Exception as e:
        print(f"  ✗ Error: {e}")
        # Clean up temp file if exists
        temp_path = filepath.with_suffix('.tmp')
        if temp_path.exists():
            temp_path.unlink()
        return None


def set_mp3_tags(filepath: Path, artist: str, title: str, album: str):
    """Set MP3 tags using ffmpeg"""
    try:
        # Transliterate for ID3v1 compatibility
        artist_t = transliterate_turkish(artist)
        title_t = transliterate_turkish(title)
        album_t = transliterate_turkish(album)

        # Full title for display
        full_title = f"{artist_t} - {title_t}"

        temp_output = filepath.with_suffix('.tagged.mp3')

        cmd = [
            'ffmpeg', '-i', str(filepath),
            '-i', str(COVER_IMAGE),
            '-map', '0:a', '-map', '1',
            '-c', 'copy',
            '-disposition:v:0', 'attached_pic',
            '-id3v2_version', '3',
            '-metadata', f'artist={artist_t}',
            '-metadata', f'album_artist={artist_t}',
            '-metadata', f'album={album_t}',
            '-metadata', f'title={full_title}',
            '-metadata', 'comment=https://qirim.online/',
            str(temp_output),
            '-y', '-loglevel', 'error'
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode == 0 and temp_output.exists():
            # Replace original with tagged version
            filepath.unlink()
            temp_output.rename(filepath)
            return True
        else:
            if temp_output.exists():
                temp_output.unlink()
            return False

    except Exception as e:
        print(f"    Tag error: {e}")
        return False


def load_download_log() -> dict:
    """Load log of downloaded tracks"""
    if DOWNLOAD_LOG.exists():
        with open(DOWNLOAD_LOG, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'tracks': [], 'last_run': None}


def save_download_log(log: dict):
    """Save log of downloaded tracks"""
    log['last_run'] = datetime.now().isoformat()
    with open(DOWNLOAD_LOG, 'w', encoding='utf-8') as f:
        json.dump(log, f, ensure_ascii=False, indent=2)


def normalize_text(text: str) -> str:
    """Normalize text for comparison"""
    if not text:
        return ""
    import unicodedata
    text = text.lower()
    text = unicodedata.normalize('NFKD', text)
    text = re.sub(r'[^\w\s]', '', text)
    text = ' '.join(text.split())
    return text


def get_track_key(artist: str, title: str) -> str:
    """Generate normalized key for track"""
    return f"{normalize_text(artist)}|{normalize_text(title)}"


def load_download_history() -> set:
    """Load history of previously downloaded tracks"""
    if DOWNLOAD_HISTORY_FILE.exists():
        with open(DOWNLOAD_HISTORY_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return set(data.get('downloaded', []))
    return set()


def save_download_history(history: set):
    """Save download history"""
    with open(DOWNLOAD_HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump({'downloaded': list(history)}, f, ensure_ascii=False, indent=2)


def main():
    print("=" * 70)
    print("VK MUSIC DOWNLOADER")
    print("=" * 70)

    # Check if cover image exists
    if not COVER_IMAGE.exists():
        print(f"⚠ Warning: Cover image not found: {COVER_IMAGE}")
        print("  Tracks will be downloaded without cover art")

    # Load new tracks
    if not NEW_TRACKS_FILE.exists():
        print(f"❌ File not found: {NEW_TRACKS_FILE}")
        print("   Run find_new_tracks.py first")
        return

    with open(NEW_TRACKS_FILE, 'r', encoding='utf-8') as f:
        tracks = json.load(f)

    print(f"\n📋 Found {len(tracks)} tracks to download")
    print(f"📁 Downloads directory: {DOWNLOADS_DIR}")
    print("-" * 70)

    # Group by artist
    by_artist = {}
    for track in tracks:
        artist = track['db_artist']
        if artist not in by_artist:
            by_artist[artist] = []
        by_artist[artist].append(track)

    # Download tracks
    download_log = load_download_log()
    download_history = load_download_history()
    downloaded = []
    errors = []
    skipped = 0

    for artist_name, artist_tracks in sorted(by_artist.items()):
        print(f"\n🎤 {artist_name} ({len(artist_tracks)} tracks)")

        # Get or create artist folder
        folder = get_artist_folder(artist_name)
        print(f"   📁 {folder}")

        for track in artist_tracks:
            filepath = download_track(track, folder)

            if filepath:
                # Set tags
                print(f"    🏷 Setting tags...")
                if set_mp3_tags(filepath, track['artist'], track['title'], artist_name):
                    print(f"    ✓ Tags set")
                    downloaded.append({
                        'artist': track['artist'],
                        'title': track['title'],
                        'db_artist': artist_name,
                        'path': str(filepath),
                        'downloaded_at': datetime.now().isoformat()
                    })
                else:
                    print(f"    ⚠ Tag error (file still saved)")
                    downloaded.append({
                        'artist': track['artist'],
                        'title': track['title'],
                        'db_artist': artist_name,
                        'path': str(filepath),
                        'downloaded_at': datetime.now().isoformat(),
                        'tag_error': True
                    })

                # Add to download history (so it won't be found again)
                track_key = get_track_key(track['artist'], track['title'])
                download_history.add(track_key)
            elif filepath is None:
                skipped += 1

    # Save log and history
    download_log['tracks'].extend(downloaded)
    save_download_log(download_log)
    save_download_history(download_history)

    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"✓ Downloaded: {len(downloaded)}")
    print(f"⏭ Skipped (already exist): {skipped}")
    if errors:
        print(f"✗ Errors: {len(errors)}")

    if downloaded:
        print(f"\n📁 Tracks saved to: {DOWNLOADS_DIR}")
        print("\n📌 To add to library, move files to music folder and rescan Navidrome")


if __name__ == '__main__':
    main()
