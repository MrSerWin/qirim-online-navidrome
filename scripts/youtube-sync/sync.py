#!/usr/bin/env python3
"""
YouTube Channel/Playlist to Navidrome Video Clips Sync

Scans YouTube channels and playlists, adds new music videos to the database.
Runs daily via cron to keep the video clips collection up to date.

Usage:
    python sync.py                         # Sync all configured sources
    python sync.py --channel CHANNEL       # Sync specific channel by name
    python sync.py --playlist URL          # Sync specific YouTube playlist
    python sync.py --video URL             # Add single video by URL
    python sync.py --batch FILE            # Import videos from URL list file
    python sync.py --dry-run               # Show what would be added (no changes)
    python sync.py --check                 # Check configuration
"""

import os
import sys
import json
import sqlite3
import argparse
import uuid
import re
import time
import random
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

# Delay between requests to avoid rate limiting (seconds)
REQUEST_DELAY_MIN = 1.0
REQUEST_DELAY_MAX = 3.0

# Try to import yt-dlp
try:
    import yt_dlp
except ImportError:
    print("Error: yt-dlp is required. Install with: pip install yt-dlp")
    sys.exit(1)

# Paths
SCRIPT_DIR = Path(__file__).parent
CONFIG_FILE = SCRIPT_DIR / "config.json"
SYNC_LOG_FILE = SCRIPT_DIR / "sync.log"
COOKIES_FILE = SCRIPT_DIR / "cookies.txt"

