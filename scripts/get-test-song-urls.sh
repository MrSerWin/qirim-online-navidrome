#!/bin/bash

# Скрипт для получения тестовых URL песен для SEO страниц
# Запускать на сервере: ./scripts/get-test-song-urls.sh

DB_PATH="${1:-/opt/navidrome/data/navidrome.db}"
BASE_URL="https://qirim.online"

echo "=== Песни С текстами (для тестирования /song/{id}) ==="
echo ""

printf "SELECT id, title, artist FROM media_file WHERE lyrics <> '[]' AND length(lyrics) > 5 LIMIT 7;" | sqlite3 "$DB_PATH" | while IFS='|' read -r id title artist; do
    echo "📝 $title — $artist"
    echo "   ${BASE_URL}/song/${id}"
    echo ""
done

echo ""
echo "=== Песни БЕЗ текстов ==="
echo ""

printf "SELECT id, title, artist FROM media_file WHERE lyrics = '[]' OR lyrics IS NULL LIMIT 3;" | sqlite3 "$DB_PATH" | while IFS='|' read -r id title artist; do
    echo "🎵 $title — $artist"
    echo "   ${BASE_URL}/song/${id}"
    echo ""
done

echo ""
echo "=== Статистика ==="
TOTAL=$(printf "SELECT count(*) FROM media_file;" | sqlite3 "$DB_PATH")
WITH_LYRICS=$(printf "SELECT count(*) FROM media_file WHERE lyrics <> '[]' AND length(lyrics) > 5;" | sqlite3 "$DB_PATH")
echo "Всего песен: $TOTAL"
echo "С текстами: $WITH_LYRICS"
