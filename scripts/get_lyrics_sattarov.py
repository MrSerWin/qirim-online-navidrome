import os
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import re

BASE = "http://sattarov.net"
LIST_URL = "http://sattarov.net/tatar/lyrics/"
OUT_DIR = "lyrics_sattarov"
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

    # Ищем все ссылки на песни
    for a in soup.find_all("a", href=True):
        href = a["href"]

        # Фильтруем ссылки на песни (формат: /tatar/lyrics/XXXX-tekst-pesni-название.html)
        if "/lyrics/" in href and "-tekst-pesni-" in href and href.endswith(".html"):
            # Избегаем комментариев
            if "#comment" in href:
                continue

            url = urljoin(BASE, href)

            # Извлекаем название из URL
            match = re.search(r'-tekst-pesni-(.+?)\.html', href)
            if match:
                title_slug = match.group(1)
                # Преобразуем slug в читаемое название
                title = title_slug.replace("-", " ").title()
            else:
                title = "Unknown"

            songs.append((title, url))

    return songs

def get_next_page_url(soup, current_page):
    """Находит ссылку на следующую страницу"""
    # Ищем навигацию по страницам
    for a in soup.find_all("a", href=True):
        href = a["href"]
        # Формат: /tatar/lyrics/page/N/
        if f"/lyrics/page/{current_page + 1}/" in href:
            return urljoin(BASE, href)
    return None

def download_lyrics(url, session):
    """Скачивает текст песни по URL"""
    try:
        r = session.get(url, timeout=10)
        r.encoding = 'windows-1251'  # Важно! Сайт использует windows-1251
        r.raise_for_status()
        page = BeautifulSoup(r.text, "html.parser")

        # Извлекаем заголовок песни из title или из breadcrumbs
        title = "Unknown"
        title_tag = page.find("title")
        if title_tag:
            title_text = title_tag.get_text()
            # Формат: "текст песни НАЗВАНИЕ »..."
            match = re.search(r'текст песни (.+?)\s*[»&]', title_text)
            if match:
                title = match.group(1).strip()

        # Ищем текст песни в <td class="news">
        lyrics_block = page.find("td", class_="news")

        if not lyrics_block:
            return None, None, "Не найден блок с текстом песни"

        # Удаляем лишние элементы (картинки, скрипты, рекламу)
        for tag in lyrics_block.select("img, script, style, .advertisement"):
            tag.decompose()

        # Получаем текст
        lyrics = lyrics_block.get_text("\n", strip=True)

        # Очищаем от лишних строк
        lines = [line.strip() for line in lyrics.split("\n") if line.strip()]
        lyrics = "\n".join(lines)

        if not lyrics or len(lyrics) < 20:
            return None, None, "Текст песни пустой или слишком короткий"

        return title, lyrics, None

    except requests.RequestException as e:
        return None, None, f"Ошибка загрузки: {e}"
    except Exception as e:
        return None, None, f"Неожиданная ошибка: {e}"

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

# Собираем все песни со всех страниц
while current_url and page_num <= 100:  # Защита от бесконечного цикла
    print(f"\n[Страница {page_num}] {current_url}")
    try:
        resp = session.get(current_url, timeout=10)
        resp.encoding = 'windows-1251'
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        songs = get_songs_from_page(soup)

        # Удаляем дубликаты
        unique_songs = []
        seen_urls = set()
        for title, url in songs:
            if url not in seen_urls:
                seen_urls.add(url)
                unique_songs.append((title, url))

        all_songs.extend(unique_songs)
        print(f"  Найдено песен: {len(unique_songs)}")

        # Ищем следующую страницу
        next_url = get_next_page_url(soup, page_num)
        if not next_url:
            # Пробуем вручную создать URL следующей страницы
            next_page_num = page_num + 1
            next_url = f"{LIST_URL}page/{next_page_num}/"

            # Проверяем, существует ли страница
            test_resp = session.head(next_url, timeout=5)
            if test_resp.status_code != 200:
                print(f"  Следующая страница не найдена. Завершаем.")
                break

        current_url = next_url
        page_num += 1
        time.sleep(1)  # Пауза между страницами

    except Exception as e:
        print(f"  Ошибка при загрузке страницы: {e}")
        break

# Удаляем полные дубликаты из общего списка
unique_all_songs = []
seen_all_urls = set()
for title, url in all_songs:
    if url not in seen_all_urls:
        seen_all_urls.add(url)
        unique_all_songs.append((title, url))
all_songs = unique_all_songs

print("\n" + "=" * 60)
print(f"Всего найдено песен: {len(all_songs)}")
print(f"Уже скачано: {len(downloaded)}")
print(f"Осталось скачать: {len([s for s in all_songs if s[1] not in downloaded])}")
print("=" * 60)

# Скачивание текстов песен
success_count = 0
error_count = 0
skip_count = 0

for i, (title_slug, url) in enumerate(all_songs, 1):
    # Пропускаем уже скачанные
    if url in downloaded:
        skip_count += 1
        print(f"[{i}/{len(all_songs)}] ПРОПУЩЕНО: {title_slug}")
        continue

    print(f"\n[{i}/{len(all_songs)}] {title_slug}")
    print(f"  URL: {url}")

    title, lyrics, error = download_lyrics(url, session)

    if error:
        print(f"  ❌ ОШИБКА: {error}")
        error_count += 1
        time.sleep(0.5)
        continue

    # Используем извлеченный заголовок, если он есть
    if not title or title == "Unknown":
        title = title_slug

    # Сохраняем текст песни
    filename = f"{safe_name(title)}.txt"
    filepath = os.path.join(OUT_DIR, filename)

    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"# {title}\n")
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
