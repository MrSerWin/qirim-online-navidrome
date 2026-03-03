#!/usr/bin/env python3
"""
VK Music Scanner - Cleanup & Deduplication Script v2

Advanced comparison:
1. Clean filenames (remove emojis, junk symbols, keep Crimean Tatar/Turkish chars)
2. Cyrillic↔Latin transliteration for Crimean Tatar names
3. Audio duration comparison (via mutagen)
4. File size comparison
5. Fuzzy title matching
"""

import os
import re
import shutil
import unicodedata
import json
from pathlib import Path
from collections import defaultdict
from difflib import SequenceMatcher

try:
    from mutagen.mp3 import MP3
    MUTAGEN_AVAILABLE = True
except ImportError:
    MUTAGEN_AVAILABLE = False
    print("WARNING: mutagen not available, duration comparison disabled")

# === CONFIGURATION ===
DOWNLOADS_DIR = Path("/Volumes/T9/1_dev/1_QO/myQO/navidrome/scripts/vk-music-scanner/downloads")
LIBRARY_DIR = Path("/Volumes/T9/Media/Music/Музыка/QirimTatar")
OUTPUT_BASE = Path("/Volumes/T9/1_dev/1_QO/myQO/navidrome/scripts/vk-music-scanner")
TOLOAD_DIR = OUTPUT_BASE / "ToLoad"
DUPLICATES_DIR = OUTPUT_BASE / "Duplicates"

# Duration tolerance for matching (seconds)
DURATION_TOLERANCE = 3
# File size tolerance ratio (0.9 = within 10%)
SIZE_TOLERANCE = 0.85
# Fuzzy match threshold (0-1)
FUZZY_THRESHOLD = 0.82

SAFE_PUNCT = set("-().,_&'!+ ")

# === TRANSLITERATION MAPS ===
# Crimean Tatar Cyrillic → Latin
CYRILLIC_TO_LATIN = {
    # Uppercase
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Гъ': 'Ğ', 'Д': 'D',
    'Дж': 'C', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'J', 'З': 'Z', 'И': 'İ',
    'Й': 'Y', 'К': 'K', 'Къ': 'Q', 'Л': 'L', 'М': 'M', 'Н': 'N',
    'Нъ': 'Ñ', 'О': 'O', 'Ö': 'Ö', 'П': 'P', 'Р': 'R', 'С': 'S',
    'Т': 'T', 'У': 'U', 'Ü': 'Ü', 'Ф': 'F', 'Х': 'H', 'Ц': 'Ts',
    'Ч': 'Ç', 'Ш': 'Ş', 'Щ': 'Şç', 'Ъ': '', 'Ы': 'I', 'Ь': '',
    'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
    # Lowercase
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'гъ': 'ğ', 'д': 'd',
    'дж': 'c', 'е': 'e', 'ё': 'yo', 'ж': 'j', 'з': 'z', 'и': 'i',
    'й': 'y', 'к': 'k', 'къ': 'q', 'л': 'l', 'м': 'm', 'н': 'n',
    'нъ': 'ñ', 'о': 'o', 'ö': 'ö', 'п': 'p', 'р': 'r', 'с': 's',
    'т': 't', 'у': 'u', 'ü': 'ü', 'ф': 'f', 'х': 'h', 'ц': 'ts',
    'ч': 'ç', 'ш': 'ş', 'щ': 'şç', 'ъ': '', 'ы': 'ı', 'ь': '',
    'э': 'e', 'ю': 'yu', 'я': 'ya',
}

# Build reverse map Latin → simplified form for comparison
# We'll normalize both sides to a common form

