#!/bin/bash

# =============================================================================
# Скрипт для автоматической замены тегов в музыкальных файлах
# Использует ExifTool для работы с метаданными
# =============================================================================

# --- НАСТРОЙКИ ---
MUSIC_DIR="/Volumes/T9/MyOneDrive/Media/Music/Музыка"
# MUSIC_DIR="/Volumes/T9/1_dev/1_QO/myQO/music"
COMMENT_TAG="https://qirim.online"

# Поддерживаемые форматы
SUPPORTED_FORMATS="mp3|m4a|mp4|flac|aac|wav|ogg|opus|wma"

# Опции (можно переопределить через параметры командной строки)
UPDATE_TITLE="${UPDATE_TITLE:-false}"  # Если true, то Title = имя файла (без расширения)
BACKUP="${BACKUP:-true}"               # Создавать резервные копии (ExifTool создаст .original)
DRY_RUN="${DRY_RUN:-false}"           # Если true, только показать что будет сделано, но не менять файлы
YES="${YES:-false}"                    # Если true, автоматически отвечать "да" на вопросы

# Обработка параметров командной строки
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --no-backup)
      BACKUP="false"
      shift
      ;;
    --update-title)
      UPDATE_TITLE="true"
      shift
      ;;
    --dir)
      MUSIC_DIR="$2"
      shift 2
      ;;
    -y|--yes)
      YES="true"
      shift
      ;;
    --help|-h)
      echo "Использование: $0 [опции]"
      echo ""
      echo "Опции:"
      echo "  --dry-run        Тестовый режим (не изменять файлы)"
      echo "  --no-backup      Не создавать резервные копии"
      echo "  --update-title   Обновить Title из имени файла"
      echo "  --dir <путь>     Путь к папке с музыкой"
      echo "  -y, --yes        Автоматически отвечать 'да' на вопросы"
      echo "  --help, -h       Показать эту справку"
      echo ""
      echo "Примеры:"
      echo "  $0 --dry-run                    # Тестовый запуск"
      echo "  $0 --update-title               # Обновить все теги включая Title"
      echo "  $0 --no-backup --update-title   # Без резервных копий"
      echo "  $0 --dir /path/to/music -y      # Указать другую папку и автоподтверждение"
      exit 0
      ;;
    *)
      echo "Неизвестная опция: $1"
      echo "Используйте --help для справки"
      exit 1
      ;;
  esac
done

# --- ПРОВЕРКИ ---
if [ ! -d "$MUSIC_DIR" ]; then
  echo "❌ Ошибка: Папка '$MUSIC_DIR' не найдена!"
  exit 1
fi

if ! command -v ffmpeg &> /dev/null; then
    echo "❌ Ошибка: Утилита 'ffmpeg' не найдена."
    echo "Пожалуйста, установите ее командой: brew install ffmpeg"
    exit 1
fi

