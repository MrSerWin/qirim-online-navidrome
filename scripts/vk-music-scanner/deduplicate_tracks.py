#!/usr/bin/env python3
"""
Deduplicate tracks by comparing new downloads with existing library
Uses:
- cyr2lat transliteration for name normalization
- Audio duration comparison
- Chromaprint audio fingerprinting for content matching
"""

import json
import os
import re
import shutil
import subprocess
import unicodedata
from pathlib import Path
from datetime import datetime
from difflib import SequenceMatcher

SCRIPT_DIR = Path(__file__).parent
DOWNLOADS_DIR = SCRIPT_DIR / "downloads"
LIBRARY_DIR = Path("/Volumes/T9/MyOneDrive/Media/Music/Музыка/QirimTatar")
UPLOAD_DIR = SCRIPT_DIR / "Upload"
TRANSLITERATE_JS = SCRIPT_DIR / "transliterate_wrapper.js"

# Thresholds
DURATION_TOLERANCE = 3.0  # seconds - tracks within this are potential matches
FINGERPRINT_THRESHOLD = 0.7  # 70% similarity for fingerprint match
NAME_SIMILARITY_THRESHOLD = 0.6  # 60% for fuzzy name matching


def transliterate(text: str) -> str:
    """Transliterate using your cyr2lat.js"""
    if not text:
        return ''
    try:
        result = subprocess.run(
            ['node', str(TRANSLITERATE_JS), text],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            return result.stdout.strip()
        return text
    except Exception:
        return text


def get_duration(filepath: str) -> float:
    """Get audio duration in seconds using ffprobe"""
    try:
        result = subprocess.run([
            'ffprobe', '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            filepath
        ], capture_output=True, text=True, timeout=10)
        if result.returncode == 0 and result.stdout.strip():
            return float(result.stdout.strip())
    except Exception:
        pass
    return 0.0


def get_fingerprint(filepath: str) -> str:
    """Get audio fingerprint using fpcalc (chromaprint)"""
    try:
        result = subprocess.run([
            'fpcalc', '-raw', filepath
        ], capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            for line in result.stdout.split('\n'):
                if line.startswith('FINGERPRINT='):
                    return line.split('=', 1)[1]
    except Exception:
        pass
    return ''


def compare_fingerprints(fp1: str, fp2: str) -> float:
    """Compare two fingerprints, return similarity 0-1"""
    if not fp1 or not fp2:
        return 0.0

    # Convert to integer arrays
    try:
        arr1 = [int(x) for x in fp1.split(',')]
        arr2 = [int(x) for x in fp2.split(',')]
    except ValueError:
        return 0.0

    if not arr1 or not arr2:
        return 0.0

    # Compare using bit-level similarity
    min_len = min(len(arr1), len(arr2))
    if min_len == 0:
        return 0.0

    # Truncate to same length
    arr1 = arr1[:min_len]
    arr2 = arr2[:min_len]

    # Count matching bits using XOR and popcount
    matching_bits = 0
    total_bits = 0

    for a, b in zip(arr1, arr2):
        xor = a ^ b
        # Count differing bits
        diff_bits = bin(xor & 0xFFFFFFFF).count('1')
        matching_bits += 32 - diff_bits
        total_bits += 32

    return matching_bits / total_bits if total_bits > 0 else 0.0


def normalize(text: str) -> str:
    """Normalize text for comparison"""
    if not text:
        return ''

    result = transliterate(text)
    result = result.lower()
    result = unicodedata.normalize('NFKD', result)
    result = ''.join(c for c in result if not unicodedata.combining(c))

    replacements = {
        'ı': 'i', 'İ': 'i', 'ş': 's', 'Ş': 's',
        'ğ': 'g', 'Ğ': 'g', 'ç': 'c', 'Ç': 'c',
        'ö': 'o', 'Ö': 'o', 'ü': 'u', 'Ü': 'u',
        'ñ': 'n', 'Ñ': 'n', 'â': 'a', 'Â': 'a',
    }
    for old, new in replacements.items():
        result = result.replace(old, new)

    result = re.sub(r'[^\w\s]', ' ', result)
    result = ' '.join(result.split())
    return result


def name_similarity(name1: str, name2: str) -> float:
    """Calculate similarity between two names (0-1)"""
    if not name1 or not name2:
        return 0.0

    n1 = normalize(name1)
    n2 = normalize(name2)

    if n1 == n2:
        return 1.0

    # Check if one contains the other
    if n1 in n2 or n2 in n1:
        return 0.9

    # Use SequenceMatcher for fuzzy comparison
    return SequenceMatcher(None, n1, n2).ratio()


def parse_filename(filepath: str) -> tuple:
    """Extract artist and title from filename"""
    base = os.path.splitext(os.path.basename(filepath))[0]
    if ' - ' in base:
        parts = base.split(' - ', 1)
        return parts[0].strip(), parts[1].strip()
    return '', base


def get_mp3_files(directory: Path) -> list:
    """Get all MP3 files recursively"""
    files = []
    if not directory.exists():
        return files
    for root, dirs, filenames in os.walk(directory):
        for filename in filenames:
            if filename.lower().endswith('.mp3'):
                files.append(os.path.join(root, filename))
    return files


def build_existing_index(library_dir: Path) -> dict:
    """Build index with duration and fingerprint data"""
    index = {'by_title': {}, 'by_duration': {}, 'files': {}}
    files = get_mp3_files(library_dir)

    print(f"📚 Indexing {len(files)} existing tracks...")
    print("   (extracting duration and fingerprints...)")

    for i, file in enumerate(files):
        if (i + 1) % 200 == 0:
            print(f"   ... {i + 1}/{len(files)}")

        artist, title = parse_filename(file)
        duration = get_duration(file)

        # Store in files index
        index['files'][file] = {
            'artist': artist,
            'title': title,
            'duration': duration,
            'normalized_title': normalize(title),
            'normalized_artist': normalize(artist),
            'fingerprint': None  # Lazy load
        }

        # Index by normalized title
        norm_title = normalize(title)
        if norm_title:
            if norm_title not in index['by_title']:
                index['by_title'][norm_title] = []
            index['by_title'][norm_title].append(file)

        # Index by duration bucket (rounded to nearest second)
        if duration > 0:
            duration_key = round(duration)
            if duration_key not in index['by_duration']:
                index['by_duration'][duration_key] = []
            index['by_duration'][duration_key].append(file)

    return index


def find_duplicate(new_file: str, new_artist: str, new_title: str,
                   existing_index: dict) -> dict:
    """Find if track is duplicate using multiple methods"""

    new_duration = get_duration(new_file)
    norm_new_title = normalize(new_title)
    norm_new_artist = normalize(new_artist)

    candidates = []

    # Method 1: Exact title match
    if norm_new_title in existing_index['by_title']:
        for existing_file in existing_index['by_title'][norm_new_title]:
            info = existing_index['files'][existing_file]
            candidates.append({
                'file': existing_file,
                'match_reason': 'title_exact',
                'info': info
            })

    # Method 2: Similar duration (within tolerance)
    if new_duration > 0:
        duration_key = round(new_duration)
        for d in range(duration_key - 3, duration_key + 4):
            if d in existing_index['by_duration']:
                for existing_file in existing_index['by_duration'][d]:
                    info = existing_index['files'][existing_file]
                    if abs(info['duration'] - new_duration) <= DURATION_TOLERANCE:
                        if existing_file not in [c['file'] for c in candidates]:
                            candidates.append({
                                'file': existing_file,
                                'match_reason': 'duration_similar',
                                'info': info
                            })

    # Evaluate candidates
    best_match = None
    best_score = 0

    for candidate in candidates:
        info = candidate['info']
        score = 0
        reasons = []

        # Title similarity
        title_sim = name_similarity(new_title, info['title'])
        if title_sim >= NAME_SIMILARITY_THRESHOLD:
            score += title_sim * 40  # up to 40 points
            reasons.append(f"title:{title_sim:.0%}")

        # Artist similarity
        artist_sim = name_similarity(new_artist, info['artist'])
        if artist_sim >= NAME_SIMILARITY_THRESHOLD:
            score += artist_sim * 30  # up to 30 points
            reasons.append(f"artist:{artist_sim:.0%}")

        # Duration match
        if new_duration > 0 and info['duration'] > 0:
            duration_diff = abs(new_duration - info['duration'])
            if duration_diff <= DURATION_TOLERANCE:
                duration_score = (1 - duration_diff / DURATION_TOLERANCE) * 20
                score += duration_score
                reasons.append(f"duration:{duration_diff:.1f}s")

        # If high score from name+duration, check fingerprint for confirmation
        if score >= 50:
            # Lazy load fingerprint
            if info['fingerprint'] is None:
                info['fingerprint'] = get_fingerprint(candidate['file'])

            new_fp = get_fingerprint(new_file)
            if new_fp and info['fingerprint']:
                fp_sim = compare_fingerprints(new_fp, info['fingerprint'])
                if fp_sim >= FINGERPRINT_THRESHOLD:
                    score += fp_sim * 30  # up to 30 points for fingerprint
                    reasons.append(f"audio:{fp_sim:.0%}")

        candidate['score'] = score
        candidate['reasons'] = reasons

        if score > best_score:
            best_score = score
            best_match = candidate

    # Decision thresholds
    if best_match:
        if best_score >= 70:  # High confidence duplicate
            return {
                'is_dupe': True,
                'confidence': 'high',
                'score': best_score,
                'existing_file': best_match['file'],
                'existing_artist': best_match['info']['artist'],
                'existing_title': best_match['info']['title'],
                'reasons': best_match['reasons']
            }
        elif best_score >= 50:  # Possible duplicate - needs review
            return {
                'is_dupe': False,
                'confidence': 'medium',
                'score': best_score,
                'potential_match': {
                    'file': best_match['file'],
                    'artist': best_match['info']['artist'],
                    'title': best_match['info']['title'],
                    'reasons': best_match['reasons']
                }
            }

    return {'is_dupe': False, 'confidence': 'low'}


def main():
    print('=' * 70)
    print('TRACK DEDUPLICATION (with audio analysis)')
    print('=' * 70)

    # Test transliterator
    test_result = transliterate("Тест")
    print(f"🔤 Transliterator: Тест → {test_result}")

    # Build index
    existing_index = build_existing_index(LIBRARY_DIR)
    print(f"📊 Indexed {len(existing_index['files'])} tracks")
    print(f"   {len(existing_index['by_title'])} unique titles")
    print(f"   {len(existing_index['by_duration'])} duration buckets\n")

    # Get new downloads
    new_files = get_mp3_files(DOWNLOADS_DIR)
    print(f"📥 Found {len(new_files)} new downloads\n")

    # Classify tracks
    unique = []
    duplicates = []
    uncertain = []

    print("🔍 Analyzing tracks...")
    for i, file in enumerate(new_files):
        artist, title = parse_filename(file)
        artist_folder = os.path.basename(os.path.dirname(file))

        print(f"   [{i+1}/{len(new_files)}] {artist} - {title[:40]}...", end=' ')

        result = find_duplicate(file, artist, title, existing_index)

        if result['is_dupe']:
            print(f"❌ DUPE ({result['score']:.0f}pts)")
            duplicates.append({
                'file': file,
                'artist': artist,
                'title': title,
                'artist_folder': artist_folder,
                'existing_file': result['existing_file'],
                'existing_artist': result['existing_artist'],
                'score': result['score'],
                'reasons': result['reasons']
            })
        elif result.get('potential_match'):
            print(f"⚠️ MAYBE ({result['score']:.0f}pts)")
            uncertain.append({
                'file': file,
                'artist': artist,
                'title': title,
                'artist_folder': artist_folder,
                'potential_match': result['potential_match']
            })
        else:
            print("✅ UNIQUE")
            unique.append({
                'file': file,
                'artist': artist,
                'title': title,
                'artist_folder': artist_folder
            })

    # Report
    print('\n' + '-' * 70)
    print('RESULTS')
    print('-' * 70)

    print(f"\n✅ UNIQUE ({len(unique)} tracks):")
    for t in unique:
        print(f"   {t['artist_folder']}: {t['artist']} - {t['title'][:50]}")

    print(f"\n❌ DUPLICATES ({len(duplicates)} tracks):")
    for t in duplicates:
        print(f"   {t['artist']} - {t['title'][:40]}")
        print(f"      → {os.path.basename(t['existing_file'])[:50]}")
        print(f"      ({', '.join(t['reasons'])})")

    if uncertain:
        print(f"\n⚠️  UNCERTAIN ({len(uncertain)} tracks):")
        for t in uncertain:
            print(f"   {t['artist']} - {t['title'][:40]}")
            pm = t['potential_match']
            print(f"      ? {pm['artist']} - {pm['title'][:40]}")
            print(f"      ({', '.join(pm['reasons'])})")

    # Move files
    print('\n' + '-' * 70)
    print('MOVING FILES')
    print('-' * 70)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    moved_artists = set()

    for track in unique:
        artist_upload_dir = UPLOAD_DIR / track['artist_folder']
        artist_upload_dir.mkdir(parents=True, exist_ok=True)
        dest_file = artist_upload_dir / os.path.basename(track['file'])
        try:
            shutil.copy2(track['file'], dest_file)
            print(f"✓ {track['artist_folder']}/{os.path.basename(track['file'])[:50]}")
            moved_artists.add(track['artist_folder'])
        except Exception as e:
            print(f"✗ Error: {e}")

    if uncertain:
        uncertain_dir = UPLOAD_DIR / '_UNCERTAIN'
        uncertain_dir.mkdir(parents=True, exist_ok=True)
        print(f"\n⚠️  Moving uncertain to _UNCERTAIN:")
        for track in uncertain:
            dest_file = uncertain_dir / os.path.basename(track['file'])
            try:
                shutil.copy2(track['file'], dest_file)
                print(f"   {os.path.basename(track['file'])[:60]}")
            except Exception as e:
                print(f"   ✗ Error: {e}")

    # Summary
    print('\n' + '=' * 70)
    print('SUMMARY')
    print('=' * 70)
    print(f"✅ Unique: {len(unique)}")
    print(f"❌ Duplicates: {len(duplicates)}")
    print(f"⚠️  Uncertain: {len(uncertain)}")
    print(f"\n📁 Upload: {UPLOAD_DIR}")
    print(f"\nArtists: {', '.join(sorted(moved_artists))}")

    # Save report
    report = {
        'timestamp': datetime.now().isoformat(),
        'unique': [{'file': str(Path(t['file']).relative_to(SCRIPT_DIR)),
                    **{k: v for k, v in t.items() if k != 'file'}} for t in unique],
        'duplicates': [{'file': str(Path(t['file']).relative_to(SCRIPT_DIR)),
                        **{k: v for k, v in t.items() if k != 'file'}} for t in duplicates],
        'uncertain': [{'file': str(Path(t['file']).relative_to(SCRIPT_DIR)),
                       **{k: v for k, v in t.items() if k != 'file'}} for t in uncertain],
        'artists': sorted(list(moved_artists))
    }

    with open(SCRIPT_DIR / 'dedup_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n📋 Report: dedup_report.json")


if __name__ == '__main__':
    main()
