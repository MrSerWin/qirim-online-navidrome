#!/bin/bash
#
# Скрипт обновления мета-тегов аудио файлов
# Автоматически устанавливает Artist и Album на основе названия папки
# Title извлекается из имени файла (с улучшенной логикой)
# Турецкие буквы транслитерируются для совместимости с ID3v1
# Устанавливает обложку альбома из qo_2000.png
#
# Использование:
#   ./scripts/update-music-tags.sh "/путь/к/папке/с/музыкой"
#   ./scripts/update-music-tags.sh "/Volumes/T9/MyOneDrive/Media/Music/Музыка/QirimTatar/QırımYankısı"
#   ./scripts/update-music-tags.sh "/Volumes/T9/MyOneDrive/Media/Music/Музыка/QirimTatar/Adile Absaitova"
#
# ВАЖНО: Извлечение нескольких артистов из имени файла ВРЕМЕННО ОТКЛЮЧЕНО
# Функции extract_artists_from_filename() готовы, но закомментированы в коде
# После ручного исправления имен артистов можно включить в строке 239
#

set -e

# Путь к обложке альбома
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COVER_IMAGE="$SCRIPT_DIR/qo_2000.png"

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

# Функция извлечения артистов из имени файла
# Поддерживает форматы:
#   "Artist1, Artist2 – Title"
#   "Artist1 & Artist2 - Title"
#   "Artist1 feat. Artist2 - Title"
#   "Artist1 ft. Artist2 - Title"
#   "Artist1 featuring Artist2 - Title"
extract_artists_from_filename() {
    local filename="$1"
    local artists=""

    # Убрать расширение
    filename="${filename%.*}"

    # Попробовать найти разделители между артистом и названием
    # Поддерживаемые разделители: –, -, —
    local artist_part=""

    if [[ "$filename" =~ ^(.+)[–—-](.+)$ ]]; then
        artist_part="${BASH_REMATCH[1]}"
    else
        # Если нет разделителя, вся строка - это артист
        artist_part="$filename"
    fi

    # Убрать пробелы по краям
    artist_part=$(echo "$artist_part" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    # Проверить на наличие нескольких артистов
    # Разделители: , & feat. ft. featuring
    if [[ "$artist_part" =~ ,|\ \&\ |\ feat\.?\ |\ ft\.?\ |\ featuring\  ]]; then
        # Есть несколько артистов - нормализовать
        # Заменить все разделители на ;
        artists="$artist_part"
        # feat./ft./featuring → ,
        artists=$(echo "$artists" | sed -E 's/ feat\.? / , /gi; s/ ft\.? / , /gi; s/ featuring / , /gi')
        # & → ,
        artists=$(echo "$artists" | sed 's/ & / , /g')
        # Теперь заменить , на ;
        artists=$(echo "$artists" | sed 's/ *, */; /g')
        # Убрать лишние пробелы
        artists=$(echo "$artists" | sed 's/; */; /g; s/ *;/;/g')
    else
        # Один артист
        artists="$artist_part"
    fi

    echo "$artists"
}

# Функция извлечения названия трека из имени файла
extract_title_from_filename() {
    local filename="$1"
    local title=""

    # Убрать расширение
    filename="${filename%.*}"

    # Попробовать найти разделители между артистом и названием
    if [[ "$filename" =~ ^(.+)[–—-](.+)$ ]]; then
        title="${BASH_REMATCH[2]}"
    else
        # Если нет разделителя, использовать имя файла
        title="$filename"
    fi

    # Убрать пробелы по краям
    title=$(echo "$title" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    echo "$title"
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
    echo "  - Устанавливает Artist и Album = название папки"
    echo "  - Извлекает Title из имени файла (после разделителя – или -)"
    echo "  - Устанавливает обложку альбома из qo_2000.png"
    echo "  - Comment = https://qirim.online/"
    echo "  - Турецкие буквы транслитерируются для ID3v1"
    echo ""
    echo "Примеры имен файлов:"
    echo "  'Artist Name – Song Title.mp3' → Title: Song Title"
    echo "  'Artist Name - Song Title.mp3' → Title: Song Title"
    echo "  'Song Title.mp3' → Title: Song Title"
    echo ""
    echo "Поддерживаемые форматы: mp3, flac, m4a, ogg, wav"
    echo ""
    echo "ПРИМЕЧАНИЕ: Функция извлечения нескольких артистов из имени файла"
    echo "временно отключена. Используется название папки для Artist."
}

# Проверка наличия ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}Ошибка: ffmpeg не установлен${NC}"
    echo "Установите: brew install ffmpeg"
    exit 1
fi

# Проверка наличия обложки
if [ ! -f "$COVER_IMAGE" ]; then
    echo -e "${YELLOW}Внимание: Обложка не найдена: $COVER_IMAGE${NC}"
    echo "Продолжаем без установки обложки..."
    COVER_IMAGE=""
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

# Получить название папки (Album)
FOLDER_NAME=$(basename "$MUSIC_DIR")
ALBUM_NAME="$FOLDER_NAME"
ALBUM_NAME_TRANSLITERATED=$(transliterate_turkish "$FOLDER_NAME")

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Обновление мета-тегов аудио файлов            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Папка: ${YELLOW}$MUSIC_DIR${NC}"
echo -e "Album: ${GREEN}$ALBUM_NAME${NC}"
echo -e "Album (транслитерация): ${GREEN}$ALBUM_NAME_TRANSLITERATED${NC}"
if [ -n "$COVER_IMAGE" ]; then
    echo -e "Обложка: ${GREEN}$COVER_IMAGE${NC}"
else
    echo -e "Обложка: ${YELLOW}не установлена${NC}"
fi
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

    # Получить имя файла
    filename=$(basename "$file")
    extension="${filename##*.}"

    # ВРЕМЕННО ОТКЛЮЧЕНО: Извлечение артистов из имени файла
    # Используем старый механизм - Artist из названия папки
    # TODO: Включить после ручного исправления имен артистов
    # artists=$(extract_artists_from_filename "$filename")

    # Старый механизм: Artist = название папки
    artists="$ALBUM_NAME"

    # Извлечь название трека из имени файла (с улучшенной логикой)
    song_title=$(extract_title_from_filename "$filename")

    # Транслитерировать для совместимости
    artists_transliterated=$(transliterate_turkish "$artists")
    song_title_transliterated=$(transliterate_turkish "$song_title")

    # Title = "Artist - Song Title" для лучшего отображения
    title_transliterated="${artists_transliterated} - ${song_title_transliterated}"

    echo -e "${BLUE}[$current/$total]${NC} ${filename}"
    echo "  Artist: $artists_transliterated (из папки)"
    echo "  Album: $ALBUM_NAME_TRANSLITERATED"
    echo "  Title: $title_transliterated"

    # Временный файл для вывода
    temp_output="${file}.tmp.${extension}"

    # Подготовить команду ffmpeg
    ffmpeg_cmd=(ffmpeg -i "$file")

    # Добавить обложку если есть
    if [ -n "$COVER_IMAGE" ]; then
        ffmpeg_cmd+=(-i "$COVER_IMAGE")
        ffmpeg_cmd+=(-map 0 -map 1)
        ffmpeg_cmd+=(-c copy)
        ffmpeg_cmd+=(-disposition:v:0 attached_pic)
    else
        ffmpeg_cmd+=(-map 0)
        ffmpeg_cmd+=(-c copy)
    fi

    # Добавить метаданные
    ffmpeg_cmd+=(
        -id3v2_version 3
        -metadata artist="$artists_transliterated"
        -metadata album_artist="$artists_transliterated"
        -metadata album="$ALBUM_NAME_TRANSLITERATED"
        -metadata title="$title_transliterated"
        -metadata comment="https://qirim.online/"
        "$temp_output"
        -y -loglevel error
    )

    # Выполнить команду
    if "${ffmpeg_cmd[@]}" 2>&1; then
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
