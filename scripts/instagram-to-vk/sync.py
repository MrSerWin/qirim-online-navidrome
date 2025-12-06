#!/usr/bin/env python3
"""
Instagram to VK Sync Script
Синхронизация постов из Instagram в VK группу

Использование:
    python sync.py                    # Синхронизировать новые посты
    python sync.py --login            # Залогиниться в Instagram и сохранить сессию
    python sync.py --check            # Проверить подключение
    python sync.py --dry-run          # Показать что будет опубликовано (без публикации)
    python sync.py --force POST_ID    # Принудительно опубликовать конкретный пост
"""

import os
import sys
import json
import time
import hashlib
import argparse
import requests
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any

import instaloader

# Пути
SCRIPT_DIR = Path(__file__).parent
CONFIG_FILE = SCRIPT_DIR / "config.json"
PUBLISHED_FILE = SCRIPT_DIR / "published.json"
SESSION_DIR = SCRIPT_DIR / "session"
DOWNLOAD_DIR = SCRIPT_DIR / "downloads"

# Цвета для вывода
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def log(message: str, color: str = Colors.RESET):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"{color}[{timestamp}] {message}{Colors.RESET}")

def log_success(message: str):
    log(f"✓ {message}", Colors.GREEN)

def log_warning(message: str):
    log(f"⚠ {message}", Colors.YELLOW)

def log_error(message: str):
    log(f"✗ {message}", Colors.RED)

def log_info(message: str):
    log(f"→ {message}", Colors.BLUE)


class Config:
    """Загрузка и управление конфигурацией"""

    def __init__(self):
        if not CONFIG_FILE.exists():
            log_error(f"Конфиг не найден: {CONFIG_FILE}")
            log_info(f"Скопируйте config.example.json в config.json и заполните")
            sys.exit(1)

        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            self.data = json.load(f)

        self.instagram = self.data['instagram']
        self.vk = self.data['vk']
        self.settings = self.data['settings']


class PublishedTracker:
    """Отслеживание опубликованных постов"""

    def __init__(self):
        self.published: Dict[str, Any] = {}
        self.load()

    def load(self):
        if PUBLISHED_FILE.exists():
            with open(PUBLISHED_FILE, 'r', encoding='utf-8') as f:
                self.published = json.load(f)
        else:
            self.published = {"posts": {}, "stats": {"total_synced": 0, "last_sync": None}}

    def save(self):
        self.published["stats"]["last_sync"] = datetime.now().isoformat()
        with open(PUBLISHED_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.published, f, ensure_ascii=False, indent=2)

    def is_published(self, post_id: str) -> bool:
        return post_id in self.published.get("posts", {})

    def mark_published(self, post_id: str, vk_post_id: int, caption: str):
        self.published["posts"][post_id] = {
            "vk_post_id": vk_post_id,
            "published_at": datetime.now().isoformat(),
            "caption_preview": caption[:100] if caption else ""
        }
        self.published["stats"]["total_synced"] = len(self.published["posts"])
        self.save()

    def get_stats(self) -> Dict:
        return self.published.get("stats", {})