# --- ФУНКЦИИ ---
process_file() {
  local file="$1"
  local parent_dir_name=$(basename "$(dirname "$file")")
  local filename=$(basename "$file")
  local filename_no_ext="${filename%.*}"
  local extension="${filename##*.}"

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📁 Папка: $parent_dir_name"
  echo "🎵 Файл: $filename"

  # Создаём временный файл с правильным расширением
  local temp_file="${file%.*}_temp.${extension}"

  # Показываем информацию о тегах
  if [ "$UPDATE_TITLE" = "true" ]; then
    echo "📝 Title: $filename_no_ext"
  fi

  echo "👤 Artist: $parent_dir_name"
  echo "💿 Album: $parent_dir_name"
  echo "💬 Comment: $COMMENT_TAG"

  # Выполняем команду
  if [ "$DRY_RUN" = "true" ]; then
    if [ "$UPDATE_TITLE" = "true" ]; then
      echo "🔍 DRY RUN: ffmpeg -i <file> -metadata artist=<artist> -metadata album=<album> -metadata album_artist=<artist> -metadata comment=<comment> -metadata title=<title> -codec copy <temp_file>"
    else
      echo "🔍 DRY RUN: ffmpeg -i <file> -metadata artist=<artist> -metadata album=<album> -metadata album_artist=<artist> -metadata comment=<comment> -codec copy <temp_file>"
    fi
  else
    # Создаём резервную копию, если нужно
    if [ "$BACKUP" = "true" ]; then
      cp "$file" "${file}.original"
    fi

    # Выполняем ffmpeg с правильными аргументами
    # Записываем теги в ID3v2 (современный) и ID3v1 (для совместимости)
    # -write_id3v1 1 - записывает также ID3v1 теги для старых плееров
    if [ "$UPDATE_TITLE" = "true" ]; then
      ffmpeg -i "$file" \
        -metadata artist="$parent_dir_name" \
        -metadata album="$parent_dir_name" \
        -metadata album_artist="$parent_dir_name" \
        -metadata comment="$COMMENT_TAG" \
        -metadata description="$COMMENT_TAG" \
        -metadata title="$filename_no_ext" \
        -write_id3v1 1 \
        -codec copy -y "$temp_file" -loglevel error 2>&1
    else
      ffmpeg -i "$file" \
        -metadata artist="$parent_dir_name" \
        -metadata album="$parent_dir_name" \
        -metadata album_artist="$parent_dir_name" \
        -metadata comment="$COMMENT_TAG" \
        -metadata description="$COMMENT_TAG" \
        -write_id3v1 1 \
        -codec copy -y "$temp_file" -loglevel error 2>&1
    fi

    if [ $? -eq 0 ]; then
      # Заменяем оригинальный файл
      mv "$temp_file" "$file"
      echo "✅ Успешно обработан"
    else
      echo "⚠️  Ошибка при обработке"
      # Удаляем временный файл в случае ошибки
      rm -f "$temp_file"
    fi
  fi
}

# --- ОСНОВНОЙ КОД ---
echo "╔════════════════════════════════════════════════════╗"
echo "║   Обработка музыкальных файлов с помощью FFmpeg   ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""
echo "📂 Директория: $MUSIC_DIR"
echo "🔧 Режим: $([ "$DRY_RUN" = "true" ] && echo "TEST (Dry Run)" || echo "PRODUCTION")"
echo "💾 Резервные копии: $([ "$BACKUP" = "true" ] && echo "ДА (.original)" || echo "НЕТ")"
echo "📝 Обновлять Title: $([ "$UPDATE_TITLE" = "true" ] && echo "ДА" || echo "НЕТ")"
echo ""

# Подсчет файлов
total_files=$(find "$MUSIC_DIR" -type f \( -iname "*.mp3" -o -iname "*.m4a" -o -iname "*.mp4" -o -iname "*.flac" -o -iname "*.aac" -o -iname "*.wav" -o -iname "*.ogg" -o -iname "*.opus" -o -iname "*.wma" \) | wc -l | tr -d ' ')
echo "📊 Найдено файлов: $total_files"
echo ""

if [ "$total_files" -eq 0 ]; then
  echo "⚠️  Файлы не найдены. Завершение работы."
  exit 0
fi

# Запрос подтверждения
if [ "$DRY_RUN" != "true" ] && [ "$YES" != "true" ]; then
  read -p "Продолжить обработку? (y/n): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Отменено пользователем."
    exit 0
  fi
  echo ""
fi

# Обработка файлов
counter=0
find "$MUSIC_DIR" -type f \( -iname "*.mp3" -o -iname "*.m4a" -o -iname "*.mp4" -o -iname "*.flac" -o -iname "*.aac" -o -iname "*.wav" -o -iname "*.ogg" -o -iname "*.opus" -o -iname "*.wma" \) | while read -r file; do
  counter=$((counter + 1))
  echo ""
  echo "[$counter/$total_files]"
  process_file "$file"
done

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║              ✅ Обработка завершена!               ║"
echo "╚════════════════════════════════════════════════════╝"

if [ "$BACKUP" = "true" ]; then
  echo ""
  echo "💡 Совет: Резервные копии сохранены с расширением .original"
  echo "   Для удаления резервных копий выполните:"
  echo "   find \"$MUSIC_DIR\" -name '*.original' -delete"
fi