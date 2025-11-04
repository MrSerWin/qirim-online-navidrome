#!/bin/bash
#
# Скрипт конвертации аудио файлов для Navidrome
# Поддерживает: WAV → FLAC (без потерь) или WAV → MP3 (с потерей)
#
# Использование:
#   ./scripts/convert-audio.sh <входной_файл> [формат]
#   ./scripts/convert-audio.sh song.wav flac     # Конвертировать в FLAC
#   ./scripts/convert-audio.sh song.wav mp3      # Конвертировать в MP3
#   ./scripts/convert-audio.sh music_folder/     # Конвертировать всю папку
#

set -e

# Цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Настройки по умолчанию
DEFAULT_FORMAT="flac"  # flac (без потерь) или mp3 (с потерей)
MP3_BITRATE="320k"     # Битрейт для MP3 (320k = максимальное качество)
KEEP_ORIGINAL=true     # Сохранить исходный файл

print_usage() {
    echo "Использование:"
    echo "  $0 <файл.wav> [flac|mp3]"
    echo "  $0 <папка/> [flac|mp3]"
    echo ""
    echo "Примеры:"
    echo "  $0 song.wav              # Конвертировать в FLAC (без потерь)"
    echo "  $0 song.wav mp3          # Конвертировать в MP3 (320kbps)"
    echo "  $0 /music/               # Конвертировать всю папку"
    echo ""
    echo "Форматы:"
    echo "  flac - Без потери качества, ~50% размера WAV (рекомендуется)"
    echo "  mp3  - С потерей качества, ~10% размера WAV, 320kbps"
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
if [[ "$FORMAT" != "flac" && "$FORMAT" != "mp3" ]]; then
    echo -e "${RED}Ошибка: Неподдерживаемый формат '$FORMAT'${NC}"
    echo "Поддерживаются: flac, mp3"
    exit 1
fi

# Функция конвертации одного файла
convert_file() {
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

    echo -e "${BLUE}→ Конвертация: $filename → ${name}.${output_format}${NC}"

    if [ "$output_format" = "flac" ]; then
        # FLAC: без потерь, сохраняем все метаданные
        ffmpeg -i "$input_file" \
            -c:a flac \
            -compression_level 8 \
            -map_metadata 0 \
            "$output_file" \
            -y -loglevel error -stats
    elif [ "$output_format" = "mp3" ]; then
        # MP3: с потерей, высокое качество
        ffmpeg -i "$input_file" \
            -c:a libmp3lame \
            -b:a $MP3_BITRATE \
            -q:a 0 \
            -map_metadata 0 \
            "$output_file" \
            -y -loglevel error -stats
    fi

    if [ $? -eq 0 ]; then
        # Получить размеры файлов
        local input_size=$(du -h "$input_file" | cut -f1)
        local output_size=$(du -h "$output_file" | cut -f1)

        echo -e "${GREEN}✓ Готово: ${input_size} → ${output_size}${NC}"

        # Удалить оригинал если нужно
        if [ "$KEEP_ORIGINAL" = false ]; then
            rm "$input_file"
            echo -e "${YELLOW}  Удален оригинал: $filename${NC}"
        fi
    else
        echo -e "${RED}✗ Ошибка при конвертации: $filename${NC}"
    fi
    echo ""
}

# Основная логика
if [ -f "$INPUT" ]; then
    # Конвертировать один файл
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         Конвертация аудио для Navidrome               ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Файл: $INPUT"
    echo "Формат: $FORMAT"
    echo ""

    convert_file "$INPUT" "$FORMAT"

elif [ -d "$INPUT" ]; then
    # Конвертировать все WAV файлы в папке
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         Пакетная конвертация аудио                    ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Папка: $INPUT"
    echo "Формат: $FORMAT"
    echo ""

    # Найти все WAV файлы
    wav_files=$(find "$INPUT" -type f -iname "*.wav")
    total=$(echo "$wav_files" | grep -c .)

    if [ -z "$wav_files" ]; then
        echo -e "${YELLOW}Нет WAV файлов для конвертации${NC}"
        exit 0
    fi

    echo -e "${GREEN}Найдено файлов: $total${NC}"
    echo ""

    # Конвертировать каждый файл
    current=0
    while IFS= read -r file; do
        current=$((current + 1))
        echo -e "${BLUE}[$current/$total]${NC}"
        convert_file "$file" "$FORMAT"
    done <<< "$wav_files"

    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              Конвертация завершена!                   ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"

else
    echo -e "${RED}Ошибка: '$INPUT' не является файлом или папкой${NC}"
    exit 1
fi
