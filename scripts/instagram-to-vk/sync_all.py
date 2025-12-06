#!/usr/bin/env python3
"""
Полная синхронизация всех постов из Instagram в VK
Публикует по 1 посту каждый час пока не синхронизирует все

Использование:
    python sync_all.py                 # Запустить синхронизацию всех постов
    python sync_all.py --interval 30   # Интервал 30 минут между постами
    python sync_all.py --batch 2       # По 2 поста за раз
    python sync_all.py --dry-run       # Показать план без публикации
"""

import os
import sys
import time
import argparse
from datetime import datetime

# Добавляем текущую директорию в путь
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sync import InstagramToVKSync, log_info, log_success, log_error, log_warning


def sync_all_posts(interval_minutes: int = 60, batch_size: int = 1, dry_run: bool = False):
    """Синхронизировать все посты с интервалом"""

    sync = InstagramToVKSync()

    log_info("=" * 60)
    log_info("ПОЛНАЯ СИНХРОНИЗАЦИЯ Instagram → VK")
    log_info("=" * 60)
    log_info(f"Интервал между публикациями: {interval_minutes} мин")
    log_info(f"Постов за раз: {batch_size}")
    if dry_run:
        log_warning("РЕЖИМ ТЕСТИРОВАНИЯ (без реальной публикации)")
    log_info("")

    # Загружаем сессию Instagram
    if not sync.instagram.load_session():
        return

    # Проверяем VK
    if not sync.vk.check_connection():
        return

    # Получаем профиль
    profile = sync.instagram.get_profile()
    if not profile:
        return

    total_posts = profile.mediacount
    log_info(f"Всего постов в Instagram: {total_posts}")

    # Получаем ВСЕ посты (или много)
    log_info("Загружаю список постов...")
    all_posts = sync.instagram.get_recent_posts(profile, limit=total_posts)

    if not all_posts:
        log_error("Не удалось получить посты")
        return

    # Фильтруем уже опубликованные
    new_posts = [p for p in all_posts if not sync.tracker.is_published(p.shortcode)]

    if not new_posts:
        log_success("Все посты уже синхронизированы!")
        return

    # Сортируем от старых к новым
    new_posts.reverse()

    log_info(f"Новых постов для синхронизации: {len(new_posts)}")
    log_info("")

    if dry_run:
        log_info("Посты для синхронизации:")
        for i, post in enumerate(new_posts[:20], 1):  # Показываем первые 20
            log_info(f"  {i}. {post.shortcode} ({post.date_local.strftime('%Y-%m-%d')})")
        if len(new_posts) > 20:
            log_info(f"  ... и ещё {len(new_posts) - 20} постов")
        return

    # Синхронизируем с интервалом
    synced = 0
    total_to_sync = len(new_posts)

    log_info(f"Начинаю синхронизацию {total_to_sync} постов...")
    log_info(f"Примерное время завершения: {total_to_sync * interval_minutes // 60} часов")
    log_info("")

    i = 0
    while i < len(new_posts):
        batch = new_posts[i:i + batch_size]

        for post in batch:
            log_info("-" * 40)
            log_info(f"[{synced + 1}/{total_to_sync}] Публикую пост {post.shortcode}")

            if sync.sync_post(post, dry_run=False):
                synced += 1
                log_success(f"Опубликовано: {synced}/{total_to_sync}")
            else:
                log_warning(f"Не удалось опубликовать {post.shortcode}")

        i += batch_size

        # Если есть ещё посты - ждём
        if i < len(new_posts):
            next_time = datetime.now().strftime("%H:%M")
            wait_until = time.strftime("%H:%M", time.localtime(time.time() + interval_minutes * 60))
            log_info("")
            log_info(f"Жду {interval_minutes} минут до следующей публикации...")
            log_info(f"Следующая публикация в ~{wait_until}")
            log_info(f"(Нажми Ctrl+C чтобы остановить)")
            log_info("")

            try:
                time.sleep(interval_minutes * 60)
            except KeyboardInterrupt:
                log_warning("\nОстановлено пользователем")
                break

    # Итоги
    log_info("=" * 60)
    log_success(f"ЗАВЕРШЕНО! Синхронизировано: {synced} постов")
    stats = sync.tracker.get_stats()
    log_info(f"Всего опубликовано за всё время: {stats.get('total_synced', 0)}")


def main():
    parser = argparse.ArgumentParser(description='Полная синхронизация Instagram → VK')
    parser.add_argument('--interval', type=int, default=60,
                        help='Интервал между публикациями в минутах (по умолчанию: 60)')
    parser.add_argument('--batch', type=int, default=1,
                        help='Количество постов за раз (по умолчанию: 1)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Показать план без публикации')

    args = parser.parse_args()

    try:
        sync_all_posts(
            interval_minutes=args.interval,
            batch_size=args.batch,
            dry_run=args.dry_run
        )
    except KeyboardInterrupt:
        print("\n")
        log_warning("Остановлено пользователем")
        sys.exit(0)
    except Exception as e:
        log_error(f"Ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
