# Instagram to VK Sync

Скрипт для автоматической синхронизации постов из Instagram в VK группу.

## Установка

```bash
cd scripts/instagram-to-vk

# Создать виртуальное окружение
python3 -m venv venv
source venv/bin/activate

# Установить зависимости
pip install -r requirements.txt
```

## Настройка

### 1. Создать конфиг

```bash
cp config.example.json config.json
```

### 2. Заполнить config.json

```json
{
    "instagram": {
        "username": "qirim.online",           // Аккаунт для парсинга
        "session_username": "YOUR_LOGIN"       // Ваш логин для авторизации
    },
    "vk": {
        "access_token": "YOUR_TOKEN",          // VK API токен
        "group_id": 139603784                  // ID группы (без минуса)
    }
}
```

### 3. Получить VK токен (Kate Mobile)

**Рекомендуемый способ** — используй Kate Mobile OAuth:

```bash
cd ../vk-music-scanner
source venv/bin/activate
python3 get_kate_token.py
```

1. Откроется браузер с VK OAuth
2. Залогинься и разреши доступ Kate Mobile
3. Скопируй токен из URL после редиректа
4. Вставь в `config.json` → `vk.access_token`

**Примечание:** Токен действует ~24 часа. При ошибке `invalid access_token` — получи новый

### 4. Авторизоваться в Instagram

```bash
python sync.py --login
```

Введите пароль — сессия сохранится в `session/` и будет использоваться без повторного логина.

## Использование

```bash
# Активировать окружение
source venv/bin/activate

# Проверить подключения
python sync.py --check

# Посмотреть что будет опубликовано (без публикации)
python sync.py --dry-run

# Синхронизировать новые посты
python sync.py

# Принудительно опубликовать конкретный пост
python sync.py --force ABC123xyz
```

## Автоматический запуск (cron)

```bash
crontab -e
```

Добавить (запуск в 10:00 и 18:00):
```cron
0 10,18 * * * cd /path/to/scripts/instagram-to-vk && ./venv/bin/python sync.py >> sync.log 2>&1
```

## Файлы

```
instagram-to-vk/
├── sync.py              # Основной скрипт
├── config.json          # Конфигурация (не коммитить!)
├── config.example.json  # Пример конфига
├── requirements.txt     # Зависимости Python
├── published.json       # База опубликованных постов
├── session/             # Сохранённые сессии Instagram
├── downloads/           # Временные файлы (автоочистка)
└── README.md
```

## Логика работы

1. Загружает сохранённую сессию Instagram (без логина)
2. Получает последние 50 постов из @qirim.online
3. Фильтрует уже опубликованные (по `published.json`)
4. Для каждого нового поста:
   - Скачивает медиа (фото/видео)
   - Форматирует подпись + добавляет хештеги
   - Загружает в VK
   - Публикует пост в группу
   - Записывает в `published.json`
5. Очищает временные файлы

## Безопасность

- Сессия Instagram хранится локально, не требует постоянного логина
- VK токен с ограниченными правами
- `config.json` добавлен в `.gitignore`
