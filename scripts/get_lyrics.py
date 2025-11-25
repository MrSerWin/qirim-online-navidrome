import os
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE = "https://lyricstranslate.com"
LIST_URL = "https://lyricstranslate.com/ru/language/crimean-tatar-lyrics"
OUT_DIR = "lyrics_crh_lt"
os.makedirs(OUT_DIR, exist_ok=True)

# Создаем файл для логирования прогресса
PROGRESS_FILE = os.path.join(OUT_DIR, "_progress.txt")
downloaded = set()
if os.path.exists(PROGRESS_FILE):
    with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
        downloaded = set(line.strip() for line in f if line.strip())

def safe_name(s: str) -> str:
    """Очищает строку от запрещенных символов для имени файла"""
    bad = '\\/:*?"<>|'
    for ch in bad:
        s = s.replace(ch, "_")
    return s.strip()

def mark_downloaded(url: str):
    """Отмечает песню как скачанную"""
    with open(PROGRESS_FILE, "a", encoding="utf-8") as f:
        f.write(url + "\n")
    downloaded.add(url)

def get_songs_from_page(soup):
    """Извлекает список песен со страницы"""
    songs = []
    for row in soup.select("div.d-tr"):
        # Ищем ссылку на песню
        title_link = row.select_one(".stt a")
        if not title_link:
            continue

        title = title_link.get_text(strip=True)
        url = urljoin(BASE, title_link.get("href", ""))

        # Ищем исполнителя (в alt тега img или в .att)
        artist = "Unknown"
        img = row.select_one(".s-av img")
        if img:
            artist = img.get("alt", "Unknown")

        # Иногда исполнитель в отдельном элементе
        artist_el = row.select_one(".att a")
        if artist_el:
            artist = artist_el.get_text(strip=True)

        songs.append((artist, title, url))
    return songs

def get_next_page_url(soup):
    """Находит ссылку на следующую страницу"""
    next_link = soup.select_one(".pager-next a, li.next a, a[rel='next']")
    if next_link and next_link.get("href"):
        return urljoin(BASE, next_link["href"])
    return None

def download_lyrics(url, session):
    """Скачивает текст песни по URL"""
    try:
        r = session.get(url, timeout=10)
        r.raise_for_status()
        page = BeautifulSoup(r.text, "html.parser")

        # Пробуем разные селекторы для текста песни (в порядке приоритета)
        selectors = [
            "div#song-body",           # Основной текст песни
            "div.song-node-text",      # Альтернативный вариант
            "div.ltf-text",
            "div.lyrics",
            "div.field-name-body",
        ]

        lyrics_block = None
        for selector in selectors:
            lyrics_block = page.select_one(selector)
            if lyrics_block:
                break

        if not lyrics_block:
            return None, "Не найден блок с текстом песни"

        # Очищаем текст от лишних элементов
        for tag in lyrics_block.select("script, style, .advertisement"):
            tag.decompose()

        lyrics = lyrics_block.get_text("\n", strip=True)

        if not lyrics or len(lyrics) < 10:
            return None, "Текст песни пустой или слишком короткий"

        return lyrics, None
    except requests.RequestException as e:
        return None, f"Ошибка загрузки: {e}"
    except Exception as e:
        return None, f"Неожиданная ошибка: {e}"

# Главный цикл
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
})

all_songs = []
current_url = LIST_URL
page_num = 1

print("=" * 60)
print("Сканирование страниц со списком песен...")
print("=" * 60)

while current_url:
    print(f"\n[Страница {page_num}] {current_url}")
    try:
        resp = session.get(current_url, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        songs = get_songs_from_page(soup)
        all_songs.extend(songs)
        print(f"  Найдено песен: {len(songs)}")

        current_url = get_next_page_url(soup)
        page_num += 1
        time.sleep(1)  # Пауза между страницами
    except Exception as e:
        print(f"  Ошибка при загрузке страницы: {e}")
        break

print("\n" + "=" * 60)
print(f"Всего найдено песен: {len(all_songs)}")
print(f"Уже скачано: {len(downloaded)}")
print(f"Осталось скачать: {len([s for s in all_songs if s[2] not in downloaded])}")
print("=" * 60)

# Скачивание текстов песен
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

    lyrics, error = download_lyrics(url, session)

    if error:
        print(f"  ❌ ОШИБКА: {error}")
        error_count += 1
        time.sleep(0.5)
        continue

    # Сохраняем текст песни
    filename = f"{safe_name(artist)} - {safe_name(title)}.txt"
    filepath = os.path.join(OUT_DIR, filename)

    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"# {artist} - {title}\n")
            f.write(f"# URL: {url}\n\n")
            f.write(lyrics)

        mark_downloaded(url)
        success_count += 1
        print(f"  ✓ Сохранено: {filename}")
    except Exception as e:
        print(f"  ❌ Ошибка при сохранении: {e}")
        error_count += 1

    time.sleep(1.5)  # Пауза между запросами

print("\n" + "=" * 60)
print("ЗАВЕРШЕНО!")
print(f"  Успешно скачано: {success_count}")
print(f"  Ошибок: {error_count}")
print(f"  Пропущено (уже были): {skip_count}")
print(f"  Всего песен: {len(all_songs)}")
print(f"\nТексты сохранены в папку: {OUT_DIR}/")
print("=" * 60)
