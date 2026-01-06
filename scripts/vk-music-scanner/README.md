# VK Music Scanner

Скрипты для поиска и скачивания новой музыки с VK для артистов из Navidrome.

## Требования

- Python 3.10+
- ffmpeg (для тегирования MP3)

## Установка

```bash
cd scripts/vk-music-scanner
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
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

## Использование

### 1. Поиск новых треков

```bash
source venv/bin/activate
python3 find_new_tracks.py
```

Сканирует VK для артистов из Navidrome DB и сохраняет найденные треки в `new_tracks_found.json`.

### 2. Скачивание треков

```bash
python3 download_new_tracks.py
```

Скачивает треки из `new_tracks_found.json` в папки артистов, устанавливает теги и обложку.

## Конфигурация (config.json)

```json
{
  "vk": {
    "token": "vk1.a.xxx..."  // Kate Mobile токен
  },
  "settings": {
    "min_track_duration_sec": 60,  // Минимальная длительность трека
    "max_tracks_per_artist": 50    // Макс. треков на артиста при поиске
  },
  "ignore": {
    "artists": ["Diger", "Güneş"],     // Игнорируемые артисты
    "tracks": [                         // Игнорируемые треки
      {"artist": "ADA", "title": "Y"}
    ]
  }
}
```

## Игнор-лист

Скрипт автоматически пропускает:
1. **Артистов из ignore.artists** — не будут искаться на VK
2. **Треки из ignore.tracks** — конкретные песни
3. **Ранее скачанные** — хранятся в `download_history.json`

Если удалил трек после прослушивания — он не будет скачан снова.

## Файлы

| Файл | Описание |
|------|----------|
| `find_new_tracks.py` | Поиск новых треков на VK |
| `download_new_tracks.py` | Скачивание и тегирование |
| `get_kate_token.py` | Получение VK токена |
| `scan_vk_music.py` | Полный сканер (всё в одном) |
| `config.json` | Конфигурация |
| `download_history.json` | История скачанных (автосоздаётся) |
| `new_tracks_found.json` | Найденные треки (автосоздаётся) |