class InstagramClient:
    """Клиент для работы с Instagram через instaloader"""

    def __init__(self, config: Config):
        self.config = config
        self.loader = instaloader.Instaloader(
            download_videos=config.settings.get('download_videos', True),
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
            post_metadata_txt_pattern='',
            max_connection_attempts=3,
            request_timeout=60,
            rate_controller=lambda q: instaloader.RateController(q)
        )
        self.session_file = SESSION_DIR / f"session-{config.instagram['session_username']}"
        self._logged_in = False

    def login(self):
        """Интерактивный логин и сохранение сессии"""
        SESSION_DIR.mkdir(exist_ok=True)

        username = self.config.instagram['session_username']
        log_info(f"Логин в Instagram как {username}...")

        try:
            password = input("Введите пароль: ")
            self.loader.login(username, password)
            self.loader.save_session_to_file(str(self.session_file))
            log_success(f"Сессия сохранена в {self.session_file}")
            self._logged_in = True
        except instaloader.exceptions.TwoFactorAuthRequiredException:
            log_warning("Требуется двухфакторная аутентификация (2FA)")
            log_info("")
            log_info("К сожалению, автоматический 2FA не работает с текущей версией Instagram API.")
            log_info("Используйте импорт сессии из браузера Firefox:")
            log_info("")
            log_info("1. Залогиньтесь в Instagram через Firefox")
            log_info("2. Выполните команду:")
            log_info(f"   instaloader --login {username} --sessionfile {self.session_file}")
            log_info("")
            log_info("Или импортируйте cookies из Firefox:")
            log_info(f"   instaloader -l {username} --sessionfile {self.session_file}")
            log_info("")
            sys.exit(1)
        except Exception as e:
            log_error(f"Ошибка логина: {e}")
            sys.exit(1)

    def import_session_from_browser(self):
        """Импорт сессии из Firefox"""
        SESSION_DIR.mkdir(exist_ok=True)
        username = self.config.instagram['session_username']

        log_info("Импорт сессии из Firefox...")
        log_info("Убедитесь что вы залогинены в Instagram через Firefox")

        try:
            # Пробуем импортировать из Firefox
            self.loader.load_session_from_file(username)
            self.loader.save_session_to_file(str(self.session_file))
            log_success(f"Сессия импортирована и сохранена в {self.session_file}")
            self._logged_in = True
        except Exception as e:
            log_error(f"Ошибка импорта: {e}")
            log_info("")
            log_info("Попробуйте вручную через терминал:")
            log_info(f"  instaloader -l {username}")
            log_info("")
            sys.exit(1)

    def load_session(self) -> bool:
        """Загрузка сохранённой сессии"""
        if not self.session_file.exists():
            log_warning(f"Сессия не найдена: {self.session_file}")
            log_info("Запустите: python sync.py --login")
            return False

        try:
            self.loader.load_session_from_file(
                self.config.instagram['session_username'],
                str(self.session_file)
            )
            log_success("Сессия Instagram загружена")
            self._logged_in = True
            return True
        except Exception as e:
            log_error(f"Ошибка загрузки сессии: {e}")
            return False

    def get_profile(self) -> Optional[instaloader.Profile]:
        """Получить профиль для парсинга"""
        try:
            profile = instaloader.Profile.from_username(
                self.loader.context,
                self.config.instagram['username']
            )
            log_success(f"Профиль загружен: @{profile.username} ({profile.mediacount} постов)")
            return profile
        except instaloader.exceptions.ProfileNotExistsException:
            log_error(f"Профиль @{self.config.instagram['username']} не найден")
            return None
        except instaloader.exceptions.LoginRequiredException:
            log_error("Instagram требует логин. Запустите: python sync.py --login")
            return None
        except Exception as e:
            log_error(f"Ошибка получения профиля: {e}")
            return None

    def get_recent_posts(self, profile: instaloader.Profile, limit: int = 20) -> List[instaloader.Post]:
        """Получить последние посты с обработкой rate limiting"""
        posts = []
        retry_count = 0
        max_retries = 3

        try:
            log_info(f"Загружаю посты (лимит: {limit})...")

            post_iterator = profile.get_posts()

            for i, post in enumerate(post_iterator):
                if i >= limit:
                    break

                try:
                    posts.append(post)
                    log_info(f"  Загружен пост {i+1}/{limit}: {post.shortcode}")
                except instaloader.exceptions.QueryReturnedBadRequestException:
                    if retry_count < max_retries:
                        retry_count += 1
                        wait_time = 60 * retry_count  # 1 мин, 2 мин, 3 мин
                        log_warning(f"Rate limit. Жду {wait_time} сек... (попытка {retry_count}/{max_retries})")
                        time.sleep(wait_time)
                        continue
                    else:
                        raise

            log_success(f"Получено {len(posts)} постов")

        except instaloader.exceptions.QueryReturnedBadRequestException as e:
            log_error(f"Instagram заблокировал запрос (401/400).")
            log_info("Возможные решения:")
            log_info("  1. Подождите 15-30 минут и попробуйте снова")
            log_info("  2. Перелогиньтесь: python sync.py --login")
            log_info("  3. Используйте VPN/прокси")
        except instaloader.exceptions.ConnectionException as e:
            log_error(f"Ошибка подключения: {e}")
            log_info("Проверьте интернет-соединение")
        except Exception as e:
            log_error(f"Ошибка получения постов: {e}")

        return posts

    def download_post_media(self, post: instaloader.Post) -> List[Path]:
        """Скачать медиа из поста"""
        DOWNLOAD_DIR.mkdir(exist_ok=True)

        media_files = []
        post_dir = DOWNLOAD_DIR / post.shortcode
        post_dir.mkdir(exist_ok=True)

        try:
            self.loader.download_post(post, target=post_dir)

            # Собираем скачанные файлы
            for file in post_dir.iterdir():
                if file.suffix.lower() in ['.jpg', '.jpeg', '.png', '.mp4', '.mov']:
                    media_files.append(file)

            log_info(f"Скачано {len(media_files)} файлов для поста {post.shortcode}")
        except instaloader.exceptions.QueryReturnedBadRequestException:
            log_error(f"Rate limit при скачивании {post.shortcode}. Подождите и попробуйте снова.")
        except Exception as e:
            log_error(f"Ошибка скачивания: {e}")

        return media_files


