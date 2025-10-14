#!/bin/bash

# --- НАСТРОЙКИ ---
# Папка, которую нужно забекапить
SOURCE_DIR="/opt/navidrome"

# Папка, которую нужно исключить из бекапа (путь относительно SOURCE_DIR)
EXCLUDE_DIR="music"

# Папка, куда будут сохраняться бекапы
BACKUP_DIR="/var/backups/qirim_online"

# Сколько дней хранить бекапы
RETENTION_DAYS=7

# --- ОСНОВНОЙ КОД ---

# Создаем папку для бекапов, если она не существует
mkdir -p $BACKUP_DIR

# Формируем имя файла бекапа с текущей датой
BACKUP_FILENAME=$(date +%Y-%m-%d)_QirimOnline.tar.gz

# Полный путь к файлу бекапа
FULL_BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILENAME"

echo "----------------------------------------"
echo "Начинаю создание бекапа: $BACKUP_FILENAME"

# Создаем архив tar.gz
# -c: создать архив
# -z: сжать с помощью gzip
# -v: выводить подробную информацию (можно убрать, если не нужно)
# -f: указать имя файла архива
# --exclude: исключить указанную папку
# -C: перейти в указанную директорию перед архивацией, чтобы пути в архиве были относительными
tar -czvf "$FULL_BACKUP_PATH" --exclude="$EXCLUDE_DIR" -C "$(dirname "$SOURCE_DIR")" "$(basename "$SOURCE_DIR")"

echo "Бекап успешно создан: $FULL_BACKUP_PATH"

# Удаляем старые бекапы (старше RETENTION_DAYS)
echo "Удаляю бекапы старше $RETENTION_DAYS дней..."
find $BACKUP_DIR -type f -name "*_QirimOnline.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Очистка завершена."
echo "----------------------------------------"