def cyrillic_to_latin(text):
    """Convert Crimean Tatar Cyrillic text to Latin."""
    result = []
    i = 0
    while i < len(text):
        # Try digraphs first (гъ, къ, нъ, дж)
        if i + 1 < len(text):
            digraph = text[i:i+2]
            if digraph in CYRILLIC_TO_LATIN:
                result.append(CYRILLIC_TO_LATIN[digraph])
                i += 2
                continue
        # Single character
        ch = text[i]
        if ch in CYRILLIC_TO_LATIN:
            result.append(CYRILLIC_TO_LATIN[ch])
        else:
            result.append(ch)
        i += 1
    return ''.join(result)


def normalize_for_comparison(name):
    """Normalize name for comparison: transliterate, lowercase, clean."""
    name = unicodedata.normalize('NFC', name)
    # Remove file extension
    name = re.sub(r'\.mp3$', '', name, flags=re.IGNORECASE)
    # Transliterate Cyrillic to Latin
    name = cyrillic_to_latin(name)
    name = name.lower()
    # Normalize Turkish/Crimean Tatar chars to base forms for comparison
    replacements = {
        'ş': 's', 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'İ': 'i', 'i̇': 'i',
        'ö': 'o', 'ü': 'u', 'â': 'a', 'ñ': 'n', 'î': 'i',
        'š': 's', 'č': 'c', 'ž': 'z',
    }
    for k, v in replacements.items():
        name = name.replace(k, v)
    # Remove common suffixes/tags
    name = re.sub(r'\s*\(live\)\s*', ' ', name, flags=re.IGNORECASE)
    name = re.sub(r'\s*\(instrumental\)\s*', ' ', name, flags=re.IGNORECASE)
    name = re.sub(r'\s*\(original mix\)\s*', ' ', name, flags=re.IGNORECASE)
    name = re.sub(r'\s*\(cover\)\s*', ' ', name, flags=re.IGNORECASE)
    # Normalize separators
    name = re.sub(r'\s*[-–—]\s*', ' - ', name)
    # Remove all punctuation except hyphen and space
    name = re.sub(r'[^\w\s\-]', '', name)
    # Collapse whitespace
    name = re.sub(r'\s+', ' ', name).strip()
    return name


def extract_artist_title(filename):
    """Extract artist and title from filename."""
    name = re.sub(r'\.mp3$', '', filename, flags=re.IGNORECASE)
    if ' - ' in name:
        parts = name.split(' - ', 1)
        return parts[0].strip(), parts[1].strip()
    elif '-' in name:
        parts = name.split('-', 1)
        return parts[0].strip(), parts[1].strip()
    return '', name.strip()


def get_duration(filepath):
    """Get audio duration in seconds."""
    if not MUTAGEN_AVAILABLE:
        return None
    try:
        audio = MP3(str(filepath))
        return audio.info.length
    except Exception:
        return None


def get_file_size(filepath):
    """Get file size in bytes."""
    try:
        return filepath.stat().st_size
    except Exception:
        return 0


def fuzzy_match(s1, s2):
    """Return similarity ratio between two strings."""
    return SequenceMatcher(None, s1, s2).ratio()


def is_allowed_char(ch):
    if ch.isalnum():
        return True
    if ch in SAFE_PUNCT:
        return True
    cat = unicodedata.category(ch)
    if cat.startswith('L') or cat.startswith('M'):
        return True
    return False


def clean_name(name):
    """Clean a filename/folder name."""
    name = re.sub(r'^\[muzmo\.ru\]\s*', '', name)
    name = re.sub(r'^\[.*?\]\s*', '', name)
    name = re.sub(r'[║│┃]', '', name)
    name = re.sub(r'[★☆☾☽♫♪♬♩♭♮♯✦✧✩✪✫✬✭✮✯✰⭐🌟💫]', '', name)
    name = re.sub(r'[°•·]', '', name)
    name = re.sub(r'[""˜""\u201c\u201d\u201e\u201f]', '', name)
    name = re.sub(r'[_]{2,}', '_', name)
    result = [ch for ch in name if is_allowed_char(ch)]
    name = ''.join(result)
    name = re.sub(r'\s+', ' ', name).strip()
    name = re.sub(r'^[\s\-_\.]+', '', name)
    name = re.sub(r'[\s\-_\.]+$', '', name)
    return name


