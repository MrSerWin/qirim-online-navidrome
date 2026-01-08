#!/bin/bash

# Генератор sitemap.xml для qirim.online
# Использует API Navidrome для получения списка альбомов и артистов

set -e

OUTPUT_FILE="${1:-sitemap.xml}"
SITE_URL="https://qirim.online"
DATE=$(date +%Y-%m-%d)

echo "Генерация sitemap.xml для $SITE_URL..."

cat > "$OUTPUT_FILE" << 'HEADER'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
HEADER

# Статические страницы
STATIC_PAGES=(
    "/"
    "/app/"
)

for PAGE in "${STATIC_PAGES[@]}"; do
    cat >> "$OUTPUT_FILE" << EOF
  <url>
    <loc>${SITE_URL}${PAGE}</loc>
    <lastmod>${DATE}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
EOF
done

# Примечание: Для динамических страниц (альбомы, артисты)
# нужно либо использовать API Navidrome, либо парсить базу данных
# Пример добавления динамических URL:

# Если у вас есть доступ к базе данных SQLite:
# DB_PATH="/path/to/navidrome.db"
# if [ -f "$DB_PATH" ]; then
#     # Альбомы
#     sqlite3 "$DB_PATH" "SELECT id, name FROM album" | while IFS='|' read -r id name; do
#         cat >> "$OUTPUT_FILE" << EOF
#   <url>
#     <loc>${SITE_URL}/app/#/album/${id}</loc>
#     <lastmod>${DATE}</lastmod>
#     <changefreq>monthly</changefreq>
#     <priority>0.8</priority>
#   </url>
# EOF
#     done
#
#     # Артисты
#     sqlite3 "$DB_PATH" "SELECT id, name FROM artist" | while IFS='|' read -r id name; do
#         cat >> "$OUTPUT_FILE" << EOF
#   <url>
#     <loc>${SITE_URL}/app/#/artist/${id}</loc>
#     <lastmod>${DATE}</lastmod>
#     <changefreq>monthly</changefreq>
#     <priority>0.7</priority>
#   </url>
# EOF
#     done
# fi

echo "</urlset>" >> "$OUTPUT_FILE"

echo "✓ Sitemap создан: $OUTPUT_FILE"
echo "  Статических страниц: ${#STATIC_PAGES[@]}"

# Валидация XML
if command -v xmllint &> /dev/null; then
    if xmllint --noout "$OUTPUT_FILE" 2>/dev/null; then
        echo "✓ XML валиден"
    else
        echo "✗ Ошибка валидации XML"
    fi
fi

echo ""
echo "Следующие шаги:"
echo "  1. Скопируйте $OUTPUT_FILE в ui/build/ или настройте в nginx"
echo "  2. Добавьте ссылку в robots.txt: Sitemap: ${SITE_URL}/sitemap.xml"
echo "  3. Отправьте sitemap в Google Search Console и Яндекс.Вебмастер"