# Colors for output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def log(message: str, color: str = Colors.RESET):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"{color}[{timestamp}] {message}{Colors.RESET}")

    # Also log to file
    with open(SYNC_LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(f"[{timestamp}] {message}\n")

def log_success(message: str):
    log(f"✓ {message}", Colors.GREEN)

def log_warning(message: str):
    log(f"⚠ {message}", Colors.YELLOW)

def log_error(message: str):
    log(f"✗ {message}", Colors.RED)

def log_info(message: str):
    log(f"→ {message}", Colors.BLUE)


class Config:
    """Load and manage configuration"""

    def __init__(self):
        if not CONFIG_FILE.exists():
            log_error(f"Config not found: {CONFIG_FILE}")
            log_info(f"Copy config.example.json to config.json and fill in")
            sys.exit(1)

        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            self.data = json.load(f)

        self.channels = self.data.get('channels', [])
        self.playlists = self.data.get('playlists', [])
        self.database_path = self.data.get('database_path', '')
        self.max_videos_per_channel = self.data.get('max_videos_per_channel', 50)
        self.artist_extraction = self.data.get('artist_extraction', {})


class YouTubeClient:
    """Client for fetching YouTube channel/playlist videos"""

    def __init__(self, config: Config):
        self.config = config
        self.ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
            'ignoreerrors': True,
        }
        # Add cookies if file exists
        if COOKIES_FILE.exists():
            self.ydl_opts['cookiefile'] = str(COOKIES_FILE)
            log_info(f"Using cookies from {COOKIES_FILE}")

    def extract_video_id(self, url: str) -> Optional[str]:
        """Extract video ID from various YouTube URL formats"""
        patterns = [
            r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
            r'youtube\.com/shorts/([a-zA-Z0-9_-]{11})',
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

    def extract_playlist_id(self, url: str) -> Optional[str]:
        """Extract playlist ID from YouTube URL"""
        match = re.search(r'[?&]list=([a-zA-Z0-9_-]+)', url)
        return match.group(1) if match else None

    def is_channel_url(self, url: str) -> bool:
        """Check if URL is a channel URL"""
        return any(x in url for x in ['/@', '/channel/', '/c/', '/user/'])

    def is_playlist_url(self, url: str) -> bool:
        """Check if URL is a playlist URL"""
        return 'list=' in url

    def get_channel_info(self, channel_url: str) -> Optional[Dict]:
        """Get channel information"""
        opts = {
            **self.ydl_opts,
            'extract_flat': False,
            'playlist_items': '0',
        }

        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(channel_url, download=False)
                if result:
                    return {
                        'channel_id': result.get('channel_id', ''),
                        'channel_name': result.get('channel', '') or result.get('uploader', ''),
                    }
        except Exception as e:
            log_error(f"Error getting channel info: {e}")
        return None

    def get_channel_videos(self, channel_url: str, max_videos: int = 50) -> List[Dict]:
        """Get list of videos from a channel"""
        videos = []

        # Add /videos suffix if not present
        if not channel_url.endswith('/videos'):
            if channel_url.endswith('/'):
                channel_url = channel_url[:-1]
            channel_url += '/videos'

        opts = {
            **self.ydl_opts,
            'playlistend': max_videos,
        }

        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(channel_url, download=False)

                if not result:
                    return []

                entries = result.get('entries', [])
                for entry in entries:
                    if entry:
                        videos.append({
                            'youtube_id': entry.get('id'),
                            'title': entry.get('title', ''),
                            'url': entry.get('url') or f"https://www.youtube.com/watch?v={entry.get('id')}",
                        })

        except Exception as e:
            log_error(f"Error fetching channel: {e}")

        return videos

    def get_channel_playlists(self, channel_url: str) -> List[Dict]:
        """Get all playlists from a channel"""
        playlists = []

        # Navigate to playlists tab
        if '/videos' in channel_url:
            channel_url = channel_url.replace('/videos', '/playlists')
        elif not channel_url.endswith('/playlists'):
            if channel_url.endswith('/'):
                channel_url = channel_url[:-1]
            channel_url += '/playlists'

        opts = {
            **self.ydl_opts,
        }

        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(channel_url, download=False)

                if not result:
                    return []

                entries = result.get('entries', [])
                for entry in entries:
                    if entry and entry.get('_type') == 'playlist':
                        playlists.append({
                            'youtube_id': entry.get('id'),
                            'title': entry.get('title', ''),
                            'url': f"https://www.youtube.com/playlist?list={entry.get('id')}",
                        })

        except Exception as e:
            log_error(f"Error fetching channel playlists: {e}")

        return playlists

    def get_playlist_info(self, playlist_url: str) -> Optional[Dict]:
        """Get playlist information"""
        opts = {
            **self.ydl_opts,
            'extract_flat': True,
        }

        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(playlist_url, download=False)

                if not result:
                    return None

                # Get thumbnail from first video if playlist has no thumbnail
                thumbnail_url = result.get('thumbnail', '')
                entries = result.get('entries', [])
                if not thumbnail_url and entries:
                    first_video = entries[0]
                    if first_video:
                        thumbnail_url = f"https://i.ytimg.com/vi/{first_video.get('id')}/hqdefault.jpg"

                return {
                    'youtube_id': result.get('id', ''),
                    'title': result.get('title', ''),
                    'description': result.get('description', '') or '',
                    'channel_id': result.get('channel_id', '') or '',
                    'channel_name': result.get('channel', '') or result.get('uploader', '') or '',
                    'thumbnail_url': thumbnail_url,
                    'video_count': len(entries),
                }

        except Exception as e:
            log_error(f"Error getting playlist info: {e}")
            return None

    def get_playlist_videos(self, playlist_url: str, max_videos: int = 500) -> List[Dict]:
        """Get list of videos from a playlist"""
        videos = []

        opts = {
            **self.ydl_opts,
            'playlistend': max_videos,
        }

        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(playlist_url, download=False)

                if not result:
                    return []

                entries = result.get('entries', [])
                for entry in entries:
                    if entry:
                        videos.append({
                            'youtube_id': entry.get('id'),
                            'title': entry.get('title', ''),
                            'url': entry.get('url') or f"https://www.youtube.com/watch?v={entry.get('id')}",
                        })

        except Exception as e:
            log_error(f"Error fetching playlist: {e}")

        return videos

    def get_video_details(self, video_id: str) -> Optional[Dict]:
        """Get detailed info about a specific video"""
        # Add random delay to avoid rate limiting
        delay = random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX)
        time.sleep(delay)

        opts = {
            **self.ydl_opts,
            'extract_flat': False,
        }

        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                url = f"https://www.youtube.com/watch?v={video_id}"
                result = ydl.extract_info(url, download=False)

                if not result:
                    return None

                # Extract duration in seconds
                duration = result.get('duration', 0)

                # Get best thumbnail
                thumbnails = result.get('thumbnails', [])
                thumbnail_url = ''
                if thumbnails:
                    # Prefer high quality thumbnails
                    for th in reversed(thumbnails):
                        if th.get('url'):
                            thumbnail_url = th['url']
                            break

                # Parse upload date
                upload_date = result.get('upload_date', '')
                published_at = None
                if upload_date:
                    try:
                        published_at = datetime.strptime(upload_date, '%Y%m%d')
                    except:
                        pass

                return {
                    'youtube_id': video_id,
                    'title': result.get('title', ''),
                    'description': result.get('description', ''),
                    'channel_id': result.get('channel_id', ''),
                    'channel_name': result.get('channel', '') or result.get('uploader', ''),
                    'duration': duration,
                    'thumbnail_url': thumbnail_url,
                    'view_count': result.get('view_count', 0) or 0,
                    'published_at': published_at,
                }

        except Exception as e:
            log_error(f"Error getting video details for {video_id}: {e}")
            return None