class LibraryIndex:
    """Index of existing library tracks with multiple lookup methods."""

    def __init__(self, library_dir):
        self.tracks = []  # (path, artist, title, normalized, duration, size)
        self.norm_index = set()  # normalized full names
        self.artist_titles = defaultdict(set)  # norm_artist -> set of norm_titles
        self.duration_index = defaultdict(list)  # rounded_duration -> [(artist, title, size)]
        self.size_index = defaultdict(list)  # rounded_size_kb -> [(artist, title, duration)]

        self._build(library_dir)

    def _build(self, library_dir):
        if not library_dir.exists():
            print(f"WARNING: Library dir not found: {library_dir}")
            return

        count = 0
        dur_count = 0
        for mp3 in library_dir.rglob("*.mp3"):
            filename = mp3.name
            artist, title = extract_artist_title(filename)
            norm_full = normalize_for_comparison(filename)
            norm_artist = normalize_for_comparison(artist) if artist else ''
            norm_title = normalize_for_comparison(title) if title else ''

            duration = get_duration(mp3)
            size = get_file_size(mp3)

            self.norm_index.add(norm_full)
            if norm_artist and norm_title:
                self.artist_titles[norm_artist].add(norm_title)

            if duration is not None:
                dur_key = round(duration)
                self.duration_index[dur_key].append((norm_artist, norm_title, size, mp3))
                dur_count += 1

            # Size index (in 100KB buckets)
            if size > 0:
                size_key = size // 102400  # 100KB buckets
                self.size_index[size_key].append((norm_artist, norm_title, duration, mp3))

            self.tracks.append((mp3, artist, title, norm_full, duration, size))
            count += 1

        print(f"Library: {count} tracks, {len(self.artist_titles)} artists, {dur_count} with duration info")

    def is_duplicate(self, filepath, filename):
        """Multi-method duplicate check. Returns (is_dup, reason) tuple."""
        norm_full = normalize_for_comparison(filename)
        artist, title = extract_artist_title(filename)
        norm_artist = normalize_for_comparison(artist) if artist else ''
        norm_title = normalize_for_comparison(title) if title else ''

        # Method 1: Exact normalized name match
        if norm_full in self.norm_index:
            return True, "exact name match"

        # Method 2: Artist+Title match (with transliteration)
        if norm_artist and norm_title:
            for lib_artist, lib_titles in self.artist_titles.items():
                artist_sim = fuzzy_match(norm_artist, lib_artist)
                if artist_sim >= FUZZY_THRESHOLD:
                    for lib_title in lib_titles:
                        title_sim = fuzzy_match(norm_title, lib_title)
                        if title_sim >= FUZZY_THRESHOLD:
                            return True, f"fuzzy match: artist={artist_sim:.0%} title={title_sim:.0%}"
                        # Substring match for short titles
                        if norm_title and lib_title:
                            shorter = min(len(norm_title), len(lib_title))
                            longer = max(len(norm_title), len(lib_title))
                            if shorter > 5 and (norm_title in lib_title or lib_title in norm_title):
                                if shorter / longer > 0.75:
                                    return True, f"substring match: '{norm_title}' ~ '{lib_title}'"

        # Method 3: Duration + similar artist/title (catches transliteration mismatches)
        if MUTAGEN_AVAILABLE:
            duration = get_duration(filepath)
            size = get_file_size(filepath)

            if duration is not None and duration > 10:
                dur_key = round(duration)
                # Check ±DURATION_TOLERANCE seconds
                candidates = []
                for dk in range(dur_key - DURATION_TOLERANCE, dur_key + DURATION_TOLERANCE + 1):
                    candidates.extend(self.duration_index.get(dk, []))

                for lib_artist_n, lib_title_n, lib_size, lib_path in candidates:
                    # If duration matches, check if names are somewhat similar
                    if norm_artist and lib_artist_n:
                        artist_sim = fuzzy_match(norm_artist, lib_artist_n)
                        if artist_sim >= 0.6:
                            if norm_title and lib_title_n:
                                title_sim = fuzzy_match(norm_title, lib_title_n)
                                if title_sim >= 0.6:
                                    return True, f"duration+name match: dur≈{duration:.0f}s artist={artist_sim:.0%} title={title_sim:.0%}"

                    # If duration AND size both match closely - very likely duplicate
                    if size > 0 and lib_size > 0:
                        size_ratio = min(size, lib_size) / max(size, lib_size)
                        if size_ratio >= SIZE_TOLERANCE:
                            # Same duration + same size = almost certainly same file
                            if norm_title and lib_title_n:
                                title_sim = fuzzy_match(norm_title, lib_title_n)
                                if title_sim >= 0.5:
                                    return True, f"duration+size match: dur≈{duration:.0f}s size≈{size//1024}KB ratio={size_ratio:.0%}"

        return False, ""


