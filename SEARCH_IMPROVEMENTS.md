# Улучшения поиска в Navidrome

## 🎯 Проблема
Поиск песен работал только по точному совпадению слов с пробелами. Например:
- Песня: "Singer Name - song name"
- Поиск "song" или "song name" ничего не находил

## ✅ Решение

### 1. Конфигурация
Добавлена настройка `SearchFullString = true` в `navidrome.toml`:
```toml
# Search configuration
SearchFullString = true
```

### 2. Улучшенная функция поиска
Создана новая функция `enhancedSearchExpr()` в `persistence/sql_search.go`, которая:
- Ищет точные фразы (например, "song name")
- Ищет отдельные слова (например, "song" в "song name")
- Поддерживает поиск по содержимому полей

### 3. Обновленные репозитории
Улучшен поиск в:
- **MediaFile**: поиск по `title`, `album`, `album_artist`, `artist`
- **Album**: поиск по `name`, `album_artist`
- **Artist**: поиск по `name`

## 🔍 Как это работает

### Старый поиск:
- "song" → ищет `% song%` (с пробелом)
- "song name" → ищет `% song name%` (точное совпадение)

### Новый поиск:
- "song" → ищет:
  - `%song%` в full_text
  - `%song%` в title
  - `%song%` в album
  - `%song%` в album_artist
  - `%song%` в artist
- "song name" → ищет:
  - `%song name%` (точная фраза)
  - `%song%` И `%name%` (оба слова)

## 🚀 Результат
Теперь поиск находит песни по частичному совпадению:
- ✅ "song" найдет "Singer Name - song name"
- ✅ "name" найдет "Singer Name - song name"
- ✅ "singer" найдет "Singer Name - song name"
- ✅ "song name" найдет "Singer Name - song name"

## 📝 Файлы изменены:
1. `navidrome.toml` - добавлена настройка SearchFullString
2. `persistence/sql_search.go` - улучшена функция fullTextExpr и добавлена enhancedSearchExpr
3. `persistence/mediafile_repository.go` - улучшен поиск песен
4. `persistence/album_repository.go` - улучшен поиск альбомов
5. `persistence/artist_repository.go` - улучшен поиск исполнителей

## 🧪 Тестирование
После перезапуска Navidrome поиск должен работать значительно лучше!
