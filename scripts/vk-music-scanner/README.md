# VK Music Scanner

Автоматическая синхронизация музыки из VK в библиотеку Navidrome с дедупликацией на основе аудио-анализа.

## Быстрый старт

```bash
cd /Volumes/T9/1_dev/1_QO/myQO/navidrome/scripts/vk-music-scanner

# Полный цикл (интерактивный режим)
python3 sync_vk_music.py

# Полностью автоматический режим
python3 sync_vk_music.py --auto
```

## Структура

```
vk-music-scanner/
├── sync_vk_music.py          # Главный скрипт (объединяет все этапы)
├── find_new_tracks.py        # Поиск новых треков в VK
├── download_new_tracks.py    # Скачивание треков
├── deduplicate_tracks.py     # Дедупликация с аудио-fingerprint
├── transliterate_wrapper.js  # Обёртка для cyr2lat.js
├── config.json               # Конфигурация (токены, игнор-лист)
├── downloads/                # Временная папка для скачанных треков
├── Upload/                   # Треки готовые к загрузке в библиотеку
└── *.json                    # Логи и отчёты
```

## Этапы синхронизации

### 1. Сканирование VK
Ищет новые треки у отслеживаемых артистов в VK.

```bash
python3 sync_vk_music.py --scan-only
# или отдельно:
python3 find_new_tracks.py
```

Результат: `new_tracks_found.json`

### 2. Скачивание
Скачивает найденные треки в `downloads/Artist_Name/`.

```bash
python3 sync_vk_music.py --download-only
# или отдельно:
python3 download_new_tracks.py
```

### 3. Дедупликация
Сравнивает скачанные треки с библиотекой используя:
- Транслитерацию имён (cyr2lat.js)
- Сравнение длительности (ffprobe)
- Аудио-fingerprint (chromaprint/fpcalc)

```bash
python3 sync_vk_music.py --dedup-only
# или отдельно:
python3 deduplicate_tracks.py
```

**Пороги:**
- 70+ баллов = дубликат (пропускается)
- 50-70 баллов = неопределённо (в `_UNCERTAIN/`)
- <50 баллов = уникальный (в `Upload/`)

### 4. Ручная проверка
Проверить папку `Upload/` и удалить ненужные треки.

### 5. Перемещение в библиотеку
```bash
python3 sync_vk_music.py --move-only
```

Копирует из `Upload/Artist/` в `/Volumes/T9/MyOneDrive/Media/Music/Музыка/QirimTatar/Artist/`

### 6. Обновление тегов
Автоматически запускает `update-music-tags.sh` для каждого артиста.

## Конфигурация

### config.json

```json
{
    "vk": {
        "auth_method": "vkpymusic",
        "login": "...",
        "password": "...",
        "token": "..."
    },
    "telegram": {
        "bot_token": "...",
        "chat_id": "..."
    },
    "navidrome": {
        "db_path": "/opt/navidrome/data/navidrome.db",
        "music_dir": "/music"
    },
    "settings": {
        "check_interval_hours": 24,
        "min_track_duration_sec": 60,
        "max_tracks_per_artist": 50,
        "download_bitrate": 320
    },
    "ignore": {
        "artists": ["Artist1", "Artist2"],
        "tracks": [
            {"artist": "Artist", "title": "Track"}
        ]
    }
}
```

### Игнор-лист

Добавить артиста в игнор:
```json
"ignore": {
    "artists": ["Diger", "Güneş", "OsMan"]
}
```

Добавить конкретный трек:
```json
"ignore": {
    "tracks": [
        {"artist": "DEEP HOUSE", "title": "Some Track"}
    ]
}
```

## Режимы запуска

| Команда | Описание |
|---------|----------|
| `python3 sync_vk_music.py` | Полный цикл (интерактивный) |
| `python3 sync_vk_music.py --auto` | Полный цикл (автоматический) |
| `python3 sync_vk_music.py --scan-only` | Только сканирование VK |
| `python3 sync_vk_music.py --download-only` | Только скачивание |
| `python3 sync_vk_music.py --dedup-only` | Только дедупликация |
| `python3 sync_vk_music.py --move-only` | Только перемещение в библиотеку |
| `python3 sync_vk_music.py --no-cleanup` | Без очистки временных файлов |

## Зависимости

### Python
```bash
pip3 install vkpymusic requests
```

### Системные
```bash
# macOS
brew install ffmpeg chromaprint node

# Проверка
ffprobe -version
fpcalc -version
node --version
```

## Файлы данных

| Файл | Описание |
|------|----------|
| `new_tracks_found.json` | Найденные новые треки |
| `download_history.json` | История скачанных треков |
| `downloaded_tracks.json` | Лог последнего скачивания |
| `dedup_report.json` | Отчёт дедупликации |
| `sync_log.json` | Лог последней синхронизации |

## Алгоритм дедупликации

Система присваивает баллы за совпадение:

| Критерий | Макс. баллы |
|----------|-------------|
| Название трека (fuzzy match) | 40 |
| Имя артиста (fuzzy match) | 30 |
| Длительность (±3 сек) | 20 |
| Аудио-fingerprint (≥70%) | 30 |

**Всего: до 120 баллов**

- **≥70 баллов** → дубликат
- **50-70 баллов** → требует проверки
- **<50 баллов** → уникальный трек

## Типичный workflow

```bash
# 1. Запустить полный цикл
python3 sync_vk_music.py

# 2. Проверить Upload/
ls -la Upload/

# 3. Удалить ненужное
rm -rf Upload/BadArtist/

# 4. Подтвердить перенос (скрипт спросит)
# или принудительно:
python3 sync_vk_music.py --move-only

# 5. Готово! Треки в библиотеке с обновлёнными тегами
```

## Troubleshooting

### VK токен истёк
```
Ошибка: Invalid token
```
Решение: Обновить `token` в `config.json`

### fpcalc не найден
```bash
brew install chromaprint
```

### Ошибка транслитерации
```bash
# Проверить wrapper
node transliterate_wrapper.js "Тест"
# Должно вывести: Test
```

### Слишком много дубликатов
Проверить пороги в `sync_vk_music.py`:
```python
DURATION_TOLERANCE = 3.0      # секунды
FINGERPRINT_THRESHOLD = 0.7   # 70%
NAME_SIMILARITY_THRESHOLD = 0.6  # 60%
```

## Получение VK токена

```bash
source venv/bin/activate
python3 get_kate_token.py
```

1. Откроется браузер с VK OAuth
2. Залогинься и разреши доступ
3. Скопируй URL после редиректа
4. Вставь токен в `config.json` → `vk.token`