class VKClient:
    """Клиент для публикации в VK через прямые HTTP запросы"""

    API_URL = "https://api.vk.com/method"

    def __init__(self, config: Config):
        self.config = config
        self.group_id = config.vk['group_id']
        self.access_token = config.vk['access_token']
        self.api_version = config.vk.get('api_version', '5.199')

    def _call_api(self, method: str, params: Dict = None) -> Dict:
        """Вызов VK API метода"""
        if params is None:
            params = {}
        params['access_token'] = self.access_token
        params['v'] = self.api_version

        response = requests.get(f"{self.API_URL}/{method}", params=params)
        data = response.json()

        if 'error' in data:
            raise Exception(f"[{data['error']['error_code']}] {data['error']['error_msg']}")

        return data.get('response', data)

    def check_connection(self) -> bool:
        """Проверить подключение к VK"""
        try:
            # Проверяем пользователя
            user_info = self._call_api('users.get')
            log_success(f"VK пользователь: {user_info[0]['first_name']} {user_info[0]['last_name']}")

            # Проверяем группу
            group_info = self._call_api('groups.getById', {'group_id': self.group_id})
            log_success(f"VK группа: {group_info['groups'][0]['name']}")
            return True
        except Exception as e:
            log_error(f"Ошибка подключения к VK: {e}")
            return False

    def upload_photos(self, photo_paths: List[Path]) -> List[str]:
        """Загрузить фотографии на стену группы"""
        attachments = []

        for photo_path in photo_paths:
            if photo_path.suffix.lower() not in ['.jpg', '.jpeg', '.png']:
                continue

            try:
                # 1. Получить URL для загрузки
                upload_server = self._call_api('photos.getWallUploadServer', {
                    'group_id': self.group_id
                })
                upload_url = upload_server['upload_url']

                # 2. Загрузить фото
                with open(photo_path, 'rb') as f:
                    response = requests.post(upload_url, files={'file1': (photo_path.name, f, 'image/jpeg')})
                upload_result = response.json()

                # Проверяем результат загрузки
                if not upload_result.get('photo') or upload_result.get('photo') == '[]':
                    log_error(f"VK не принял фото: {upload_result}")
                    continue

                # 3. Сохранить фото
                saved = self._call_api('photos.saveWallPhoto', {
                    'group_id': self.group_id,
                    'photo': upload_result['photo'],
                    'server': upload_result['server'],
                    'hash': upload_result['hash']
                })

                for photo in saved:
                    attachments.append(f"photo{photo['owner_id']}_{photo['id']}")
                log_info(f"Загружено фото: {photo_path.name}")

            except Exception as e:
                log_error(f"Ошибка загрузки фото {photo_path}: {e}")

        return attachments

    def upload_video(self, video_path: Path, title: str = "Video") -> Optional[str]:
        """Загрузить видео"""
        try:
            # 1. Получить URL для загрузки
            upload_server = self._call_api('video.save', {
                'group_id': self.group_id,
                'name': title,
                'is_private': 0
            })
            upload_url = upload_server['upload_url']

            # 2. Загрузить видео
            with open(video_path, 'rb') as f:
                response = requests.post(upload_url, files={'video_file': f})

            result = response.json()
            attachment = f"video{result['owner_id']}_{result['video_id']}"
            log_info(f"Загружено видео: {video_path.name}")
            return attachment

        except Exception as e:
            log_error(f"Ошибка загрузки видео {video_path}: {e}")
            return None

    def create_post(self, message: str, attachments: List[str]) -> Optional[int]:
        """Создать пост в группе"""
        try:
            response = self._call_api('wall.post', {
                'owner_id': -self.group_id,
                'from_group': 1,
                'message': message,
                'attachments': ",".join(attachments)
            })
            post_id = response['post_id']
            log_success(f"Опубликован пост VK: https://vk.com/wall-{self.group_id}_{post_id}")
            return post_id
        except Exception as e:
            log_error(f"Ошибка публикации поста: {e}")
            return None


