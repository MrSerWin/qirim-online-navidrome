#!/bin/bash
#
# Скрипт обновления мета-тегов аудио файлов
# Автоматически устанавливает Artist и Album на основе названия папки
# Title берется из имени файла
# Турецкие буквы транслитерируются для совместимости с ID3v1
#
# Использование:
#   ./scripts/update-music-tags.sh "/путь/к/папке/с/музыкой"
#   ./scripts/update-music-tags.sh "/Volumes/T9/MyOneDrive/Media/Music/Музыка/QirimTatar/Qırım Yankısı"
#

set -e

# Цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Функция транслитерации турецких букв для ID3v1
transliterate_turkish() {
    local text="$1"
    # Заменяем турецкие буквы на английские аналоги
    text="${text//ı/i}"  # ı → i
    text="${text//İ/I}"  # İ → I
    text="${text//ş/s}"  # ş → s
    text="${text//Ş/S}"  # Ş → S
    text="${text//ğ/g}"  # ğ → g
    text="${text//Ğ/G}"  # Ğ → G
    text="${text//ç/c}"  # ç → c
    text="${text//Ç/C}"  # Ç → C
    text="${text//ö/o}"  # ö → o
    text="${text//Ö/O}"  # Ö → O
    text="${text//ü/u}"  # ü → u
    text="${text//Ü/U}"  # Ü → U
    echo "$text"
}

print_usage() {
    echo "Использование:"
    echo "  $0 <папка_с_музыкой>"
    echo ""
    echo "Примеры:"
    echo "  $0 '/path/to/music/Artist Name'"
    echo "  $0 '/Volumes/T9/MyOneDrive/Media/Music/Музыка/QirimTatar/Qırım Yankısı'"
    echo ""
    echo "Что делает скрипт:"
    echo "  - Artist и Album = название папки"
    echo "  - Title = имя файла без расширения"
    echo "  - Comment = https://qirim.online/"
    echo "  - Турецкие буквы транслитерируются для ID3v1"
    echo ""
    echo "Поддерживаемые форматы: mp3, flac, m4a, ogg, wav"
}

# Проверка наличия ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}Ошибка: ffmpeg не установлен${NC}"
    echo "Установите: brew install ffmpeg"
    exit 1
fi

# Проверка аргументов
if [ $# -eq 0 ]; then
    print_usage
    exit 1
fi

MUSIC_DIR="$1"

# Проверка существования папки
if [ ! -d "$MUSIC_DIR" ]; then
    echo -e "${RED}Ошибка: Папка '$MUSIC_DIR' не существует${NC}"
    exit 1
fi

# Получить название папки (Artist/Album)
FOLDER_NAME=$(basename "$MUSIC_DIR")
ARTIST_ALBUM="$FOLDER_NAME"
ARTIST_ALBUM_TRANSLITERATED=$(transliterate_turkish "$FOLDER_NAME")

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Обновление мета-тегов аудио файлов            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Папка: ${YELLOW}$MUSIC_DIR${NC}"
echo -e "Artist/Album: ${GREEN}$ARTIST_ALBUM${NC}"
echo -e "Artist/Album (транслитерация): ${GREEN}$ARTIST_ALBUM_TRANSLITERATED${NC}"
echo ""

# Найти все аудио файлы
echo -e "${BLUE}Поиск аудио файлов...${NC}"
audio_files=$(find "$MUSIC_DIR" -maxdepth 1 -type f \( \
    -iname "*.mp3" -o \
    -iname "*.flac" -o \
    -iname "*.m4a" -o \
    -iname "*.ogg" -o \
    -iname "*.wav" \
\))

if [ -z "$audio_files" ]; then
    echo -e "${YELLOW}Нет аудио файлов для обработки${NC}"
    exit 0
fi

total=$(echo "$audio_files" | wc -l | tr -d ' ')
echo -e "${GREEN}Найдено файлов: $total${NC}"
echo ""

# Подтверждение (можно пропустить с флагом --yes или -y)
if [[ "$2" != "--yes" && "$2" != "-y" ]]; then
    echo -e "${YELLOW}Обновить теги для всех файлов? (y/n)${NC}"
    read -r confirmation
    if [[ ! "$confirmation" =~ ^[Yy]$ ]]; then
        echo "Отменено"
        exit 0
    fi
fi
echo ""

# Обработать каждый файл
current=0
updated=0
errors=0

while IFS= read -r file; do
    current=$((current + 1))

    # Получить имя файла без расширения
    filename=$(basename "$file")
    name="${filename%.*}"
    extension="${filename##*.}"

    # Транслитерировать название для Title
    title_transliterated=$(transliterate_turkish "$name")

    echo -e "${BLUE}[$current/$total]${NC} ${filename}"
    echo "  Title: $title_transliterated"

    # Временный файл для вывода
    temp_output="${file}.tmp.${extension}"

    # Обновить теги с помощью ffmpeg
    # -map 0 - копировать все потоки
    # -c copy - копировать без перекодирования
    # -id3v2_version 3 - использовать ID3v2.3 (более совместимо)
    # -metadata - установить теги

    if ffmpeg -i "$file" \
        -map 0 \
        -c copy \
        -id3v2_version 3 \
        -metadata artist="$ARTIST_ALBUM" \
        -metadata album_artist="$ARTIST_ALBUM" \
        -metadata album="$ARTIST_ALBUM" \
        -metadata title="$title_transliterated" \
        -metadata comment="https://qirim.online/" \
        "$temp_output" \
        -y -loglevel error 2>&1; then

        # Заменить оригинальный файл
        mv "$temp_output" "$file"
        echo -e "  ${GREEN}✓ Обновлено${NC}"
        updated=$((updated + 1))
    else
        echo -e "  ${RED}✗ Ошибка${NC}"
        errors=$((errors + 1))
        # Удалить временный файл если он был создан
        [ -f "$temp_output" ] && rm "$temp_output"
    fi
    echo ""
done <<< "$audio_files"

# Итоговая статистика
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Результаты                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Всего файлов: ${BLUE}$total${NC}"
echo -e "Обновлено: ${GREEN}$updated${NC}"
if [ $errors -gt 0 ]; then
    echo -e "Ошибок: ${RED}$errors${NC}"
fi
echo ""

if [ $updated -gt 0 ]; then
    echo -e "${GREEN}✓ Теги успешно обновлены!${NC}"
    echo ""
    echo -e "${YELLOW}Примечание:${NC} Navidrome автоматически обновит метаданные"
    echo "при следующем сканировании библиотеки."
fi
