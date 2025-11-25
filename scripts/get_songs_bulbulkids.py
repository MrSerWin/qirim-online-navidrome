import os
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, unquote
import re

BASE = "https://www.bulbulkids.com.ua"
LIST_URL = "https://www.bulbulkids.com.ua/ru/songs/vsi-pisni#songs"
OUT_DIR = "songs_bulbulkids"
os.makedirs(OUT_DIR, exist_ok=True)

# Файл для логирования скачанных песен
PROGRESS_FILE = os.path.join(OUT_DIR, "_progress.txt")
downloaded = set()
if os.path.exists(PROGRESS_FILE):
    with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
        downloaded = set(line.strip() for line in f if line.strip())

def safe_name(s: str) -> str:
    """Очищает строку от запрещенных символов для имени файла"""
    bad = '\\/:*?"<>|«»'
    for ch in bad:
        s = s.replace(ch, "_")
    return s.strip()

def mark_downloaded(url: str):
    """Отмечает песню как скачанную"""
    with open(PROGRESS_FILE, "a", encoding="utf-8") as f:
        f.write(url + "\n")
    downloaded.add(url)

def extract_songs_from_page(soup):
    """Извлекает список песен со страницы"""
    songs = []

    # Находим все аудиоплееры
    audio_players = soup.find_all("div", class_=lambda x: x and "audio-player" in x)

    for player in audio_players:
        # Ищем название песни
        title_elem = player.find("h5", class_="audio-player-title")
        if not title_elem:
            continue

        title_text = title_elem.get_text(strip=True)

        # Название часто в формате: «Латиница» «Кириллица»
        # Разделяем и берем обе версии
        parts = re.findall(r'«([^»]+)»', title_text)
        if len(parts) >= 2:
            title_latin = parts[0].strip()
            title_cyrillic = parts[1].strip()
            title = f"{title_latin} ({title_cyrillic})"
        elif len(parts) == 1:
            title = parts[0].strip()
        else:
            title = title_text

        # Ищем исполнителя в параграфах
        artist = "Unknown"
        for p in player.find_all("p"):
            text = p.get_text(strip=True)
            # Ищем строку вида "Исполнитель: ..."
            match = re.search(r'Исполнитель:\s*(.+)', text)
            if match:
                artist = match.group(1).strip()
                break

        # Ищем ссылку на MP3
        source = player.find("source", {"type": "audio/mpeg"})
        if not source or not source.get("src"):
            continue

        mp3_url = source["src"]
        # Декодируем URL-кодированные символы
        mp3_url = unquote(mp3_url)
        # Делаем абсолютный URL
        mp3_url = urljoin(BASE, mp3_url)

        songs.append((artist, title, mp3_url))

    return songs

def download_song(url, filepath, session):
    """Скачивает MP3 файл"""
    try:
        response = session.get(url, stream=True, timeout=30)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))
        downloaded_size = 0

        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded_size += len(chunk)

        return True, None

    except requests.RequestException as e:
        return False, f"Ошибка загрузки: {e}"
    except Exception as e:
        return False, f"Неожиданная ошибка: {e}"

# Главный цикл
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
})

print("=" * 60)
print("Получение списка песен с bulbulkids.com.ua...")
print("=" * 60)

try:
    resp = session.get(LIST_URL, timeout=10)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    all_songs = extract_songs_from_page(soup)
    print(f"\nВсего найдено песен: {len(all_songs)}")
    print(f"Уже скачано: {len(downloaded)}")
    print(f"Осталось скачать: {len([s for s in all_songs if s[2] not in downloaded])}")

except Exception as e:
    print(f"Ошибка при загрузке страницы: {e}")
    exit(1)

print("=" * 60)

# Скачивание песен
success_count = 0
error_count = 0
skip_count = 0

for i, (artist, title, url) in enumerate(all_songs, 1):
    # Пропускаем уже скачанные
    if url in downloaded:
        skip_count += 1
        print(f"[{i}/{len(all_songs)}] ПРОПУЩЕНО: {artist} - {title}")
        continue

    print(f"\n[{i}/{len(all_songs)}] {artist} - {title}")
    print(f"  URL: {url}")

    # Формируем имя файла
    filename = f"{safe_name(artist)} - {safe_name(title)}.mp3"
    filepath = os.path.join(OUT_DIR, filename)

    # Скачиваем
    success, error = download_song(url, filepath, session)

    if not success:
        print(f"  ❌ ОШИБКА: {error}")
        error_count += 1
        # Удаляем частично скачанный файл
        if os.path.exists(filepath):
            os.remove(filepath)
        time.sleep(0.5)
        continue

    # Проверяем размер файла
    file_size = os.path.getsize(filepath)
    if file_size < 1000:  # Меньше 1 KB - вероятно ошибка
        print(f"  ❌ ОШИБКА: Файл слишком маленький ({file_size} bytes)")
        os.remove(filepath)
        error_count += 1
        continue

    # Преобразуем размер в удобный формат
    size_kb = file_size / 1024
    size_mb = size_kb / 1024

    if size_mb >= 1:
        size_str = f"{size_mb:.2f} MB"
    else:
        size_str = f"{size_kb:.2f} KB"

    mark_downloaded(url)
    success_count += 1
    print(f"  ✓ Скачано: {filename} ({size_str})")

    time.sleep(1)  # Пауза между скачиваниями

print("\n" + "=" * 60)
print("ЗАВЕРШЕНО!")
print(f"  Успешно скачано: {success_count}")
print(f"  Ошибок: {error_count}")
print(f"  Пропущено (уже были): {skip_count}")
print(f"  Всего песен: {len(all_songs)}")
print(f"\nПесни сохранены в папку: {OUT_DIR}/")
print("=" * 60)
