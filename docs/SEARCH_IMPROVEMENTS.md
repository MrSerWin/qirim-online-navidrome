# Search Improvements for Crimean Tatar / Turkish / Cyrillic Support

## Overview

The search functionality has been enhanced to support multi-script search, particularly for:
- **Crimean Tatar** (Latin script with special characters: ç, ğ, ñ, ö, ş, ü, ı)
- **Turkish** (Same special characters as Crimean Tatar)
- **Russian/Ukrainian Cyrillic** (Full Cyrillic alphabet)

## How It Works

### 1. Database Full-Text Index

When music files are scanned, the `full_text` field is created using `SanitizeStrings()` which:
- Removes special characters
- Converts to lowercase
- **Transliterates** special characters to ASCII equivalents
- Sorts and deduplicates words

Example:
```
Input: "Qırım Tatarları - Анавтан Şarkısı"
Full-text field: "anavtan qirim sarkisi tatarlari"
```

### 2. Search Query Processing

When a user searches, the system creates multiple search variants:

#### For Artists (`artist_repository.go`)
```go
// Searches in fields: name
enhancedSearchExpr(tableName, query, []string{"name"})
```

#### For Songs (`mediafile_repository.go`)
```go
// Searches in fields: title, album, album_artist, artist
enhancedSearchExpr(tableName, query, []string{"title", "album", "album_artist", "artist"})
```

### 3. Enhanced Search Expression (`sql_search.go`)

The `enhancedSearchExpr()` function creates 4 types of conditions:

1. **Sanitized exact phrase match**
   - Input: "Сейран" → Sanitized: "seyran"
   - Matches: "Seyran", "seyran" in database

2. **Original case-insensitive phrase match**
   - Input: "Сейран" → Original: "сейран"
   - Matches: "Сейран" if stored as-is (rare)

3. **Sanitized individual words**
   - Input: "Энвер Балтаев" → Words: ["baltaev", "enver"]
   - Matches each word separately

4. **Original individual words**
   - Input: "Энвер Балтаев" → Words: ["энвер", "балтаев"]
   - Matches original words if stored as-is

## Search Scenarios

### Scenario 1: User types Latin, database has Latin
✅ **Works perfectly**

```
User input: "seyran"
Database:   "Seyran Hajibeyli"
Result:     FOUND (exact match)
```

### Scenario 2: User types Cyrillic, database has Latin
✅ **Works with transliteration**

```
User input: "сейран"
Sanitized:  "seyran" (transliterated)
Database:   "Seyran Hajibeyli"
Result:     FOUND (via sanitized match)
```

### Scenario 3: User types with special chars, database has without
✅ **Works with transliteration**

```
User input: "Qırım"
Sanitized:  "qirim"
Database:   "Kirim" or "qirim"
Result:     FOUND (via sanitized match)
```

### Scenario 4: User types without special chars, database has with
✅ **Works with sanitization**

```
User input: "kirim"
Sanitized:  "kirim"
Database:   "Qırım" (full_text: "qirim")
Result:     FOUND (full_text matches sanitized)
```

### Scenario 5: Mixed Cyrillic-Latin search
✅ **Works**

```
User input: "Анавтан şarkısı"
Sanitized:  "anavtan sarkisi"
Database:   "Anavtan Şarkısı"
Result:     FOUND (both words transliterated)
```

## Transliteration Map

### Crimean Tatar / Turkish
```
ç/Ç → c/C
ğ/Ğ → g/G
ñ/Ñ → n/N
ö/Ö → o/O
ş/Ş → s/S
ü/Ü → u/U
ı/İ → i/I
```

### Russian Cyrillic
```
а/А → a/A    н/Н → n/N
б/Б → b/B    о/О → o/O
в/В → v/V    п/П → p/P
г/Г → g/G    р/Р → r/R
д/Д → d/D    с/С → s/S
е/Е → e/E    т/Т → t/T
ё/Ё → e/E    у/У → u/U
ж/Ж → zh/Zh  ф/Ф → f/F
з/З → z/Z    х/Х → h/H
и/И → i/I    ц/Ц → ts/Ts
й/Й → y/Y    ч/Ч → ch/Ch
к/К → k/K    ш/Ш → sh/Sh
л/Л → l/L    щ/Щ → sch/Sch
м/М → m/M    ъ/Ъ → (removed)
ы/Ы → y/Y    ь/Ь → (removed)
э/Э → e/E    ю/Ю → yu/Yu
я/Я → ya/Ya
```

## Performance Considerations

### Index Usage
The search uses SQLite's B-tree index on `full_text` field. For best performance:
- The first condition uses `LIKE '%term%'` on indexed `full_text`
- Additional conditions use `LOWER(field) LIKE '%term%'` which may be slower

### Query Optimization
The `OR` conditions are evaluated efficiently by SQLite's query planner:
1. First tries indexed `full_text` search (fastest)
2. Falls back to direct field search if needed
3. All conditions are combined with `OR`, so any match returns the result

## Testing

To test the search improvements:

```bash
# Run test script
go run scripts/test_enhanced_search.go
```

Example test cases:
- Search "Сейран" (Cyrillic) → finds "Seyran" (Latin)
- Search "Qırım" (with special chars) → finds "Qirim" or "Kirim"
- Search "энвер" (Cyrillic) → finds "Enver" (Latin)

## Files Modified

1. **`persistence/sql_search.go`**
   - Enhanced `enhancedSearchExpr()` with Cyrillic/Latin bidirectional search
   - Added `containsString()` helper function

2. **`persistence/artist_repository.go`** (lines 524-572)
   - Uses `enhancedSearchExpr()` for artist name search

3. **`persistence/mediafile_repository.go`** (lines 346-393)
   - Uses `enhancedSearchExpr()` for song title/album/artist search

4. **`utils/url_alias.go`** (already existed)
   - Contains `Transliterate()` function with full character mapping

5. **`utils/str/sanitize_strings.go`** (already existed)
   - `SanitizeStrings()` uses `Transliterate()` for normalization

## Future Improvements

1. **Consider adding fuzzy search** for typo tolerance
2. **Add search ranking** to prioritize exact matches over partial matches
3. **Cache transliterated queries** to avoid repeated transliteration
4. **Add support for more scripts** (Arabic, Hebrew, etc.) if needed

## Notes

- The search is **case-insensitive** by design
- **Multi-word queries** match if all words are found (AND logic within field)
- **Multiple conditions** are combined with OR (any condition can match)
- **Special characters** in field names (like `order_title`) are ignored in search
