#!/usr/bin/env python3
"""
Скрипт для поиска альбомов и артистов в базе данных Navidrome,
которые соответствуют URL из файла редиректов.

Использование:
    python3 scripts/find-redirects.py [--db /path/to/navidrome.db]

Примеры:
    # Локально
    python3 scripts/find-redirects.py

    # На проде
    python3 find-redirects.py --db /data/navidrome.db
"""

import sqlite3
import re
import urllib.parse
import unicodedata
import argparse
from pathlib import Path

# Пути по умолчанию
SCRIPT_DIR = Path(__file__).parent
REDIRECTS_FILE = SCRIPT_DIR / "to redirect.txt"
DEFAULT_DB_PATH = "/Volumes/T9/1_dev/1_QO/myQO/navidrome-data/navidrome.db"

def extract_name_from_url(url):
    """Извлекает имя из URL."""
    # Паттерн для album: /album/ID/name/russian_name или /album/ID/name
    # Паттерн для artist: /artist/ID/name/about или /artist/ID/name или /artist/name

    # Убираем /about если есть
    url = re.sub(r'/about$', '', url)

    # Парсим URL
    parsed = urllib.parse.urlparse(url)
    path_parts = parsed.path.strip('/').split('/')

    if len(path_parts) < 2:
        return None, None

    resource_type = path_parts[0]  # album или artist

    if resource_type == 'album':
        # /album/ID/name/russian_name
        if len(path_parts) >= 3:
            name = urllib.parse.unquote_plus(path_parts[2])
            return 'album', name
    elif resource_type == 'artist':
        # /artist/ID/name или /artist/name (без ID)
        if len(path_parts) >= 3:
            # Проверяем, является ли второй элемент числом (ID)
            if path_parts[1].isdigit():
                name = urllib.parse.unquote_plus(path_parts[2])
            else:
                name = urllib.parse.unquote_plus(path_parts[1])
            return 'artist', name
        elif len(path_parts) == 2:
            name = urllib.parse.unquote_plus(path_parts[1])
            return 'artist', name

    return None, None


