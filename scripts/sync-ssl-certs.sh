#!/bin/bash
# Синхронизация SSL сертификатов из хоста в Docker volume
# Запускать после certbot renew
#
# Использование:
#   ./sync-ssl-certs.sh              # Синхронизировать все сертификаты
#   ./sync-ssl-certs.sh qirim.online # Синхронизировать только указанный домен
#
# Crontab (после certbot renew):
#   0 3 * * * certbot renew --quiet && /opt/navidrome/scripts/sync-ssl-certs.sh

set -e

# Пути
HOST_CERTS="/etc/letsencrypt"
DOCKER_VOLUME="/var/lib/docker/volumes/certbot-conf/_data"

# Домены для синхронизации
DOMAINS=("qirim.online" "qirim.cloud" "mail.qirim.online" "ana-yurt.com" "sevil.chat")

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

sync_domain() {
    local domain=$1
    local src_archive="$HOST_CERTS/archive/$domain"
    local dst_archive="$DOCKER_VOLUME/archive/$domain"

    # Проверяем существование источника
    if [ ! -d "$src_archive" ]; then
        log "${YELLOW}⚠ Пропуск $domain - нет сертификата на хосте${NC}"
        return 0
    fi

    # Создаём папку назначения если нет
    mkdir -p "$dst_archive"

    # Копируем все .pem файлы
    cp "$src_archive"/*.pem "$dst_archive/" 2>/dev/null || {
        log "${RED}✗ Ошибка копирования $domain${NC}"
        return 1
    }

    # Проверяем результат
    local new_date=$(openssl x509 -noout -enddate -in "$dst_archive/fullchain1.pem" 2>/dev/null | cut -d= -f2)
    log "${GREEN}✓ $domain синхронизирован (истекает: $new_date)${NC}"
}

# Проверка root
if [ "$EUID" -ne 0 ]; then
    echo "Требуются права root"
    exit 1
fi

# Проверка Docker volume
if [ ! -d "$DOCKER_VOLUME" ]; then
    log "${RED}✗ Docker volume не найден: $DOCKER_VOLUME${NC}"
    exit 1
fi

log "Синхронизация SSL сертификатов..."

# Если указан конкретный домен
if [ -n "$1" ]; then
    sync_domain "$1"
else
    # Синхронизируем все домены
    for domain in "${DOMAINS[@]}"; do
        sync_domain "$domain"
    done
fi

# Перезагружаем nginx
log "Перезагрузка nginx..."
if docker compose -f /opt/navidrome/docker-compose.qirim-online.yml exec -T nginx nginx -s reload 2>/dev/null; then
    log "${GREEN}✓ nginx перезагружен${NC}"
else
    log "${YELLOW}⚠ nginx reload не удался, пробуем restart...${NC}"
    docker compose -f /opt/navidrome/docker-compose.qirim-online.yml restart nginx
    log "${GREEN}✓ nginx перезапущен${NC}"
fi

# Финальная проверка
log "Проверка сертификата qirim.online..."
CERT_DATE=$(echo | openssl s_client -servername qirim.online -connect qirim.online:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -n "$CERT_DATE" ]; then
    log "${GREEN}✓ Активный сертификат истекает: $CERT_DATE${NC}"
else
    log "${RED}✗ Не удалось проверить сертификат${NC}"
fi

log "Готово!"
