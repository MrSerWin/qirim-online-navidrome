#!/bin/bash

# Автоматическое обновление SSL сертификатов Let's Encrypt
# Запускать через cron ежедневно

LOG_FILE="/var/log/ssl-renew.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Начало проверки SSL сертификатов" >> "$LOG_FILE"

# Обновление сертификатов (certbot обновит только те, что истекают < 30 дней)
certbot renew --quiet --deploy-hook "systemctl reload nginx" >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "[$DATE] Проверка завершена успешно" >> "$LOG_FILE"
else
    echo "[$DATE] ОШИБКА при обновлении сертификатов" >> "$LOG_FILE"
fi