class NavidromeDB:
    """Interface to Navidrome SQLite database"""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = None

    def connect(self):
        """Connect to the database"""
        if not os.path.exists(self.db_path):
            log_error(f"Database not found: {self.db_path}")
            return False

        try:
            self.conn = sqlite3.connect(self.db_path)
            self.conn.row_factory = sqlite3.Row
            log_success(f"Connected to database")
            return True
        except Exception as e:
            log_error(f"Failed to connect to database: {e}")
            return False

    def close(self):
        """Close the database connection"""
        if self.conn:
            self.conn.close()

    # Video Clip methods
    def video_exists(self, youtube_id: str) -> bool:
        """Check if a video already exists in the database"""
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT id FROM video_clip WHERE youtube_id = ?",
            (youtube_id,)
        )
        return cursor.fetchone() is not None

    def get_video_by_youtube_id(self, youtube_id: str) -> Optional[Dict]:
        """Get video by YouTube ID"""
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT * FROM video_clip WHERE youtube_id = ?",
            (youtube_id,)
        )
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None

    def add_video(self, video: Dict) -> Optional[str]:
        """Add a video to the database, returns video ID"""
        try:
            cursor = self.conn.cursor()
            now = datetime.now().isoformat()
            video_id = str(uuid.uuid4())

            cursor.execute("""
                INSERT INTO video_clip (
                    id, youtube_id, title, title_lower, artist, artist_lower,
                    channel_id, channel_name, description, duration,
                    thumbnail_url, view_count, published_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                video_id,
                video['youtube_id'],
                video['title'],
                video['title'].lower(),
                video.get('artist', ''),
                video.get('artist', '').lower(),
                video.get('channel_id', ''),
                video.get('channel_name', ''),
                video.get('description', ''),
                video.get('duration', 0),
                video.get('thumbnail_url', ''),
                video.get('view_count', 0),
                video['published_at'].isoformat() if video.get('published_at') else None,
                now,
                now,
            ))

            self.conn.commit()
            return video_id

        except Exception as e:
            log_error(f"Failed to add video: {e}")
            return None

    def get_video_count(self) -> int:
        """Get total number of videos in the database"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM video_clip")
        return cursor.fetchone()[0]

    # Playlist methods
    def playlist_exists(self, youtube_id: str) -> bool:
        """Check if a playlist already exists in the database"""
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT id FROM video_playlist WHERE youtube_id = ?",
            (youtube_id,)
        )
        return cursor.fetchone() is not None

    def get_playlist_by_youtube_id(self, youtube_id: str) -> Optional[Dict]:
        """Get playlist by YouTube ID"""
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT * FROM video_playlist WHERE youtube_id = ?",
            (youtube_id,)
        )
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None

    def add_playlist(self, playlist: Dict, is_channel_videos: bool = False) -> Optional[str]:
        """Add a playlist to the database, returns playlist ID"""
        try:
            cursor = self.conn.cursor()
            now = datetime.now().isoformat()
            playlist_id = str(uuid.uuid4())

            cursor.execute("""
                INSERT INTO video_playlist (
                    id, youtube_id, title, title_lower, description,
                    thumbnail_url, channel_id, channel_name,
                    video_count, is_channel_videos, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                playlist_id,
                playlist['youtube_id'],
                playlist['title'],
                playlist['title'].lower(),
                playlist.get('description', ''),
                playlist.get('thumbnail_url', ''),
                playlist.get('channel_id', ''),
                playlist.get('channel_name', ''),
                playlist.get('video_count', 0),
                1 if is_channel_videos else 0,
                now,
                now,
            ))

            self.conn.commit()
            return playlist_id

        except Exception as e:
            log_error(f"Failed to add playlist: {e}")
            return None

    def update_playlist(self, playlist_id: str, video_count: int):
        """Update playlist video count"""
        try:
            cursor = self.conn.cursor()
            now = datetime.now().isoformat()

            cursor.execute("""
                UPDATE video_playlist
                SET video_count = ?, updated_at = ?
                WHERE id = ?
            """, (video_count, now, playlist_id))

            self.conn.commit()
        except Exception as e:
            log_error(f"Failed to update playlist: {e}")

    def add_clip_to_playlist(self, playlist_id: str, clip_id: str, position: int):
        """Add a clip to a playlist"""
        try:
            cursor = self.conn.cursor()
            now = datetime.now().isoformat()

            # Check if already exists
            cursor.execute(
                "SELECT 1 FROM video_playlist_clip WHERE playlist_id = ? AND clip_id = ?",
                (playlist_id, clip_id)
            )
            if cursor.fetchone():
                return  # Already exists

            cursor.execute("""
                INSERT INTO video_playlist_clip (
                    playlist_id, clip_id, position, added_at
                ) VALUES (?, ?, ?, ?)
            """, (playlist_id, clip_id, position, now))

            self.conn.commit()
        except Exception as e:
            log_error(f"Failed to add clip to playlist: {e}")

    def get_playlist_count(self) -> int:
        """Get total number of playlists in the database"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM video_playlist")
        return cursor.fetchone()[0]


