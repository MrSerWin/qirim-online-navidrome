import os
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import re

BASE = "https://qmusic.at.ua"
LIST_URL = "https://qmusic.at.ua/forum/2-37-1"
OUT_DIR = "lyrics_qmusic"
os.makedirs(OUT_DIR, exist_ok=True)

# Файл для логирования обработанных страниц
PROGRESS_FILE = os.path.join(OUT_DIR, "_progress.txt")
processed_pages = set()
if os.path.exists(PROGRESS_FILE):
    with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
        processed_pages = set(line.strip() for line in f if line.strip())

def safe_name(s: str) -> str:
    """Очищает строку от запрещенных символов для имени файла"""
    bad = '\\/:*?"<>|'
    for ch in bad:
        s = s.replace(ch, "_")
    # Ограничиваем длину имени
    s = s.strip()
    if len(s) > 100:
        s = s[:100]
    return s

def mark_processed(page_url: str):
    """Отмечает страницу как обработанную"""
    with open(PROGRESS_FILE, "a", encoding="utf-8") as f:
        f.write(page_url + "\n")
    processed_pages.add(page_url)

def extract_song_title(text):
    """Извлекает название песни из текста"""
    # Ищем заголовки типа "НАЗВАНИЕ ПЕСНИ" или "Исполнитель - Название"
    lines = text.strip().split('\n')
    for line in lines[:5]:  # Смотрим первые 5 строк
        line = line.strip()
        # Если строка короткая и содержит латиницу или кириллицу
        if line and 10 < len(line) < 80:
            # Убираем HTML теги
            line = re.sub(r'<[^>]+>', '', line)
            # Если это похоже на заголовок (заглавные буквы или жирный текст)
            if line.isupper() or line[0].isupper():
                return line

    # Если не нашли явный заголовок, берем первые слова
    first_line = lines[0].strip() if lines else "Unknown"
    first_line = re.sub(r'<[^>]+>', '', first_line)
    words = first_line.split()[:5]
    return ' '.join(words) if words else "Unknown"

def extract_lyrics_from_posts(soup):
    """Извлекает тексты песен из постов на странице"""
    lyrics_list = []

    # Находим все посты с текстами песен
    posts = soup.find_all("span", class_="ucoz-forum-post")

    for post in posts:
        text = post.get_text("\n", strip=False)

        # Пропускаем короткие посты (это, скорее всего, комментарии)
        if len(text) < 100:
            continue

        # Пропускаем посты, которые содержат только ссылки или служебную информацию
        if "Добавлено" in text and len(text) < 300:
            continue

        # Разбиваем по "Добавлено" (это маркер начала новой песни в том же посте)
        parts = re.split(r'Добавлено.*?-----+', text, flags=re.DOTALL)

        for part in parts:
            part = part.strip()
            if len(part) < 50:
                continue

            # Очищаем от лишних пробелов
            lines = [line.strip() for line in part.split('\n') if line.strip()]
            clean_text = '\n'.join(lines)

            # Извлекаем название
            title = extract_song_title(clean_text)

            # Пропускаем, если это не похоже на текст песни
            if "библиотека" in clean_text.lower() or "форум" in clean_text.lower()[:100]:
                continue

            lyrics_list.append((title, clean_text))

    return lyrics_list

def get_next_page_url(soup, current_page_num):
    """Находит ссылку на следующую страницу"""
    # Формат пагинации: /forum/2-37-1, /forum/2-37-2, и т.д.
    next_page_num = current_page_num + 1
    next_url = f"/forum/2-37-{next_page_num}"

    # Проверяем, есть ли такая ссылка на странице
    for a in soup.find_all("a", href=True):
        if next_url in a["href"]:
            return urljoin(BASE, a["href"])

    return None

# Главный цикл
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
})

all_lyrics = []
current_url = LIST_URL
page_num = 1

print("=" * 60)
print("Сканирование страниц форума...")
print("=" * 60)

# Собираем все тексты песен со всех страниц
while current_url and page_num <= 50:  # Защита от бесконечного цикла
    if current_url in processed_pages:
        print(f"\n[Страница {page_num}] ПРОПУЩЕНО: уже обработана")
        page_num += 1
        current_url = f"{BASE}/forum/2-37-{page_num}"
        continue

    print(f"\n[Страница {page_num}] {current_url}")

    try:
        resp = session.get(current_url, timeout=10)

        if resp.status_code == 404:
            print(f"  Страница не найдена (404). Завершаем.")
            break

        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # Проверяем, есть ли посты на странице
        posts = soup.find_all("span", class_="ucoz-forum-post")
        if not posts:
            print(f"  Нет постов на странице. Завершаем.")
            break

        lyrics = extract_lyrics_from_posts(soup)
        all_lyrics.extend(lyrics)
        print(f"  Найдено текстов: {len(lyrics)}")

        mark_processed(current_url)

        # Ищем следующую страницу
        next_url = get_next_page_url(soup, page_num)
        if not next_url:
            print(f"  Следующая страница не найдена. Завершаем.")
            break

        current_url = next_url
        page_num += 1
        time.sleep(1.5)  # Пауза между страницами

    except requests.HTTPError as e:
        if e.response.status_code == 404:
            print(f"  Страница не найдена (404). Завершаем.")
            break
        print(f"  Ошибка HTTP: {e}")
        break
    except Exception as e:
        print(f"  Ошибка при загрузке страницы: {e}")
        break

print("\n" + "=" * 60)
print(f"Всего найдено текстов: {len(all_lyrics)}")
print("=" * 60)

# Сохранение текстов песен
success_count = 0
error_count = 0
song_counter = 1

for title, lyrics in all_lyrics:
    # Создаем уникальное имя файла
    filename = f"{song_counter:03d} - {safe_name(title)}.txt"
    filepath = os.path.join(OUT_DIR, filename)

    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"# {title}\n")
            f.write(f"# Источник: https://qmusic.at.ua/forum/2-37-1\n\n")
            f.write(lyrics)

        success_count += 1
        print(f"[{song_counter}/{len(all_lyrics)}] ✓ Сохранено: {filename}")
        song_counter += 1

    except Exception as e:
        print(f"[{song_counter}/{len(all_lyrics)}] ❌ Ошибка при сохранении {filename}: {e}")
        error_count += 1
        song_counter += 1

print("\n" + "=" * 60)
print("ЗАВЕРШЕНО!")
print(f"  Успешно скачано: {success_count}")
print(f"  Ошибок: {error_count}")
print(f"  Всего текстов: {len(all_lyrics)}")
print(f"\nТексты сохранены в папку: {OUT_DIR}/")
print("=" * 60)