def main():
    print("=" * 60)
    print("VK Music Scanner - Cleanup & Dedup v2")
    print("=" * 60)

    # === PHASE 1: Scan downloads ===
    print("\n--- Phase 1: Scanning downloads ---")

    JUNK_FOLDERS = {'n', 'ng', 'ngin', 'ngineer', 'uthor', '[Unknown Artist]', 'Âèëè Þã'}

    all_tracks = []
    skipped_folders = []

    for artist_dir in sorted(DOWNLOADS_DIR.iterdir()):
        if not artist_dir.is_dir():
            continue
        if artist_dir.name in JUNK_FOLDERS:
            skipped_folders.append(artist_dir.name)
            continue
        for mp3 in artist_dir.glob("*.mp3"):
            all_tracks.append((mp3, artist_dir.name))

    print(f"Found {len(all_tracks)} tracks in {len(set(f for _, f in all_tracks))} artist folders")
    print(f"Skipped junk: {skipped_folders}")

    # === PHASE 2: Build library index ===
    print("\n--- Phase 2: Building library index (READ-ONLY) ---")
    library = LibraryIndex(LIBRARY_DIR)

    # === PHASE 3: Compare and classify ===
    print("\n--- Phase 3: Comparing tracks (this may take a while) ---")

    to_load = []
    duplicates = []
    internal_seen = {}  # norm_key -> first track path

    processed = 0
    for orig_path, orig_folder in all_tracks:
        processed += 1
        if processed % 200 == 0:
            print(f"  Processed {processed}/{len(all_tracks)}...")

        filename = orig_path.name

        # Clean names for output
        clean_folder = clean_name(orig_folder) or "Unknown"
        clean_filename = clean_name(orig_path.stem)
        if not clean_filename:
            clean_filename = "Unknown Track"
        clean_filename += ".mp3"

        dest_toload = TOLOAD_DIR / clean_folder / clean_filename
        dest_dup = DUPLICATES_DIR / clean_folder / clean_filename

        # Check internal duplicates first
        norm_key = normalize_for_comparison(filename)
        if norm_key in internal_seen:
            duplicates.append((orig_path, dest_dup, "internal duplicate"))
            continue
        internal_seen[norm_key] = orig_path

        # Check against library
        is_dup, reason = library.is_duplicate(orig_path, filename)
        if is_dup:
            duplicates.append((orig_path, dest_dup, reason))
        else:
            to_load.append((orig_path, dest_toload))

    print(f"\nResults:")
    print(f"  Unique (ToLoad):    {len(to_load)}")
    print(f"  Duplicates:         {len(duplicates)}")
    print(f"  Total processed:    {len(to_load) + len(duplicates)}")

    # Breakdown of duplicate reasons
    reason_counts = defaultdict(int)
    for _, _, reason in duplicates:
        # Generalize reason
        if reason.startswith("exact"):
            reason_counts["exact name match"] += 1
        elif reason.startswith("fuzzy"):
            reason_counts["fuzzy name match"] += 1
        elif reason.startswith("substring"):
            reason_counts["substring match"] += 1
        elif reason.startswith("duration+name"):
            reason_counts["duration+name match"] += 1
        elif reason.startswith("duration+size"):
            reason_counts["duration+size match"] += 1
        elif reason.startswith("internal"):
            reason_counts["internal duplicate"] += 1
        else:
            reason_counts[reason] += 1

    print(f"\nDuplicate breakdown:")
    for reason, count in sorted(reason_counts.items(), key=lambda x: -x[1]):
        print(f"  {reason}: {count}")

    # === PHASE 4: Move files ===
    print("\n--- Phase 4: Moving files ---")
    TOLOAD_DIR.mkdir(parents=True, exist_ok=True)
    DUPLICATES_DIR.mkdir(parents=True, exist_ok=True)

    def copy_safe(src, dst):
        dst.parent.mkdir(parents=True, exist_ok=True)
        if dst.exists():
            stem, suffix = dst.stem, dst.suffix
            counter = 1
            while dst.exists():
                dst = dst.parent / f"{stem} ({counter}){suffix}"
                counter += 1
        shutil.copy2(str(src), str(dst))
        return dst

    moved_toload = 0
    moved_dup = 0
    errors = 0

    for orig_path, dest_path in to_load:
        try:
            copy_safe(orig_path, dest_path)
            moved_toload += 1
        except Exception as e:
            print(f"  ERROR: {orig_path.name}: {e}")
            errors += 1

    for orig_path, dest_path, reason in duplicates:
        try:
            copy_safe(orig_path, dest_path)
            moved_dup += 1
        except Exception as e:
            print(f"  ERROR dup: {orig_path.name}: {e}")
            errors += 1

    print(f"  ToLoad: {moved_toload} copied")
    print(f"  Duplicates: {moved_dup} copied")
    if errors:
        print(f"  Errors: {errors}")

    # === SUMMARY ===
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    toload_count = sum(1 for _ in TOLOAD_DIR.rglob("*.mp3"))
    dup_count = sum(1 for _ in DUPLICATES_DIR.rglob("*.mp3"))
    print(f"  ToLoad:     {toload_count} tracks")
    print(f"  Duplicates: {dup_count} tracks")
    print(f"  Skipped:    {len(skipped_folders)} junk folders")

    # Write detailed report
    report_path = OUTPUT_BASE / "dedup_report_v2.txt"
    with open(report_path, 'w') as f:
        f.write("=== DUPLICATE REPORT v2 ===\n\n")

        f.write(f"Total processed: {len(all_tracks)}\n")
        f.write(f"Unique (ToLoad): {toload_count}\n")
        f.write(f"Duplicates: {dup_count}\n\n")

        f.write("--- DUPLICATES (with reasons) ---\n")
        for orig_path, dest_path, reason in sorted(duplicates, key=lambda x: x[0].name):
            f.write(f"  {orig_path.parent.name}/{orig_path.name}\n")
            f.write(f"    Reason: {reason}\n")

        f.write(f"\n--- UNIQUE TRACKS (ToLoad) ---\n")
        for orig_path, dest_path in sorted(to_load, key=lambda x: x[1].name):
            f.write(f"  {dest_path.parent.name}/{dest_path.name}\n")

        f.write(f"\n--- SKIPPED JUNK FOLDERS ---\n")
        for sf in skipped_folders:
            f.write(f"  {sf}\n")

    print(f"\n  Report: {report_path}")
    print(f"  ToLoad: {TOLOAD_DIR}")
    print(f"  Duplicates: {DUPLICATES_DIR}")


if __name__ == "__main__":
    main()
