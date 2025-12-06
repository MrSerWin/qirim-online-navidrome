#!/usr/bin/env python3
"""
Импорт Instagram сессии из cookies браузера
"""

import pickle
import os
from pathlib import Path

SESSION_DIR = Path(__file__).parent / "session"

def import_from_cookies():
    """Создать файл сессии из cookies"""

    print("=" * 50)
    print("Импорт Instagram сессии из Chrome cookies")
    print("=" * 50)
    print()
    print("Инструкция:")
    print("1. Установи расширение EditThisCookie в Chrome")
    print("2. Зайди на instagram.com (залогинься если нужно)")
    print("3. Открой EditThisCookie и найди следующие cookies:")
    print("   - sessionid (ОБЯЗАТЕЛЬНО)")
    print("   - csrftoken")
    print("   - ds_user_id")
    print("   - mid")
    print()

    username = input("Введи username Instagram аккаунта: ").strip()
    if not username:
        print("Username не может быть пустым!")
        return

    print()
    print("Теперь введи значения cookies (просто нажми Enter если нет):")
    print()

    sessionid = input("sessionid: ").strip()
    if not sessionid:
        print("sessionid обязателен!")
        return

    csrftoken = input("csrftoken: ").strip() or ""
    ds_user_id = input("ds_user_id: ").strip() or ""
    mid = input("mid: ").strip() or ""

    # Создаём структуру сессии для instaloader
    session_data = {
        'sessionid': sessionid,
        'csrftoken': csrftoken,
        'ds_user_id': ds_user_id,
        'mid': mid,
        'ig_pr': '1',
        'ig_vw': '1920',
        'ig_cb': '1',
        's_network': '',
        'ig_did': ''
    }

    # Убираем пустые значения
    session_data = {k: v for k, v in session_data.items() if v}

    # Сохраняем
    SESSION_DIR.mkdir(exist_ok=True)
    session_file = SESSION_DIR / f"session-{username}"

    with open(session_file, 'wb') as f:
        pickle.dump(session_data, f)

    print()
    print(f"✅ Сессия сохранена в: {session_file}")
    print()
    print("Теперь можно запустить:")
    print("  python sync.py --check")
    print()

if __name__ == "__main__":
    import_from_cookies()
