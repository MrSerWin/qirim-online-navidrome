# Navidrome Backup Setup

Этот документ описывает настройку автоматического ежедневного бекапа Navidrome.

## Компоненты

1. **backup-navidrome.sh** - скрипт для создания бекапа всей папки `/opt/navidrome` (кроме музыки)
2. **backup-database.sh** - скрипт для создания бекапа только базы данных

## Что включает backup-navidrome.sh

- ✅ Docker Compose файлы
- ✅ Конфигурационные файлы
- ✅ База данных (navidrome.db)
- ✅ Nginx конфигурация
- ✅ SSL сертификаты
- ❌ Музыкальные файлы (исключены для экономии места)
- ❌ Кеш (исключен)
- ❌ Старые бекапы базы данных (исключены)

## Настройки бекапа

- **Частота:** 1 раз в день (в 3:00 ночи)
- **Хранение:** 7 дней
- **Расположение:** `/root/backups/navidrome/`
- **Лог:** `/var/log/navidrome-backup.log`

## Установка

### 1. Загрузить скрипт на сервер

```bash
# На локальной машине
scp scripts/backup-navidrome.sh root@SERVER_IP:/opt/navidrome/scripts/

# На сервере
chmod +x /opt/navidrome/scripts/backup-navidrome.sh
```

### 2. Протестировать скрипт вручную

```bash
cd /opt/navidrome/scripts
./backup-navidrome.sh
```

Проверить, что бекап создан:
```bash
ls -lh /root/backups/navidrome/
cat /var/log/navidrome-backup.log
```

### 3. Настроить cron для автоматического запуска

```bash
# Открыть crontab
crontab -e

# Добавить строку (запуск каждый день в 3:00)
0 3 * * * /opt/navidrome/scripts/backup-navidrome.sh >> /var/log/navidrome-backup.log 2>&1
```

### 4. Проверить, что cron задача добавлена

```bash
crontab -l
```

## Проверка работы

### Просмотр логов

```bash
# Последние 50 строк
tail -50 /var/log/navidrome-backup.log

# Следить за логом в реальном времени
tail -f /var/log/navidrome-backup.log
```

### Список бекапов

```bash
ls -lh /root/backups/navidrome/
```

### Размер бекапов

```bash
du -sh /root/backups/navidrome/
```

## Восстановление из бекапа

### 1. Остановить Navidrome

```bash
cd /opt/navidrome
docker compose down
```

### 2. Выбрать бекап для восстановления

```bash
ls -lh /root/backups/navidrome/
```

### 3. Извлечь бекап

```bash
# Пример: восстановление из бекапа от 20251023
cd /opt
tar -xzf /root/backups/navidrome/navidrome-backup-20251023-030000.tar.gz
```

### 4. Запустить Navidrome

```bash
cd /opt/navidrome
docker compose up -d
```

## Альтернативный вариант: только база данных

Если нужен только бекап базы данных (быстрее и легче):

```bash
# Ручной запуск
/opt/navidrome/scripts/backup-database.sh

# Cron (каждые 6 часов)
0 */6 * * * /opt/navidrome/scripts/backup-database.sh >> /var/log/navidrome-backup.log 2>&1
```

Бекапы базы данных хранятся в `/opt/navidrome/data/backups/` и сохраняются 30 дней.

## Мониторинг

Рекомендуется периодически проверять:

1. **Размер бекапов:** не должен бесконтрольно расти
2. **Наличие свежих бекапов:** должны создаваться каждый день
3. **Логи:** не должно быть ошибок
4. **Свободное место на диске:**
   ```bash
   df -h
   ```

## Очистка

### Удалить все старые бекапы

```bash
rm -rf /root/backups/navidrome/navidrome-backup-*.tar.gz
```

### Изменить период хранения

Отредактировать в скрипте переменную `RETENTION_DAYS`:
```bash
nano /opt/navidrome/scripts/backup-navidrome.sh
```

## Важные замечания

- Бекапы **НЕ ВКЛЮЧАЮТ музыкальные файлы** - их нужно бэкапить отдельно
- Музыка хранится в `/opt/navidrome/music` - если нужен бекап музыки, используйте отдельное решение (например, rsync на другой сервер)
- Перед восстановлением бекапа всегда останавливайте Docker контейнеры
- Рекомендуется копировать бекапы на удаленный сервер или в облачное хранилище