def extract_artist(title: str, channel_name: str, patterns: Dict) -> str:
    """
    Try to extract artist name from video title.
    Common formats:
    - Artist - Song Title
    - Artist | Song Title
    - Song Title by Artist
    - Artist "Song Title"
    """

    # Check for common separators
    separators = [' - ', ' – ', ' — ', ' | ', ' // ']
    for sep in separators:
        if sep in title:
            parts = title.split(sep)
            if len(parts) >= 2:
                # Usually artist is first
                artist = parts[0].strip()
                # Clean up common suffixes
                for suffix in ['Official', 'Video', 'Music', 'HD', '4K', 'Clip']:
                    artist = re.sub(rf'\s*\(?\s*{suffix}\s*\)?\s*$', '', artist, flags=re.IGNORECASE)
                if artist:
                    return artist

    # Check for "by Artist" pattern
    match = re.search(r'\bby\s+(.+?)(?:\s*[\(\[]|$)', title, re.IGNORECASE)
    if match:
        return match.group(1).strip()

    # Fall back to channel name
    # Clean up common channel suffixes
    artist = channel_name
    for suffix in ['Official', 'VEVO', 'Music', 'Channel', 'Records', 'TV']:
        artist = re.sub(rf'\s*[-–—]?\s*{suffix}\s*$', '', artist, flags=re.IGNORECASE)

    return artist.strip()


