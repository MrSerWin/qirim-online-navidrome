# URL Aliases для Navidrome

## 🎯 Цель
Добавить поддержку красивых URL с алиасами вместо UUID, сохраняя обратную совместимость.

## 📝 Примеры

### До (UUID):
```
https://domain.com/app/#/album/41ytcXCHaVedt68ikZ6H7d/show
https://domain.com/app/#/artist/2f8c8b8e-1234-5678-9abc-def012345678/show
https://domain.com/app/#/song/1a2b3c4d-5678-9abc-def0-123456789012/show
```

### После (Алиасы):
```
https://domain.com/app/#/album/the-beatles-abbey-road/show
https://domain.com/app/#/artist/the-beatles/show
https://domain.com/app/#/song/the-beatles-come-together/show
```

### Обратная совместимость:
Оба варианта будут работать:
- ✅ `https://domain.com/app/#/album/41ytcXCHaVedt68ikZ6H7d/show`
- ✅ `https://domain.com/app/#/album/the-beatles-abbey-road/show`

## 🏗️ Архитектура

### 1. Модели данных
Добавлены поля `URLAlias` в:
- `model/album.go` - `URLAlias string`
- `model/artist.go` - `URLAlias string`  
- `model/mediafile.go` - `URLAlias string`

### 2. База данных
Миграция `20251017000002_add_url_aliases.go` добавляет:
- Колонку `url_alias VARCHAR(255)` в таблицы `media_file`, `album`, `artist`
- Индексы для быстрого поиска по алиасам

### 3. Генерация алиасов
Утилита `utils/url_alias.go` содержит функции:
- `GenerateURLAlias()` - основная функция генерации
- `GenerateAlbumAlias()` - для альбомов (формат: "artist-name-album-name")
- `GenerateArtistAlias()` - для артистов
- `GenerateSongAlias()` - для песен (формат: "artist-name-song-title")

### 4. API
- Native API поддерживает поиск по алиасам
- Middleware `URLAliasMiddleware` (заготовка для будущей реализации)
- Автоматическое разрешение алиасов в ID

### 5. Frontend
- Утилита `ui/src/utils/urlGenerator.js` для генерации URL
- Обновленные компоненты используют алиасы в ссылках
- Поддержка как ID, так и алиасов

## 🔧 Функции генерации алиасов

### Правила генерации:
1. **Конвертация в lowercase**
2. **Замена специальных символов:**
   - `&` → `and`
   - `+` → `plus`
   - `@` → `at`
   - `#` → `hash`
   - `%` → `percent`
   - `*` → `star`
   - `|` → `or`
   - `/` → `-`
   - `=` → `equals`
   - Удаление: `()[]{}\\<>?!"'`~^$.,;:`

3. **Обработка пробелов:**
   - Множественные пробелы → один пробел
   - Пробелы → дефисы

4. **Очистка:**
   - Удаление множественных дефисов
   - Удаление дефисов в начале/конце
   - Ограничение длины до 100 символов

### Примеры генерации:
```
"The Beatles - Abbey Road" → "the-beatles-abbey-road"
"AC/DC - Highway to Hell" → "ac-dc-highway-to-hell"
"Queen & David Bowie" → "queen-and-david-bowie"
"Led Zeppelin (Remastered)" → "led-zeppelin-remastered"
```

## 🚀 Использование

### Backend (Go):
```go
import "github.com/navidrome/navidrome/utils"

// Генерация алиаса для альбома
alias := utils.GenerateAlbumAlias("Abbey Road", "The Beatles")
// Результат: "the-beatles-abbey-road"

// Генерация алиаса для артиста
alias := utils.GenerateArtistAlias("The Beatles")
// Результат: "the-beatles"

// Генерация алиаса для песни
alias := utils.GenerateSongAlias("Come Together", "The Beatles")
// Результат: "the-beatles-come-together"
```

### Frontend (JavaScript):
```javascript
import { generateAlbumURL, generateArtistURL } from './utils/urlGenerator'

// Генерация URL для альбома
const albumURL = generateAlbumURL(albumId, albumAlias, 'show')
// Результат: "/album/the-beatles-abbey-road/show" или "/album/{id}/show"

// Генерация URL для артиста
const artistURL = generateArtistURL(artistId, artistAlias, 'show')
// Результат: "/artist/the-beatles/show" или "/artist/{id}/show"
```

## 📁 Измененные файлы

### Backend:
1. `model/album.go` - добавлено поле `URLAlias`
2. `model/artist.go` - добавлено поле `URLAlias`
3. `model/mediafile.go` - добавлено поле `URLAlias`
4. `utils/url_alias.go` - функции генерации алиасов
5. `db/migrations/20251017000002_add_url_aliases.go` - миграция БД
6. `server/nativeapi/url_alias_middleware.go` - middleware для разрешения алиасов
7. `server/nativeapi/native_api.go` - обновленные маршруты

### Frontend:
1. `ui/src/utils/urlGenerator.js` - утилиты для генерации URL
2. `ui/src/song/AlbumLinkField.jsx` - обновлен для использования алиасов
3. `ui/src/audioplayer/AudioTitle.jsx` - обновлен для использования алиасов

## 🔄 Миграция данных

При первом запуске после обновления:
1. Миграция автоматически добавит колонки `url_alias`
2. Создаст индексы для быстрого поиска
3. Сгенерирует алиасы для существующих записей

## 🎯 Преимущества

1. **SEO-friendly URLs** - поисковые системы лучше индексируют понятные URL
2. **Читаемость** - пользователи понимают, что находится по ссылке
3. **Поделиться** - красивые ссылки выглядят профессионально
4. **Обратная совместимость** - старые ссылки продолжают работать
5. **Уникальность** - система гарантирует уникальность алиасов

## 🔮 Будущие улучшения

1. **Полная реализация middleware** - эффективное разрешение алиасов
2. **Автоматическая генерация** - создание алиасов при добавлении новых записей
3. **Настройки** - возможность включения/отключения алиасов
4. **Кэширование** - кэш для быстрого разрешения алиасов
5. **Персонализация** - возможность настройки формата алиасов

## 🧪 Тестирование

После применения миграции:
1. Перезапустите Navidrome
2. Проверьте, что старые URL работают
3. Проверьте, что новые URL с алиасами работают
4. Убедитесь, что поиск работает корректно

## 📋 TODO

- [ ] Реализовать полную функциональность middleware
- [ ] Добавить автоматическую генерацию алиасов при создании записей
- [ ] Добавить настройки для включения/отключения алиасов
- [ ] Добавить кэширование для производительности
- [ ] Добавить тесты для функций генерации алиасов
