#!/bin/bash
#
# Скрипт извлечения аудио из видео файлов
# Поддерживает: MP4, MKV, AVI, MOV, WEBM → MP3/FLAC/M4A
#
# Использование:
#   ./scripts/extract-audio-from-video.sh <видео_файл> [формат]
#   ./scripts/extract-audio-from-video.sh video.mp4          # → video.mp3
#   ./scripts/extract-audio-from-video.sh video.mp4 flac     # → video.flac
#   ./scripts/extract-audio-from-video.sh video.mp4 m4a      # → video.m4a (без перекодирования)
#   ./scripts/extract-audio-from-video.sh videos_folder/     # Конвертировать всю папку
#

set -e

# Цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Настройки по умолчанию
DEFAULT_FORMAT="mp3"
MP3_BITRATE="320k"
KEEP_VIDEO=true

# Поддерживаемые видео форматы
VIDEO_EXTENSIONS="mp4|mkv|avi|mov|webm|flv|wmv|m4v"

print_usage() {
    echo "Использование:"
    echo "  $0 <видео_файл> [mp3|flac|m4a]"
    echo "  $0 <папка/> [mp3|flac|m4a]"
    echo ""
    echo "Примеры:"
    echo "  $0 video.mp4              # Извлечь в MP3 (320kbps)"
    echo "  $0 video.mp4 flac         # Извлечь в FLAC (без потерь)"
    echo "  $0 video.mp4 m4a          # Извлечь AAC без перекодирования"
    echo "  $0 /videos/               # Обработать всю папку"
    echo ""
    echo "Форматы:"
    echo "  mp3  - Универсальный, 320kbps (рекомендуется)"
    echo "  flac - Без потери качества"
    echo "  m4a  - Копировать AAC напрямую (самый быстрый)"
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

INPUT="$1"
FORMAT="${2:-$DEFAULT_FORMAT}"

# Проверка формата
if [[ "$FORMAT" != "mp3" && "$FORMAT" != "flac" && "$FORMAT" != "m4a" ]]; then
    echo -e "${RED}Ошибка: Неподдерживаемый формат '$FORMAT'${NC}"
    echo "Поддерживаются: mp3, flac, m4a"
    exit 1
fi

# Функция проверки видео файла
is_video_file() {
    local file="$1"
    local ext="${file##*.}"
    ext=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
    [[ "$ext" =~ ^($VIDEO_EXTENSIONS)$ ]]
}

# Функция извлечения аудио
extract_audio() {
    local input_file="$1"
    local output_format="$2"

    # Получить имя файла без расширения
    local dir=$(dirname "$input_file")
    local filename=$(basename "$input_file")
    local name="${filename%.*}"
    local output_file="${dir}/${name}.${output_format}"

    # Пропустить если выходной файл уже существует
    if [ -f "$output_file" ]; then
        echo -e "${YELLOW}⊘ Пропуск: $output_file уже существует${NC}"
        return
    fi

    echo -e "${BLUE}→ Извлечение: $filename → ${name}.${output_format}${NC}"

    if [ "$output_format" = "mp3" ]; then
        # MP3: высокое качество
        ffmpeg -i "$input_file" \
            -vn \
            -c:a libmp3lame \
            -b:a $MP3_BITRATE \
            -q:a 0 \
            "$output_file" \
            -y -loglevel error -stats
    elif [ "$output_format" = "flac" ]; then
        # FLAC: без потерь
        ffmpeg -i "$input_file" \
            -vn \
            -c:a flac \
            -compression_level 8 \
            "$output_file" \
            -y -loglevel error -stats
    elif [ "$output_format" = "m4a" ]; then
        # M4A: копировать AAC без перекодирования (быстро)
        ffmpeg -i "$input_file" \
            -vn \
            -c:a copy \
            "$output_file" \
            -y -loglevel error -stats 2>/dev/null || \
        # Если не получилось скопировать, перекодировать в AAC
        ffmpeg -i "$input_file" \
            -vn \
            -c:a aac \
            -b:a 256k \
            "$output_file" \
            -y -loglevel error -stats
    fi

    if [ $? -eq 0 ]; then
        # Получить размеры файлов
        local input_size=$(du -h "$input_file" | cut -f1)
        local output_size=$(du -h "$output_file" | cut -f1)

        echo -e "${GREEN}✓ Готово: ${input_size} → ${output_size}${NC}"
    else
        echo -e "${RED}✗ Ошибка при извлечении: $filename${NC}"
    fi
    echo ""
}

# Основная логика
if [ -f "$INPUT" ]; then
    # Проверить что это видео файл
    if ! is_video_file "$INPUT"; then
        echo -e "${RED}Ошибка: '$INPUT' не является видео файлом${NC}"
        echo "Поддерживаются: mp4, mkv, avi, mov, webm, flv, wmv, m4v"
        exit 1
    fi

    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         Извлечение аудио из видео                     ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Файл: $INPUT"
    echo "Формат: $FORMAT"
    echo ""

    extract_audio "$INPUT" "$FORMAT"

elif [ -d "$INPUT" ]; then
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     Пакетное извлечение аудио из видео                ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Папка: $INPUT"
    echo "Формат: $FORMAT"
    echo ""

    # Найти все видео файлы
    video_files=$(find "$INPUT" -type f \( -iname "*.mp4" -o -iname "*.mkv" -o -iname "*.avi" -o -iname "*.mov" -o -iname "*.webm" -o -iname "*.flv" -o -iname "*.wmv" -o -iname "*.m4v" \) 2>/dev/null || true)

    if [ -z "$video_files" ]; then
        echo -e "${YELLOW}Нет видео файлов для обработки${NC}"
        exit 0
    fi

    total=$(echo "$video_files" | grep -c . || echo "0")
    echo -e "${GREEN}Найдено видео файлов: $total${NC}"
    echo ""

    # Обработать каждый файл
    current=0
    while IFS= read -r file; do
        [ -z "$file" ] && continue
        current=$((current + 1))
        echo -e "${BLUE}[$current/$total]${NC}"
        extract_audio "$file" "$FORMAT"
    done <<< "$video_files"

    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              Извлечение завершено!                    ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"

else
    echo -e "${RED}Ошибка: '$INPUT' не является файлом или папкой${NC}"
    exit 1
fi
