#!/usr/bin/env python3
"""
VK Music Sync - автоматическая синхронизация музыки из VK в библиотеку Navidrome

Этапы:
1. Сканирование VK на новые треки
2. Скачивание новых треков
3. Дедупликация с аудио-анализом
4. Перемещение уникальных треков в библиотеку
5. Обновление тегов
6. Очистка временных файлов

Использование:
    python sync_vk_music.py                    # Полный цикл (интерактивный)
    python sync_vk_music.py --auto             # Полностью автоматический режим
    python sync_vk_music.py --scan-only        # Только сканирование
    python sync_vk_music.py --download-only    # Только скачивание
    python sync_vk_music.py --dedup-only       # Только дедупликация
    python sync_vk_music.py --move-only        # Только перемещение в библиотеку
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata
from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path

# Пути
SCRIPT_DIR = Path(__file__).parent
CONFIG_FILE = SCRIPT_DIR / "config.json"
DOWNLOADS_DIR = SCRIPT_DIR / "downloads"
UPLOAD_DIR = SCRIPT_DIR / "Upload"
LIBRARY_DIR = Path("/Volumes/T9/MyOneDrive/Media/Music/Музыка/QirimTatar")
COVER_IMAGE = SCRIPT_DIR.parent / "qo_2000.png"
UPDATE_TAGS_SCRIPT = SCRIPT_DIR.parent / "update-music-tags.sh"
TRANSLITERATE_JS = SCRIPT_DIR / "transliterate_wrapper.js"

# Файлы данных
NEW_TRACKS_FILE = SCRIPT_DIR / "new_tracks_found.json"
DOWNLOAD_HISTORY_FILE = SCRIPT_DIR / "download_history.json"
DEDUP_REPORT_FILE = SCRIPT_DIR / "dedup_report.json"
SYNC_LOG_FILE = SCRIPT_DIR / "sync_log.json"

# Пороги для дедупликации
DURATION_TOLERANCE = 3.0
FINGERPRINT_THRESHOLD = 0.7
NAME_SIMILARITY_THRESHOLD = 0.6


def load_config():
    """Загрузить конфигурацию"""
    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def log(message, level="INFO"):
    """Логирование с timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    prefix = {"INFO": "ℹ️", "OK": "✅", "WARN": "⚠️", "ERROR": "❌", "STEP": "▶️"}
    print(f"[{timestamp}] {prefix.get(level, '•')} {message}")


def run_command(cmd, description="", timeout=300):
    """Запустить команду и вернуть результат"""
    if description:
        log(description, "STEP")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Timeout"
    except Exception as e:
        return False, "", str(e)


