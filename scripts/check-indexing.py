#!/usr/bin/env python3
"""
Скрипт для проверки индексации сайтов в поисковых системах.
Показывает количество проиндексированных страниц в Google и Яндекс.

Использование:
    python3 check-indexing.py
    python3 check-indexing.py qirim.online ana-yurt.com
"""

import sys
import urllib.request
import urllib.parse
import re
import json
from typing import Optional, Dict, List
import ssl

# Отключаем проверку SSL для простоты
ssl._create_default_https_context = ssl._create_unverified_context

SITES = ["qirim.online", "ana-yurt.com"]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
}


def check_google_index(domain: str) -> Optional[str]:
    """Проверяет индексацию в Google через site: запрос."""
    try:
        query = urllib.parse.quote(f"site:{domain}")
        url = f"https://www.google.com/search?q={query}"

        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')

            # Ищем количество результатов
            # Формат: "Результатов: примерно 1 234"
            match = re.search(r'[Аа]bout\s+([\d,\s]+)\s+results|[Рр]езультат[ов]*:\s*(?:примерно\s+)?([\d\s,]+)', html)
            if match:
                count = match.group(1) or match.group(2)
                return count.strip()

            # Если нет результатов
            if "did not match any documents" in html or "ничего не найдено" in html.lower():
                return "0"

            return "Не удалось определить"
    except Exception as e:
        return f"Ошибка: {str(e)}"


def check_yandex_index(domain: str) -> Optional[str]:
    """Проверяет индексацию в Яндекс через site: запрос."""
    try:
        query = urllib.parse.quote(f"site:{domain}")
        url = f"https://yandex.ru/search/?text={query}"

        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')

            # Ищем количество результатов
            # Формат: "Нашлось 123 результата" или "123 результата"
            match = re.search(r'[Нн]ашл[оа]сь\s+([\d\s]+)\s+результат|(\d+)\s+результат', html)
            if match:
                count = match.group(1) or match.group(2)
                return count.strip()

            if "ничего не найдено" in html.lower():
                return "0"

            return "Не удалось определить (возможна капча)"
    except Exception as e:
        return f"Ошибка: {str(e)}"


def check_bing_index(domain: str) -> Optional[str]:
    """Проверяет индексацию в Bing через site: запрос."""
    try:
        query = urllib.parse.quote(f"site:{domain}")
        url = f"https://www.bing.com/search?q={query}"

        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')

            # Ищем количество результатов
            match = re.search(r'([\d,]+)\s+results', html)
            if match:
                return match.group(1)

            if "no results" in html.lower():
                return "0"

            return "Не удалось определить"
    except Exception as e:
        return f"Ошибка: {str(e)}"


def get_alexa_rank(domain: str) -> Optional[str]:
    """Получает примерный рейтинг из открытых источников."""
    # Alexa закрыт, но можно использовать альтернативы
    return "N/A (сервис недоступен)"


def check_domain_age(domain: str) -> Optional[str]:
    """Пытается определить возраст домена."""
    try:
        # Используем whois через веб-сервис
        return "Требуется whois"
    except:
        return "N/A"


def print_report(sites: List[str]):
    """Выводит отчёт по индексации."""
    print("=" * 70)
    print("         ОТЧЁТ ПО ИНДЕКСАЦИИ САЙТОВ")
    print("=" * 70)
    print()

    for domain in sites:
        print(f"📊 {domain}")
        print("-" * 50)

        # Google
        google_count = check_google_index(domain)
        print(f"   Google:     {google_count or 'N/A'} страниц")

        # Yandex
        yandex_count = check_yandex_index(domain)
        print(f"   Яндекс:     {yandex_count or 'N/A'} страниц")

        # Bing
        bing_count = check_bing_index(domain)
        print(f"   Bing:       {bing_count or 'N/A'} страниц")

        print()

    print("=" * 70)
    print("РЕКОМЕНДАЦИИ:")
    print("-" * 70)
    print("""
1. Для точных данных используйте:
   - Google Search Console: https://search.google.com/search-console
   - Яндекс.Вебмастер: https://webmaster.yandex.ru
   - Bing Webmaster Tools: https://www.bing.com/webmasters

2. Если страниц проиндексировано мало:
   - Проверьте robots.txt (не блокирует ли индексацию)
   - Добавьте sitemap.xml
   - Отправьте URL на индексацию вручную

3. Для улучшения индексации:
   - Регулярно добавляйте новый контент
   - Получайте внешние ссылки с авторитетных сайтов
   - Убедитесь, что сайт быстро загружается
""")


def main():
    sites = sys.argv[1:] if len(sys.argv) > 1 else SITES
    print_report(sites)


if __name__ == "__main__":
    main()