class YouTubeSync:
    """Main sync class"""

    def __init__(self):
        self.config = Config()
        self.youtube = YouTubeClient(self.config)
        self.db = NavidromeDB(self.config.database_path)

    def add_single_video(self, url: str, playlist_id: Optional[str] = None,
                         position: int = 0, dry_run: bool = False) -> Tuple[bool, Optional[str]]:
        """Add a single video by URL. Returns (success, clip_id)"""
        video_id = self.youtube.extract_video_id(url)
        if not video_id:
            log_error(f"Could not extract video ID from: {url}")
            return False, None

        # Check if already exists
        existing = self.db.get_video_by_youtube_id(video_id)
        if existing:
            log_info(f"Video already exists: {existing['title']}")
            if playlist_id and not dry_run:
                self.db.add_clip_to_playlist(playlist_id, existing['id'], position)
            return True, existing['id']

        # Get details
        details = self.youtube.get_video_details(video_id)
        if not details:
            log_error(f"Could not get details for video: {video_id}")
            return False, None

        # Extract artist
        artist = extract_artist(
            details['title'],
            details['channel_name'],
            self.config.artist_extraction
        )
        details['artist'] = artist

        if dry_run:
            log_info(f"[DRY RUN] Would add: {details['title']}")
            log_info(f"          Artist: {artist}")
            return True, None

        clip_id = self.db.add_video(details)
        if clip_id:
            log_success(f"Added: {details['title']}")
            if playlist_id:
                self.db.add_clip_to_playlist(playlist_id, clip_id, position)
            return True, clip_id
        return False, None

    def sync_playlist(self, playlist_url: str, dry_run: bool = False) -> int:
        """Sync a YouTube playlist. Returns number of videos added."""
        log_info(f"Syncing playlist: {playlist_url}")

        # Get playlist info
        playlist_info = self.youtube.get_playlist_info(playlist_url)
        if not playlist_info:
            log_error("Could not get playlist info")
            return 0

        log_info(f"  Playlist: {playlist_info['title']}")
        log_info(f"  Videos: {playlist_info['video_count']}")

        # Get or create playlist in DB
        playlist_id = None
        if not dry_run:
            existing = self.db.get_playlist_by_youtube_id(playlist_info['youtube_id'])
            if existing:
                playlist_id = existing['id']
                log_info(f"  Updating existing playlist")
            else:
                playlist_id = self.db.add_playlist(playlist_info)
                if playlist_id:
                    log_success(f"  Created playlist in DB")

        # Get videos
        videos = self.youtube.get_playlist_videos(playlist_url)
        log_info(f"  Found {len(videos)} videos")

        added = 0
        for i, video in enumerate(videos):
            success, _ = self.add_single_video(
                f"https://www.youtube.com/watch?v={video['youtube_id']}",
                playlist_id=playlist_id,
                position=i,
                dry_run=dry_run
            )
            if success:
                added += 1

        # Update video count
        if playlist_id and not dry_run:
            self.db.update_playlist(playlist_id, len(videos))

        return added

    def sync_channel(self, channel: Dict, dry_run: bool = False) -> int:
        """Sync a single channel, returns number of new videos added"""
        channel_url = channel.get('url', '')
        channel_name = channel.get('name', channel_url)
        max_videos = channel.get('max_videos', self.config.max_videos_per_channel)
        sync_playlists = channel.get('sync_playlists', True)

        log_info(f"Scanning channel: {channel_name}")

        total_added = 0

        # Get channel videos as a "playlist"
        videos = self.youtube.get_channel_videos(channel_url, max_videos)
        log_info(f"  Found {len(videos)} channel videos")

        # Create a virtual playlist for channel videos
        channel_info = self.youtube.get_channel_info(channel_url)
        if channel_info and not dry_run:
            virtual_playlist_id = f"channel_{channel_info['channel_id']}"
            existing = self.db.get_playlist_by_youtube_id(virtual_playlist_id)

            if not existing:
                playlist_data = {
                    'youtube_id': virtual_playlist_id,
                    'title': f"{channel_name} - Videos",
                    'description': f"All videos from {channel_name}",
                    'channel_id': channel_info['channel_id'],
                    'channel_name': channel_info['channel_name'],
                    'thumbnail_url': '',
                    'video_count': len(videos),
                }
                playlist_db_id = self.db.add_playlist(playlist_data, is_channel_videos=True)
            else:
                playlist_db_id = existing['id']
        else:
            playlist_db_id = None

        for i, video in enumerate(videos):
            youtube_id = video.get('youtube_id')
            if not youtube_id:
                continue

            # Check if already exists
            if self.db.video_exists(youtube_id):
                continue

            success, clip_id = self.add_single_video(
                f"https://www.youtube.com/watch?v={youtube_id}",
                playlist_id=playlist_db_id,
                position=i,
                dry_run=dry_run
            )
            if success and clip_id:
                total_added += 1

        log_info(f"  Added {total_added} new videos from channel")

        # Sync channel playlists if enabled
        if sync_playlists:
            log_info(f"  Scanning channel playlists...")
            playlists = self.youtube.get_channel_playlists(channel_url)
            log_info(f"  Found {len(playlists)} playlists")

            for playlist in playlists:
                added = self.sync_playlist(playlist['url'], dry_run=dry_run)
                total_added += added

        return total_added

    def batch_import(self, file_path: str, dry_run: bool = False) -> int:
        """Import videos from a file with URLs (one per line)"""
        if not os.path.exists(file_path):
            log_error(f"File not found: {file_path}")
            return 0

        with open(file_path, 'r', encoding='utf-8') as f:
            urls = [line.strip() for line in f if line.strip() and not line.startswith('#')]

        log_info(f"Importing {len(urls)} URLs from {file_path}")

        added = 0
        for url in urls:
            if self.youtube.is_playlist_url(url) and not self.youtube.extract_video_id(url):
                # It's a playlist URL without a video ID
                added += self.sync_playlist(url, dry_run=dry_run)
            else:
                # It's a video URL
                success, _ = self.add_single_video(url, dry_run=dry_run)
                if success:
                    added += 1

        return added

    def sync_all(self, dry_run: bool = False):
        """Sync all configured channels and playlists"""
        log_info("=" * 60)
        log_info("YouTube → Navidrome Video Clips Sync")
        log_info("=" * 60)

        if not self.db.connect():
            return

        try:
            total_added = 0

            # Sync channels
            for channel in self.config.channels:
                added = self.sync_channel(channel, dry_run)
                total_added += added
                log_info("")

            # Sync standalone playlists
            for playlist in self.config.playlists:
                playlist_url = playlist.get('url', '')
                if playlist_url:
                    added = self.sync_playlist(playlist_url, dry_run)
                    total_added += added
                    log_info("")

            log_info("=" * 60)
            if dry_run:
                log_success(f"[DRY RUN] Would add {total_added} new videos")
            else:
                log_success(f"Sync complete! Added {total_added} new videos")

            log_info(f"Total videos in database: {self.db.get_video_count()}")
            log_info(f"Total playlists in database: {self.db.get_playlist_count()}")

        finally:
            self.db.close()

    def check_config(self):
        """Check and display configuration"""
        log_info("Configuration check:")
        log_info(f"  Database path: {self.config.database_path}")
        log_info(f"  Max videos per channel: {self.config.max_videos_per_channel}")
        log_info(f"  Channels configured: {len(self.config.channels)}")

        for i, channel in enumerate(self.config.channels, 1):
            sync_playlists = channel.get('sync_playlists', True)
            log_info(f"    {i}. {channel.get('name', 'Unknown')} - {channel.get('url', 'No URL')} (playlists: {sync_playlists})")

        log_info(f"  Playlists configured: {len(self.config.playlists)}")
        for i, playlist in enumerate(self.config.playlists, 1):
            log_info(f"    {i}. {playlist.get('name', 'Unknown')} - {playlist.get('url', 'No URL')}")

        # Check database connection
        if self.db.connect():
            log_success(f"Database connection OK")
            log_info(f"Current video count: {self.db.get_video_count()}")
            log_info(f"Current playlist count: {self.db.get_playlist_count()}")
            self.db.close()