class InstagramToVKSync:
    """Основной класс синхронизации"""

    def __init__(self):
        self.config = Config()
        self.tracker = PublishedTracker()
        self.instagram = InstagramClient(self.config)
        self.vk = VKClient(self.config)

    def format_caption(self, original_caption: str) -> str:
        """Форматировать подпись для VK"""
        caption = original_caption or ""

        # Добавить дефолтные хештеги если их нет
        default_tags = self.config.settings.get('default_hashtags', '')
        website = self.config.settings.get('website_link', '')

        # Проверяем какие хештеги уже есть
        existing_tags = set(tag.lower() for tag in caption.split() if tag.startswith('#'))
        new_tags = []
        for tag in default_tags.split():
            if tag.lower() not in existing_tags:
                new_tags.append(tag)

        # Собираем финальный текст
        parts = [caption.strip()]

        if new_tags:
            parts.append("\n\n" + " ".join(new_tags))

        if website:
            parts.append(f"\n\n🎵 {website}")

        return "".join(parts)

    def sync_post(self, post: instaloader.Post, dry_run: bool = False) -> bool:
        """Синхронизировать один пост"""
        post_id = post.shortcode

        if self.tracker.is_published(post_id):
            log_info(f"Пост {post_id} уже опубликован, пропускаем")
            return False

        log_info(f"Обработка поста: {post_id} ({post.date_local})")

        # Форматируем подпись
        caption = self.format_caption(post.caption or "")

        if dry_run:
            log_info(f"[DRY RUN] Пост {post_id}:")
            print(f"  Тип: {'видео' if post.is_video else 'фото'}")
            print(f"  Дата: {post.date_local}")
            print(f"  Подпись: {caption[:200]}...")
            return True

        # Скачиваем медиа
        media_files = self.instagram.download_post_media(post)
        if not media_files:
            log_warning(f"Нет медиа для поста {post_id}")
            return False

        # Загружаем в VK
        attachments = []

        # Фото
        photo_files = [f for f in media_files if f.suffix.lower() in ['.jpg', '.jpeg', '.png']]
        if photo_files:
            attachments.extend(self.vk.upload_photos(photo_files))

        # Видео
        video_files = [f for f in media_files if f.suffix.lower() in ['.mp4', '.mov']]
        for video_file in video_files:
            video_attachment = self.vk.upload_video(video_file, post.caption[:50] if post.caption else "Video")
            if video_attachment:
                attachments.append(video_attachment)

        if not attachments:
            log_warning(f"Нет аттачментов для поста {post_id}")
            return False

        # Публикуем
        vk_post_id = self.vk.create_post(caption, attachments)
        if vk_post_id:
            self.tracker.mark_published(post_id, vk_post_id, post.caption or "")

            # Очищаем скачанные файлы
            self._cleanup_downloads(post_id)

            return True

        return False

    def _cleanup_downloads(self, post_id: str):
        """Удалить скачанные файлы после публикации"""
        post_dir = DOWNLOAD_DIR / post_id
        if post_dir.exists():
            import shutil
            shutil.rmtree(post_dir)
            log_info(f"Очищена папка: {post_dir}")

    def run(self, dry_run: bool = False, force_post_id: Optional[str] = None):
        """Запуск синхронизации"""
        log_info("=" * 50)
        log_info("Instagram → VK Sync")
        log_info("=" * 50)

        # Загружаем сессию Instagram
        if not self.instagram.load_session():
            return

        # Проверяем VK
        if not self.vk.check_connection():
            return

        # Получаем профиль
        profile = self.instagram.get_profile()
        if not profile:
            return

        # Получаем посты
        max_posts = self.config.settings.get('max_posts_per_run', 5)
        posts = self.instagram.get_recent_posts(profile, limit=max_posts)

        # Если указан конкретный пост
        if force_post_id:
            posts = [p for p in posts if p.shortcode == force_post_id]
            if not posts:
                log_error(f"Пост {force_post_id} не найден")
                return

        # Фильтруем уже опубликованные
        new_posts = [p for p in posts if not self.tracker.is_published(p.shortcode)]

        if not new_posts:
            log_success("Нет новых постов для синхронизации")
            return

        log_info(f"Найдено {len(new_posts)} новых постов")

        # Синхронизируем (от старых к новым)
        new_posts.reverse()
        synced = 0

        for post in new_posts[:max_posts]:
            if self.sync_post(post, dry_run=dry_run):
                synced += 1
                if not dry_run:
                    time.sleep(2)  # Пауза между публикациями

        # Статистика
        stats = self.tracker.get_stats()
        log_info("=" * 50)
        log_success(f"Синхронизировано: {synced} постов")
        log_info(f"Всего опубликовано: {stats.get('total_synced', 0)}")
        log_info(f"Последняя синхронизация: {stats.get('last_sync', 'никогда')}")

    def check(self):
        """Проверка подключений"""
        log_info("Проверка подключений...")

        # Instagram
        if self.instagram.load_session():
            profile = self.instagram.get_profile()
            if profile:
                log_success(f"Instagram: @{profile.username}")

        # VK
        self.vk.check_connection()

        # Статистика
        stats = self.tracker.get_stats()
        log_info(f"Опубликовано постов: {stats.get('total_synced', 0)}")


def main():
    parser = argparse.ArgumentParser(description='Instagram to VK Sync')
    parser.add_argument('--login', action='store_true', help='Залогиниться в Instagram')
    parser.add_argument('--check', action='store_true', help='Проверить подключения')
    parser.add_argument('--dry-run', action='store_true', help='Показать что будет опубликовано')
    parser.add_argument('--force', type=str, help='Принудительно опубликовать пост по shortcode')

    args = parser.parse_args()

    sync = InstagramToVKSync()

    if args.login:
        sync.instagram.login()
    elif args.check:
        sync.check()
    else:
        sync.run(dry_run=args.dry_run, force_post_id=args.force)


if __name__ == '__main__':
    main()