def transliterate(text):
    """Транслитерация через cyr2lat.js"""
    if not text:
        return ''
    try:
        result = subprocess.run(
            ['node', str(TRANSLITERATE_JS), text],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except:
        pass
    return text


def normalize(text):
    """Нормализация текста для сравнения"""
    if not text:
        return ''
    result = transliterate(text).lower()
    result = unicodedata.normalize('NFKD', result)
    result = ''.join(c for c in result if not unicodedata.combining(c))
    for old, new in {'ı': 'i', 'ş': 's', 'ğ': 'g', 'ç': 'c', 'ö': 'o', 'ü': 'u', 'ñ': 'n', 'â': 'a'}.items():
        result = result.replace(old, new)
    result = re.sub(r'[^\w\s]', ' ', result)
    return ' '.join(result.split())


def get_duration(filepath):
    """Получить длительность трека"""
    try:
        result = subprocess.run([
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1', filepath
        ], capture_output=True, text=True, timeout=10)
        if result.returncode == 0 and result.stdout.strip():
            return float(result.stdout.strip())
    except:
        pass
    return 0.0


def get_fingerprint(filepath):
    """Получить аудио-fingerprint"""
    try:
        result = subprocess.run(['fpcalc', '-raw', filepath],
                                capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            for line in result.stdout.split('\n'):
                if line.startswith('FINGERPRINT='):
                    return line.split('=', 1)[1]
    except:
        pass
    return ''


def compare_fingerprints(fp1, fp2):
    """Сравнить fingerprints"""
    if not fp1 or not fp2:
        return 0.0
    try:
        arr1 = [int(x) for x in fp1.split(',')]
        arr2 = [int(x) for x in fp2.split(',')]
    except:
        return 0.0

    min_len = min(len(arr1), len(arr2))
    if min_len == 0:
        return 0.0

    matching_bits = sum(32 - bin((a ^ b) & 0xFFFFFFFF).count('1')
                        for a, b in zip(arr1[:min_len], arr2[:min_len]))
    return matching_bits / (min_len * 32)


def name_similarity(n1, n2):
    """Сравнить имена"""
    if not n1 or not n2:
        return 0.0
    n1, n2 = normalize(n1), normalize(n2)
    if n1 == n2:
        return 1.0
    if n1 in n2 or n2 in n1:
        return 0.9
    return SequenceMatcher(None, n1, n2).ratio()


def get_mp3_files(directory):
    """Получить все MP3 файлы"""
    files = []
    if directory.exists():
        for root, _, filenames in os.walk(directory):
            for f in filenames:
                if f.lower().endswith('.mp3'):
                    files.append(os.path.join(root, f))
    return files


def parse_filename(filepath):
    """Извлечь артиста и название из имени файла"""
    base = os.path.splitext(os.path.basename(filepath))[0]
    if ' - ' in base:
        parts = base.split(' - ', 1)
        return parts[0].strip(), parts[1].strip()
    return '', base


# ============================================================
# ЭТАП 1: Сканирование VK
# ============================================================
def step_scan_vk():
    """Сканировать VK на новые треки"""
    log("Сканирование VK на новые треки...", "STEP")

    # Запускаем find_new_tracks.py
    success, stdout, stderr = run_command(
        [sys.executable, str(SCRIPT_DIR / "find_new_tracks.py")],
        timeout=600
    )

    if not success:
        log(f"Ошибка сканирования: {stderr}", "ERROR")
        return False, 0

    # Проверяем результат
    if NEW_TRACKS_FILE.exists():
        with open(NEW_TRACKS_FILE, 'r', encoding='utf-8') as f:
            tracks = json.load(f)
        log(f"Найдено {len(tracks)} новых треков на VK", "OK")
        return True, len(tracks)

    log("Новых треков не найдено", "OK")
    return True, 0


# ============================================================
# ЭТАП 2: Скачивание
# ============================================================
def step_download():
    """Скачать новые треки"""
    if not NEW_TRACKS_FILE.exists():
        log("Нет файла с новыми треками", "WARN")
        return False, 0

    with open(NEW_TRACKS_FILE, 'r', encoding='utf-8') as f:
        tracks = json.load(f)

    if not tracks:
        log("Список треков пуст", "WARN")
        return True, 0

    log(f"Скачивание {len(tracks)} треков...", "STEP")

    success, stdout, stderr = run_command(
        [sys.executable, str(SCRIPT_DIR / "download_new_tracks.py")],
        timeout=1800
    )

    if not success:
        log(f"Ошибка скачивания: {stderr}", "ERROR")
        return False, 0

    # Считаем скачанные файлы
    downloaded = len(get_mp3_files(DOWNLOADS_DIR))
    log(f"Скачано файлов в downloads: {downloaded}", "OK")
    return True, downloaded


# ============================================================
# ЭТАП 3: Дедупликация
# ============================================================
def step_deduplicate():
    """Дедупликация с аудио-анализом"""
    log("Дедупликация треков...", "STEP")

    # Получаем новые файлы
    new_files = get_mp3_files(DOWNLOADS_DIR)
    if not new_files:
        log("Нет файлов для дедупликации", "WARN")
        return True, [], [], []

    log(f"Анализ {len(new_files)} файлов...", "INFO")

    # Строим индекс библиотеки
    library_files = get_mp3_files(LIBRARY_DIR)
    log(f"Индексация {len(library_files)} файлов библиотеки...", "INFO")

    index = {'by_title': {}, 'by_duration': {}, 'files': {}}

    for i, f in enumerate(library_files):
        if (i + 1) % 500 == 0:
            print(f"   ... {i + 1}/{len(library_files)}", end='\r')

        artist, title = parse_filename(f)
        duration = get_duration(f)
        norm_title = normalize(title)

        index['files'][f] = {
            'artist': artist, 'title': title, 'duration': duration,
            'normalized_title': norm_title, 'fingerprint': None
        }

        if norm_title:
            if norm_title not in index['by_title']:
                index['by_title'][norm_title] = []
            index['by_title'][norm_title].append(f)

        if duration > 0:
            key = round(duration)
            if key not in index['by_duration']:
                index['by_duration'][key] = []
            index['by_duration'][key].append(f)

    print()

    # Классифицируем файлы
    unique, duplicates, uncertain = [], [], []

    for i, f in enumerate(new_files):
        artist, title = parse_filename(f)
        folder = os.path.basename(os.path.dirname(f))
        duration = get_duration(f)

        print(f"   [{i+1}/{len(new_files)}] {artist[:30]} - {title[:30]}...", end=' ')

        # Ищем кандидатов
        candidates = []
        norm_title = normalize(title)

        if norm_title in index['by_title']:
            for ef in index['by_title'][norm_title]:
                candidates.append((ef, 'title'))

        if duration > 0:
            for d in range(round(duration) - 3, round(duration) + 4):
                if d in index['by_duration']:
                    for ef in index['by_duration'][d]:
                        if ef not in [c[0] for c in candidates]:
                            if abs(index['files'][ef]['duration'] - duration) <= DURATION_TOLERANCE:
                                candidates.append((ef, 'duration'))

        # Оцениваем кандидатов
        best_match, best_score = None, 0

        for ef, _ in candidates:
            info = index['files'][ef]
            score, reasons = 0, []

            title_sim = name_similarity(title, info['title'])
            if title_sim >= NAME_SIMILARITY_THRESHOLD:
                score += title_sim * 40
                reasons.append(f"title:{title_sim:.0%}")

            artist_sim = name_similarity(artist, info['artist'])
            if artist_sim >= NAME_SIMILARITY_THRESHOLD:
                score += artist_sim * 30
                reasons.append(f"artist:{artist_sim:.0%}")

            if duration > 0 and info['duration'] > 0:
                diff = abs(duration - info['duration'])
                if diff <= DURATION_TOLERANCE:
                    score += (1 - diff / DURATION_TOLERANCE) * 20
                    reasons.append(f"dur:{diff:.1f}s")

            if score >= 50:
                if info['fingerprint'] is None:
                    info['fingerprint'] = get_fingerprint(ef)
                new_fp = get_fingerprint(f)
                if new_fp and info['fingerprint']:
                    fp_sim = compare_fingerprints(new_fp, info['fingerprint'])
                    if fp_sim >= FINGERPRINT_THRESHOLD:
                        score += fp_sim * 30
                        reasons.append(f"audio:{fp_sim:.0%}")

            if score > best_score:
                best_score, best_match = score, (ef, info, reasons)

        # Решение
        track_info = {'file': f, 'artist': artist, 'title': title, 'folder': folder}

        if best_match and best_score >= 70:
            print("❌ DUPE")
            track_info['match'] = best_match[0]
            track_info['reasons'] = best_match[2]
            duplicates.append(track_info)
        elif best_match and best_score >= 50:
            print("⚠️ MAYBE")
            track_info['match'] = best_match[0]
            track_info['reasons'] = best_match[2]
            uncertain.append(track_info)
        else:
            print("✅ UNIQUE")
            unique.append(track_info)

    log(f"Результат: {len(unique)} уникальных, {len(duplicates)} дубликатов, {len(uncertain)} неопределённых", "OK")

    # Сохраняем отчёт
    report = {
        'timestamp': datetime.now().isoformat(),
        'unique': unique, 'duplicates': duplicates, 'uncertain': uncertain
    }
    with open(DEDUP_REPORT_FILE, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    return True, unique, duplicates, uncertain


# ============================================================
# ЭТАП 4: Перемещение в Upload
# ============================================================
def step_move_to_upload(unique_tracks, uncertain_tracks):
    """Переместить уникальные треки в Upload"""
    if not unique_tracks:
        log("Нет треков для перемещения", "WARN")
        return True, set()

    log(f"Перемещение {len(unique_tracks)} треков в Upload...", "STEP")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    moved_artists = set()

    for track in unique_tracks:
        artist_dir = UPLOAD_DIR / track['folder']
        artist_dir.mkdir(parents=True, exist_ok=True)
        dest = artist_dir / os.path.basename(track['file'])

        try:
            shutil.copy2(track['file'], dest)
            moved_artists.add(track['folder'])
        except Exception as e:
            log(f"Ошибка копирования {track['file']}: {e}", "ERROR")

    # Неопределённые в отдельную папку
    if uncertain_tracks:
        uncertain_dir = UPLOAD_DIR / '_UNCERTAIN'
        uncertain_dir.mkdir(parents=True, exist_ok=True)
        for track in uncertain_tracks:
            try:
                shutil.copy2(track['file'], uncertain_dir / os.path.basename(track['file']))
            except:
                pass

    log(f"Перемещено в Upload: {len(unique_tracks)} треков ({len(moved_artists)} исполнителей)", "OK")
    return True, moved_artists


# ============================================================
# ЭТАП 5: Перемещение в библиотеку
# ============================================================
def step_move_to_library(auto_mode=False):
    """Переместить одобренные треки в библиотеку"""
    if not UPLOAD_DIR.exists():
        log("Папка Upload не существует", "WARN")
        return True, set()

    # Получаем список папок (кроме _UNCERTAIN и скрытых)
    artist_dirs = [d for d in UPLOAD_DIR.iterdir()
                   if d.is_dir() and not d.name.startswith(('_', '.'))]

    if not artist_dirs:
        log("Нет папок для перемещения", "WARN")
        return True, set()

    # В интерактивном режиме ждём подтверждения
    if not auto_mode:
        print("\n" + "=" * 60)
        print("Папки для загрузки в библиотеку:")
        for d in artist_dirs:
            files = list(d.glob("*.mp3"))
            print(f"  • {d.name} ({len(files)} файлов)")
        print("=" * 60)

        answer = input("\nПеренести в библиотеку? (y/n): ").strip().lower()
        if answer != 'y':
            log("Отменено пользователем", "WARN")
            return False, set()

    log(f"Перемещение {len(artist_dirs)} папок в библиотеку...", "STEP")

    moved_artists = set()

    for artist_dir in artist_dirs:
        artist_name = artist_dir.name
        target_dir = LIBRARY_DIR / artist_name
        target_dir.mkdir(parents=True, exist_ok=True)

        for mp3 in artist_dir.glob("*.mp3"):
            try:
                shutil.copy2(mp3, target_dir / mp3.name)
                moved_artists.add(artist_name)
            except Exception as e:
                log(f"Ошибка копирования {mp3}: {e}", "ERROR")

    log(f"Перемещено в библиотеку: {len(moved_artists)} исполнителей", "OK")
    return True, moved_artists


# ============================================================
# ЭТАП 6: Обновление тегов
# ============================================================
def step_update_tags(artists):
    """Обновить теги для исполнителей"""
    if not artists:
        return True

    log(f"Обновление тегов для {len(artists)} исполнителей...", "STEP")

    for artist in sorted(artists):
        artist_path = LIBRARY_DIR / artist
        if not artist_path.exists():
            continue

        print(f"   • {artist}...", end=' ')

        try:
            result = subprocess.run(
                ['bash', '-c', f'echo "y" | "{UPDATE_TAGS_SCRIPT}" "{artist_path}"'],
                capture_output=True, text=True, timeout=300
            )
            if result.returncode == 0:
                print("✓")
            else:
                print("✗")
        except Exception as e:
            print(f"✗ ({e})")

    log("Теги обновлены", "OK")
    return True


# ============================================================
# ЭТАП 7: Очистка
# ============================================================
def step_cleanup():
    """Очистить временные файлы"""
    log("Очистка временных файлов...", "STEP")

    # Очищаем downloads
    if DOWNLOADS_DIR.exists():
        for item in DOWNLOADS_DIR.iterdir():
            try:
                if item.is_dir():
                    shutil.rmtree(item)
                else:
                    item.unlink()
            except:
                pass

    # Очищаем Upload
    if UPLOAD_DIR.exists():
        shutil.rmtree(UPLOAD_DIR)

    # Удаляем временные файлы
    for f in [NEW_TRACKS_FILE]:
        if f.exists():
            f.unlink()

    log("Очистка завершена", "OK")
    return True


# ============================================================
# Главная функция
# ============================================================
def main():
    parser = argparse.ArgumentParser(description='VK Music Sync')
    parser.add_argument('--auto', action='store_true', help='Полностью автоматический режим')
    parser.add_argument('--scan-only', action='store_true', help='Только сканирование VK')
    parser.add_argument('--download-only', action='store_true', help='Только скачивание')
    parser.add_argument('--dedup-only', action='store_true', help='Только дедупликация')
    parser.add_argument('--move-only', action='store_true', help='Только перемещение в библиотеку')
    parser.add_argument('--no-cleanup', action='store_true', help='Не очищать временные файлы')
    args = parser.parse_args()

    print("\n" + "=" * 60)
    print("🎵 VK MUSIC SYNC")
    print("=" * 60)
    print(f"Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Режим: {'автоматический' if args.auto else 'интерактивный'}")
    print("=" * 60 + "\n")

    # Проверяем конфиг
    if not CONFIG_FILE.exists():
        log("Файл конфигурации не найден", "ERROR")
        return 1

    results = {'started': datetime.now().isoformat()}

    try:
        # Отдельные режимы
        if args.scan_only:
            step_scan_vk()
            return 0

        if args.download_only:
            step_download()
            return 0

        if args.dedup_only:
            step_deduplicate()
            return 0

        if args.move_only:
            success, artists = step_move_to_library(args.auto)
            if success and artists:
                step_update_tags(artists)
            return 0

        # Полный цикл
        # 1. Сканирование
        success, count = step_scan_vk()
        results['scan'] = {'success': success, 'tracks': count}
        if not success or count == 0:
            log("Новых треков не найдено, завершение", "OK")
            return 0

        # 2. Скачивание
        success, count = step_download()
        results['download'] = {'success': success, 'files': count}
        if not success or count == 0:
            return 1 if not success else 0

        # 3. Дедупликация
        success, unique, duplicates, uncertain = step_deduplicate()
        results['dedup'] = {
            'success': success,
            'unique': len(unique),
            'duplicates': len(duplicates),
            'uncertain': len(uncertain)
        }
        if not success or not unique:
            log("Нет уникальных треков", "WARN")
            return 0

        # 4. Перемещение в Upload
        success, artists = step_move_to_upload(unique, uncertain)
        results['upload'] = {'success': success, 'artists': list(artists)}

        # 5. Перемещение в библиотеку
        success, moved_artists = step_move_to_library(args.auto)
        results['library'] = {'success': success, 'artists': list(moved_artists)}

        if success and moved_artists:
            # 6. Обновление тегов
            step_update_tags(moved_artists)
            results['tags'] = {'success': True, 'artists': list(moved_artists)}

        # 7. Очистка
        if not args.no_cleanup:
            step_cleanup()

        # Итог
        print("\n" + "=" * 60)
        print("📊 ИТОГ")
        print("=" * 60)
        print(f"Найдено на VK: {results.get('scan', {}).get('tracks', 0)}")
        print(f"Скачано: {results.get('download', {}).get('files', 0)}")
        print(f"Уникальных: {results.get('dedup', {}).get('unique', 0)}")
        print(f"Дубликатов: {results.get('dedup', {}).get('duplicates', 0)}")
        print(f"Добавлено в библиотеку: {len(results.get('library', {}).get('artists', []))}")
        print("=" * 60)

        # Сохраняем лог
        results['finished'] = datetime.now().isoformat()
        with open(SYNC_LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

        return 0

    except KeyboardInterrupt:
        log("\nПрервано пользователем", "WARN")
        return 130
    except Exception as e:
        log(f"Критическая ошибка: {e}", "ERROR")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