def main():
    parser = argparse.ArgumentParser(description='YouTube to Navidrome Video Clips Sync')
    parser.add_argument('--channel', type=str, help='Sync specific channel by name')
    parser.add_argument('--playlist', type=str, help='Sync specific YouTube playlist URL')
    parser.add_argument('--video', type=str, help='Add single video by URL')
    parser.add_argument('--batch', type=str, help='Import videos from URL list file')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be added')
    parser.add_argument('--check', action='store_true', help='Check configuration')

    args = parser.parse_args()

    sync = YouTubeSync()

    if args.check:
        sync.check_config()
    elif args.video:
        if not sync.db.connect():
            return
        try:
            sync.add_single_video(args.video, dry_run=args.dry_run)
        finally:
            sync.db.close()
    elif args.batch:
        if not sync.db.connect():
            return
        try:
            added = sync.batch_import(args.batch, dry_run=args.dry_run)
            log_info(f"Batch import complete: {added} videos processed")
        finally:
            sync.db.close()
    elif args.playlist:
        if not sync.db.connect():
            return
        try:
            sync.sync_playlist(args.playlist, dry_run=args.dry_run)
        finally:
            sync.db.close()
    elif args.channel:
        if not sync.db.connect():
            return
        try:
            channel = next(
                (c for c in sync.config.channels if c.get('name') == args.channel),
                None
            )
            if channel:
                sync.sync_channel(channel, dry_run=args.dry_run)
            else:
                log_error(f"Channel not found: {args.channel}")
        finally:
            sync.db.close()
    else:
        sync.sync_all(dry_run=args.dry_run)


if __name__ == '__main__':
    main()
