#!/usr/bin/env python3
"""
VK Music Scanner for Navidrome
Scans VK for new tracks from artists in Navidrome database.
Downloads new tracks and notifies via Telegram.

Supports two authentication methods:
1. vkpymusic (login/password) - uses Kate Mobile token
2. Standalone app (OAuth) - uses your own VK app token
"""

import os
import sys
import json
import sqlite3
import hashlib
import logging
import time
import re
import webbrowser
import urllib.parse
from datetime import datetime
from pathlib import Path
from typing import Optional
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

import requests

# vkpymusic is required for VK audio access (uses Kate Mobile token)
try:
    from vkpymusic import TokenReceiver, Service
    VKPYMUSIC_AVAILABLE = True
except ImportError:
    VKPYMUSIC_AVAILABLE = False
    print("ERROR: vkpymusic is required. Run: pip3 install vkpymusic")

# Kate Mobile user agent - required for VK audio API access
KATE_USER_AGENT = "KateMobileAndroid/56 lite-460 (Android 9; SDK 28; arm64-v8a; HUAWEI COL-L29; en)"

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('vk_scanner.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Constants
SCRIPT_DIR = Path(__file__).parent
CONFIG_FILE = SCRIPT_DIR / 'config.json'
DOWNLOADED_FILE = SCRIPT_DIR / 'downloaded.json'
TOKEN_FILE = SCRIPT_DIR / 'vk_token.json'

# VK API constants
VK_API_VERSION = '5.131'
VK_AUDIO_SCOPE = 'audio,offline'


class VKStandaloneAuth:
    """
    VK OAuth via standalone application.
    More reliable than login/password method.

    To create a VK standalone app:
    1. Go to https://vk.com/editapp?act=create
    2. Choose "Standalone app"
    3. Get app_id from app settings
    """

    def __init__(self, app_id: str, scope: str = VK_AUDIO_SCOPE):
        self.app_id = app_id
        self.scope = scope
        self.token = None
        self.user_id = None
        self.expires_at = None
        self._auth_code = None
        self._server = None

    def _load_saved_token(self) -> bool:
        """Load token from file if valid"""
        if not TOKEN_FILE.exists():
            return False

        try:
            with open(TOKEN_FILE, 'r') as f:
                data = json.load(f)

            # Check if token is for this app
            if data.get('app_id') != self.app_id:
                return False

            # Check expiration
            expires_at = data.get('expires_at', 0)
            if expires_at and expires_at < time.time():
                logger.warning("Saved token expired")
                return False

            self.token = data.get('access_token')
            self.user_id = data.get('user_id')
            self.expires_at = expires_at

            if self.token:
                logger.info("Loaded saved VK token")
                return True

        except Exception as e:
            logger.error(f"Failed to load saved token: {e}")

        return False

    def _save_token(self):
        """Save token to file"""
        try:
            data = {
                'app_id': self.app_id,
                'access_token': self.token,
                'user_id': self.user_id,
                'expires_at': self.expires_at,
                'saved_at': datetime.now().isoformat()
            }
            with open(TOKEN_FILE, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"Token saved to {TOKEN_FILE}")
        except Exception as e:
            logger.error(f"Failed to save token: {e}")

    def get_auth_url(self) -> str:
        """Generate OAuth authorization URL"""
        params = {
            'client_id': self.app_id,
            'display': 'page',
            'redirect_uri': 'https://oauth.vk.com/blank.html',
            'scope': self.scope,
            'response_type': 'token',
            'v': VK_API_VERSION
        }
        return f"https://oauth.vk.com/authorize?{urllib.parse.urlencode(params)}"

    def authenticate_interactive(self) -> bool:
        """
        Interactive OAuth flow - opens browser for user to authorize.
        User needs to paste the redirect URL back.
        """
        auth_url = self.get_auth_url()

        print("\n" + "="*60)
        print("VK STANDALONE APP AUTHENTICATION")
        print("="*60)
        print("\n1. Opening browser for VK authorization...")
        print(f"\n   If browser doesn't open, go to:\n   {auth_url}\n")

        # Try to open browser
        try:
            webbrowser.open(auth_url)
        except Exception:
            pass

        print("2. Authorize the app in VK")
        print("3. After authorization, you'll be redirected to a blank page")
        print("4. Copy the FULL URL from your browser's address bar")
        print("   (it will contain 'access_token=...')\n")

        redirect_url = input("Paste the redirect URL here: ").strip()

        return self._parse_redirect_url(redirect_url)

    def authenticate_with_token(self, token: str, user_id: str = None) -> bool:
        """Authenticate with existing token"""
        self.token = token
        self.user_id = user_id

        # Verify token
        if self._verify_token():
            self._save_token()
            return True
        return False

    def _parse_redirect_url(self, url: str) -> bool:
        """Parse access token from redirect URL"""
        try:
            # URL format: https://oauth.vk.com/blank.html#access_token=...&expires_in=...&user_id=...
            if '#' not in url:
                logger.error("Invalid redirect URL - no fragment found")
                return False

            fragment = url.split('#')[1]
            params = dict(urllib.parse.parse_qsl(fragment))

            self.token = params.get('access_token')
            self.user_id = params.get('user_id')
            expires_in = int(params.get('expires_in', 0))

            if expires_in > 0:
                self.expires_at = time.time() + expires_in
            else:
                # Token doesn't expire (offline access)
                self.expires_at = None

            if self.token:
                logger.info(f"Got VK token for user {self.user_id}")
                self._save_token()
                return True
            else:
                logger.error("No access_token in redirect URL")
                return False

        except Exception as e:
            logger.error(f"Failed to parse redirect URL: {e}")
            return False

    def _verify_token(self) -> bool:
        """Verify token is valid by making a test API call"""
        try:
            response = requests.get(
                'https://api.vk.com/method/users.get',
                params={
                    'access_token': self.token,
                    'v': VK_API_VERSION
                },
                timeout=10
            )
            data = response.json()

            if 'error' in data:
                logger.error(f"Token verification failed: {data['error']}")
                return False

            if 'response' in data and len(data['response']) > 0:
                user = data['response'][0]
                self.user_id = str(user.get('id'))
                logger.info(f"Token verified for user: {user.get('first_name')} {user.get('last_name')}")
                return True

        except Exception as e:
            logger.error(f"Token verification error: {e}")

        return False

    def authenticate(self) -> bool:
        """Main authentication method"""
        # Try to load saved token first
        if self._load_saved_token():
            if self._verify_token():
                return True
            logger.warning("Saved token invalid, need re-authentication")

        # Interactive authentication
        return self.authenticate_interactive()


class VKAudioAPI:
    """
    Direct VK Audio API client.
    Works with standalone app tokens.
    """

    def __init__(self, token: str, user_id: str = None):
        self.token = token
        self.user_id = user_id
        self.base_url = 'https://api.vk.com/method'

    def _api_call(self, method: str, params: dict = None) -> dict:
        """Make VK API call"""
        if params is None:
            params = {}

        params['access_token'] = self.token
        params['v'] = VK_API_VERSION

        try:
            response = requests.get(
                f"{self.base_url}/{method}",
                params=params,
                timeout=30
            )
            data = response.json()

            if 'error' in data:
                error = data['error']
                logger.error(f"VK API error: {error.get('error_msg')} (code: {error.get('error_code')})")
                return {}

            return data.get('response', {})

        except Exception as e:
            logger.error(f"VK API call failed: {e}")
            return {}

    def search_audio(self, query: str, count: int = 50, offset: int = 0) -> list[dict]:
        """
        Search for audio tracks.
        Note: This may not work with all tokens due to VK restrictions.
        """
        result = self._api_call('audio.search', {
            'q': query,
            'count': count,
            'offset': offset,
            'sort': 2,  # by popularity
            'auto_complete': 1,
            'performer_only': 0
        })

        if isinstance(result, dict) and 'items' in result:
            return result['items']
        elif isinstance(result, list):
            return result

        return []

    def get_audio_by_id(self, audio_ids: list[str]) -> list[dict]:
        """Get audio tracks by their IDs (owner_id_audio_id format)"""
        result = self._api_call('audio.getById', {
            'audios': ','.join(audio_ids)
        })

        return result if isinstance(result, list) else []


class TelegramNotifier:
    """Send notifications to Telegram"""

    def __init__(self, bot_token: str, chat_id: str):
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.base_url = f"https://api.telegram.org/bot{bot_token}"

    def send_message(self, text: str) -> bool:
        """Send a message to Telegram"""
        if not self.bot_token or not self.chat_id:
            logger.warning("Telegram not configured, skipping notification")
            return False

        try:
            url = f"{self.base_url}/sendMessage"
            data = {
                "chat_id": self.chat_id,
                "text": text,
                "parse_mode": "HTML"
            }
            response = requests.post(url, json=data, timeout=30)
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Failed to send Telegram message: {e}")
            return False


class NavidromeDB:
    """Interface to Navidrome SQLite database"""

    def __init__(self, db_path: str):
        self.db_path = db_path

    def get_artists(self) -> list[dict]:
        """Get all artists from Navidrome database"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Get artists with their song count
            cursor.execute("""
                SELECT
                    a.id,
                    a.name,
                    COUNT(mf.id) as song_count
                FROM artist a
                JOIN media_file_artists mfa ON a.id = mfa.artist_id
                JOIN media_file mf ON mfa.media_file_id = mf.id
                GROUP BY a.id
                HAVING song_count > 0
                ORDER BY a.name
            """)

            artists = [dict(row) for row in cursor.fetchall()]
            conn.close()

            logger.info(f"Found {len(artists)} artists in Navidrome")
            return artists

        except Exception as e:
            logger.error(f"Failed to read Navidrome database: {e}")
            return []

    def get_existing_tracks(self, artist_name: str) -> set[str]:
        """Get existing track titles for an artist"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Search by artist name (case-insensitive)
            cursor.execute("""
                SELECT DISTINCT LOWER(title)
                FROM media_file
                WHERE LOWER(artist) = LOWER(?)
                   OR LOWER(album_artist) = LOWER(?)
            """, (artist_name, artist_name))

            tracks = {row[0] for row in cursor.fetchall()}
            conn.close()

            return tracks

        except Exception as e:
            logger.error(f"Failed to get existing tracks: {e}")
            return set()


class VKMusicScanner:
    """Scanner for VK Music"""

    def __init__(self, config: dict):
        self.config = config
        self.service = None  # vkpymusic Service (optional)
        self.vk_api: Optional[VKAudioAPI] = None  # Standalone API client
        self.auth_method = None  # 'standalone' or 'vkpymusic'
        self.downloaded = self._load_downloaded()

        # Initialize components
        self.telegram = TelegramNotifier(
            config.get('telegram', {}).get('bot_token', ''),
            config.get('telegram', {}).get('chat_id', '')
        )

        self.navidrome = NavidromeDB(
            config.get('navidrome', {}).get('db_path', '/opt/navidrome/data/navidrome.db')
        )

        self.music_dir = Path(config.get('navidrome', {}).get('music_dir', '/music'))
        self.artist_mappings = config.get('artist_mappings', {})
        self.settings = config.get('settings', {})

    def _load_downloaded(self) -> dict:
        """Load list of already downloaded tracks"""
        if DOWNLOADED_FILE.exists():
            try:
                with open(DOWNLOADED_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                pass
        return {'tracks': {}}

    def _save_downloaded(self):
        """Save list of downloaded tracks"""
        with open(DOWNLOADED_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.downloaded, f, ensure_ascii=False, indent=2)

    def _get_track_hash(self, artist: str, title: str) -> str:
        """Generate unique hash for a track"""
        key = f"{artist.lower().strip()}|{title.lower().strip()}"
        return hashlib.md5(key.encode()).hexdigest()

    def authenticate(self) -> bool:
        """
        Authenticate with VK using vkpymusic with Kate Mobile user agent.
        This is the only reliable method that works with VK audio API.

        The token must be obtained via Kate Mobile OAuth (get_kate_token.py).
        """
        if not VKPYMUSIC_AVAILABLE:
            logger.error("vkpymusic is required but not installed. Run: pip3 install vkpymusic")
            return False

        vk_config = self.config.get('vk', {})
        token = vk_config.get('token', '')

        if not token:
            logger.error("No VK token in config. Run get_kate_token.py to obtain one.")
            return False

        try:
            # Create vkpymusic Service with Kate Mobile user agent
            self.service = Service(user_agent=KATE_USER_AGENT, token=token)
            self.auth_method = 'vkpymusic'
            logger.info("Authenticated with VK using Kate Mobile token")
            return True
        except Exception as e:
            logger.error(f"VK authentication failed: {e}")
            return False

    def _get_search_names(self, artist_name: str) -> list[str]:
        """Get all search variations for an artist"""
        names = [artist_name]

        # Add mapped names (skip _comment keys)
        if artist_name in self.artist_mappings and not artist_name.startswith('_'):
            aliases = self.artist_mappings[artist_name]
            if isinstance(aliases, list):
                names.extend(aliases)

        # Check reverse mappings
        for main_name, aliases in self.artist_mappings.items():
            if main_name.startswith('_'):
                continue
            if isinstance(aliases, list) and artist_name in aliases:
                names.append(main_name)
                names.extend([a for a in aliases if a != artist_name])

        return list(set(names))

    def _sanitize_filename(self, name: str) -> str:
        """Sanitize string for use as filename"""
        # Remove/replace invalid characters
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            name = name.replace(char, '_')
        return name.strip()

    def _get_artist_folder(self, artist_name: str) -> Path:
        """Get or create folder for artist"""
        folder_name = self._sanitize_filename(artist_name)
        folder_path = self.music_dir / folder_name

        # Check if folder exists (case-insensitive)
        if not folder_path.exists():
            for existing in self.music_dir.iterdir():
                if existing.is_dir() and existing.name.lower() == folder_name.lower():
                    return existing

        folder_path.mkdir(parents=True, exist_ok=True)
        return folder_path

    def search_artist_tracks(self, artist_name: str) -> list[dict]:
        """Search for tracks by artist on VK using vkpymusic"""
        if not self.service:
            logger.error("VK service not initialized")
            return []

        all_tracks = []
        search_names = self._get_search_names(artist_name)
        max_tracks = self.settings.get('max_tracks_per_artist', 50)
        min_duration = self.settings.get('min_track_duration_sec', 60)

        for name in search_names:
            try:
                logger.info(f"Searching VK for: {name}")
                tracks = self._search_via_vkpymusic(name, max_tracks)

                for track in tracks:
                    # Filter by artist name match
                    track_artist = track.get('artist', '').lower()
                    if name.lower() in track_artist or track_artist in name.lower():
                        # Filter by duration
                        duration = track.get('duration', 0)
                        if duration >= min_duration:
                            all_tracks.append(track)

                # Rate limiting
                time.sleep(0.5)

            except Exception as e:
                logger.error(f"Error searching for {name}: {e}")

        # Remove duplicates by track ID
        seen = set()
        unique_tracks = []
        for track in all_tracks:
            track_key = f"{track.get('owner_id', '')}_{track.get('id', '')}"
            if track_key not in seen:
                seen.add(track_key)
                unique_tracks.append(track)

        return unique_tracks

    def _search_via_vkpymusic(self, query: str, count: int) -> list[dict]:
        """Search using vkpymusic library"""
        tracks = self.service.search_songs_by_text(text=query, count=count)
        return [{
            'id': track.track_id,
            'owner_id': track.owner_id,
            'artist': track.artist,
            'title': track.title,
            'duration': track.duration,
            'url': track.url
        } for track in tracks]

    def download_track(self, track: dict, artist_folder: Path) -> Optional[Path]:
        """Download a track to the artist folder"""
        try:
            artist = self._sanitize_filename(track['artist'])
            title = self._sanitize_filename(track['title'])
            filename = f"{artist} - {title}.mp3"
            filepath = artist_folder / filename

            # Skip if already exists
            if filepath.exists():
                logger.info(f"Track already exists: {filename}")
                return None

            # Download
            logger.info(f"Downloading: {filename}")

            response = requests.get(track['url'], stream=True, timeout=60)
            response.raise_for_status()

            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            logger.info(f"Downloaded: {filepath}")
            return filepath

        except Exception as e:
            logger.error(f"Failed to download {track['title']}: {e}")
            return None

    def scan_artist(self, artist: dict) -> list[dict]:
        """Scan VK for new tracks from an artist"""
        artist_name = artist['name']
        new_tracks = []

        logger.info(f"\n{'='*50}")
        logger.info(f"Scanning: {artist_name} ({artist['song_count']} tracks in library)")

        # Get existing tracks from Navidrome
        existing_titles = self.navidrome.get_existing_tracks(artist_name)
        logger.info(f"Found {len(existing_titles)} existing tracks")

        # Search VK
        vk_tracks = self.search_artist_tracks(artist_name)
        logger.info(f"Found {len(vk_tracks)} tracks on VK")

        # Find new tracks
        artist_folder = None

        for track in vk_tracks:
            title_lower = track['title'].lower().strip()
            track_hash = self._get_track_hash(track['artist'], track['title'])

            # Skip if already in library or already downloaded
            if title_lower in existing_titles:
                continue
            if track_hash in self.downloaded.get('tracks', {}):
                continue

            # This is a new track!
            logger.info(f"NEW: {track['artist']} - {track['title']}")

            # Get/create artist folder
            if artist_folder is None:
                artist_folder = self._get_artist_folder(artist_name)

            # Download
            downloaded_path = self.download_track(track, artist_folder)

            if downloaded_path:
                track['downloaded_path'] = str(downloaded_path)
                track['downloaded_at'] = datetime.now().isoformat()
                new_tracks.append(track)

                # Mark as downloaded
                self.downloaded.setdefault('tracks', {})[track_hash] = {
                    'artist': track['artist'],
                    'title': track['title'],
                    'downloaded_at': track['downloaded_at']
                }
                self._save_downloaded()

            # Rate limiting
            time.sleep(1)

        return new_tracks

    def run(self):
        """Main scanning loop"""
        logger.info("="*60)
        logger.info("VK Music Scanner started")
        logger.info("="*60)

        # Authenticate
        if not self.authenticate():
            self.telegram.send_message("❌ VK Music Scanner: Authentication failed!")
            return

        # Get artists from Navidrome
        artists = self.navidrome.get_artists()
        if not artists:
            logger.error("No artists found in Navidrome database")
            return

        # Scan each artist
        all_new_tracks = []

        for artist in artists:
            try:
                new_tracks = self.scan_artist(artist)
                all_new_tracks.extend(new_tracks)
            except Exception as e:
                logger.error(f"Error scanning {artist['name']}: {e}")

            # Rate limiting between artists
            time.sleep(2)

        # Summary
        logger.info("\n" + "="*60)
        logger.info(f"Scan complete! Found {len(all_new_tracks)} new tracks")

        # Send Telegram notification
        if all_new_tracks:
            msg = f"🎵 <b>VK Music Scanner</b>\n\n"
            msg += f"Найдено <b>{len(all_new_tracks)}</b> новых треков:\n\n"

            for track in all_new_tracks[:10]:  # Limit to 10 in notification
                msg += f"• {track['artist']} - {track['title']}\n"

            if len(all_new_tracks) > 10:
                msg += f"\n... и ещё {len(all_new_tracks) - 10} треков"

            msg += f"\n\n📁 Треки сохранены в: {self.music_dir}"

            self.telegram.send_message(msg)
        else:
            logger.info("No new tracks found")


def main():
    """Entry point"""
    # Load config
    if not CONFIG_FILE.exists():
        logger.error(f"Config file not found: {CONFIG_FILE}")
        logger.error("Copy config.example.json to config.json and fill in your credentials")
        sys.exit(1)

    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        config = json.load(f)

    # Run scanner
    scanner = VKMusicScanner(config)
    scanner.run()


if __name__ == '__main__':
    main()