def transliterate_turkish(text):
    """Транслитерирует турецкие буквы в латинские."""
    replacements = {
        'ı': 'i', 'İ': 'I', 'I': 'I',
        'ş': 's', 'Ş': 'S',
        'ğ': 'g', 'Ğ': 'G',
        'ç': 'c', 'Ç': 'C',
        'ö': 'o', 'Ö': 'O',
        'ü': 'u', 'Ü': 'U',
        'â': 'a', 'Â': 'A',
        'î': 'i', 'Î': 'I',
        'û': 'u', 'Û': 'U',
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def normalize_name(name):
    """Нормализует имя для сравнения."""
    if not name:
        return ""
    # Unicode NFC нормализация (объединяет decomposed символы)
    name = unicodedata.normalize('NFC', name)
    # Заменяем + на пробелы, приводим к нижнему регистру
    name = name.replace('+', ' ').lower().strip()
    # Убираем двойные пробелы
    name = re.sub(r'\s+', ' ', name)
    # Транслитерируем турецкие буквы
    name = transliterate_turkish(name)
    return name


def main():
    # Парсим аргументы командной строки
    parser = argparse.ArgumentParser(description='Поиск редиректов для альбомов и артистов')
    parser.add_argument('--db', default=DEFAULT_DB_PATH, help='Путь к базе данных Navidrome')
    parser.add_argument('--redirects', action='store_true', help='Вывести только редиректы для nginx')
    args = parser.parse_args()

    db_path = args.db

    # Читаем файл с URL
    if not REDIRECTS_FILE.exists():
        print(f"Файл не найден: {REDIRECTS_FILE}")
        return

    urls = REDIRECTS_FILE.read_text().strip().split('\n')
    urls = [u.strip() for u in urls if u.strip()]

    if not args.redirects:
        print(f"Загружено {len(urls)} URL из файла")
        print(f"База данных: {db_path}")
        print()

    # Подключаемся к базе данных
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Получаем все альбомы и артистов из базы
    # normalize_name уже применяет транслитерацию
    cursor.execute("SELECT id, name FROM album")
    albums_db = {}
    for row in cursor.fetchall():
        key = normalize_name(row[1])
        albums_db[key] = (row[0], row[1])
        # Отладка для проверки
        # print(f"Album: '{row[1]}' -> '{key}'")

    cursor.execute("SELECT id, name FROM artist")
    artists_db = {}
    for row in cursor.fetchall():
        key = normalize_name(row[1])
        artists_db[key] = (row[0], row[1])
        # Отладка для проверки
        # print(f"Artist: '{row[1]}' -> '{key}'")

    if not args.redirects:
        print(f"В базе: {len(albums_db)} альбомов, {len(artists_db)} артистов")
        print()

    # Ищем совпадения
    found_albums = []
    found_artists = []
    not_found = []

    for url in urls:
        resource_type, name = extract_name_from_url(url)
        if not resource_type or not name:
            not_found.append((url, "не удалось распарсить"))
            continue

        normalized = normalize_name(name)

        if resource_type == 'album':
            if normalized in albums_db:
                db_id, db_name = albums_db[normalized]
                found_albums.append({
                    'url': url,
                    'name_from_url': name,
                    'db_id': db_id,
                    'db_name': db_name,
                    'type': 'album'
                })
            else:
                not_found.append((url, f"альбом '{name}' не найден"))

        elif resource_type == 'artist':
            if normalized in artists_db:
                db_id, db_name = artists_db[normalized]
                found_artists.append({
                    'url': url,
                    'name_from_url': name,
                    'db_id': db_id,
                    'db_name': db_name,
                    'type': 'artist'
                })
            else:
                not_found.append((url, f"артист '{name}' не найден"))

    conn.close()

    # Режим вывода редиректов
    if args.redirects:
        print("# Редиректы для Navidrome (nginx map directive)")
        print("# Добавить в http block (ДО server block) для qirim.online")
        print("# ВАЖНО: nginx декодирует URL до матчинга, поэтому используем $uri с декодированными путями")
        print()
        print("map $uri $redirect_target {")
        print("    default '';")

        all_found = found_albums + found_artists
        seen_paths = set()  # Для удаления дубликатов

        for item in all_found:
            old_path = urllib.parse.urlparse(item['url']).path
            # Убираем /about если есть (для базового пути)
            base_path = re.sub(r'/about$', '', old_path)

            new_hash = f"/app/#/{item['type']}/{item['db_id']}/show"

            # nginx $uri декодирует percent-encoding, но НЕ декодирует + как пробел
            # Нужно 4 варианта:
            # 1. базовый путь с +
            # 2. базовый путь с пробелами
            # 3. путь с /about и +
            # 4. путь с /about и пробелами

            # Декодируем только percent-encoding (НЕ +)
            path_with_plus = urllib.parse.unquote(base_path)
            # Декодируем всё включая + -> пробел
            path_with_space = urllib.parse.unquote_plus(base_path)

            # Генерируем все 4 варианта
            variants = [
                path_with_plus,
                path_with_space,
                path_with_plus + "/about",
                path_with_space + "/about",
            ]

            for variant in variants:
                if variant not in seen_paths:
                    seen_paths.add(variant)
                    print(f'    "{variant}" "{new_hash}";')

        print("}")
        print()
        print("# Добавить в server block:")
        print("# if ($redirect_target != '') {")
        print("#     return 302 $redirect_target;")
        print("# }")
        return

    # Обычный вывод
    print("=" * 80)
    print(f"НАЙДЕННЫЕ АЛЬБОМЫ ({len(found_albums)}):")
    print("=" * 80)
    for item in found_albums:
        old_path = urllib.parse.urlparse(item['url']).path
        old_path = re.sub(r'/about$', '', old_path)
        new_path = f"/app/#/album/{item['db_id']}"
        print(f"  {item['db_name']}: {old_path} -> {new_path}")

    print()
    print("=" * 80)
    print(f"НАЙДЕННЫЕ АРТИСТЫ ({len(found_artists)}):")
    print("=" * 80)
    for item in found_artists:
        old_path = urllib.parse.urlparse(item['url']).path
        old_path = re.sub(r'/about$', '', old_path)
        new_path = f"/app/#/artist/{item['db_id']}"
        print(f"  {item['db_name']}: {old_path} -> {new_path}")

    if not_found:
        print()
        print("=" * 80)
        print(f"НЕ НАЙДЕНО ({len(not_found)}):")
        print("=" * 80)
        for url, reason in not_found:
            print(f"  {url}")
            print(f"    Причина: {reason}")

    # Итого
    print()
    print("=" * 80)
    print("ИТОГО:")
    print(f"  Найдено альбомов: {len(found_albums)}")
    print(f"  Найдено артистов: {len(found_artists)}")
    print(f"  Не найдено: {len(not_found)}")
    print("=" * 80)


if __name__ == "__main__":
    main()
