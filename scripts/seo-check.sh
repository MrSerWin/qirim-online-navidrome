#!/bin/bash

# SEO Health Check Script для qirim.online и ana-yurt.com
# Проверяет основные SEO-параметры сайтов

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Опции curl для обхода кеша
CURL_OPTS="-H 'Cache-Control: no-cache' -H 'Pragma: no-cache'"

# Сайты для проверки
SITES=("https://qirim.online" "https://ana-yurt.com")

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}           SEO Health Check - $(date '+%Y-%m-%d %H:%M')${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

for SITE in "${SITES[@]}"; do
    echo ""
    echo -e "${YELLOW}▶ Проверка: $SITE${NC}"
    echo -e "${YELLOW}───────────────────────────────────────────────────────────${NC}"

    # 1. Проверка доступности (следуем редиректам)
    echo -n "  Доступность сайта: "
    HTTP_CODE=$(curl -sL -o /dev/null -w "%{http_code}" -H 'Cache-Control: no-cache' "$SITE" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✓ OK (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "${RED}✗ ОШИБКА (HTTP $HTTP_CODE)${NC}"
    fi

    # 2. Проверка HTTPS
    echo -n "  HTTPS: "
    if [[ "$SITE" == https://* ]]; then
        echo -e "${GREEN}✓ Включён${NC}"
    else
        echo -e "${RED}✗ Не используется${NC}"
    fi

    # 3. Проверка robots.txt (следуем редиректам)
    echo -n "  robots.txt: "
    ROBOTS_CODE=$(curl -sL -o /dev/null -w "%{http_code}" -H 'Cache-Control: no-cache' "$SITE/robots.txt" 2>/dev/null || echo "000")
    if [ "$ROBOTS_CODE" == "200" ]; then
        echo -e "${GREEN}✓ Найден${NC}"
    else
        echo -e "${RED}✗ Отсутствует (HTTP $ROBOTS_CODE)${NC}"
    fi

    # 4. Проверка sitemap.xml (следуем редиректам)
    echo -n "  sitemap.xml: "
    SITEMAP_CODE=$(curl -sL -o /dev/null -w "%{http_code}" -H 'Cache-Control: no-cache' "$SITE/sitemap.xml" 2>/dev/null || echo "000")
    if [ "$SITEMAP_CODE" == "200" ]; then
        echo -e "${GREEN}✓ Найден${NC}"
    else
        echo -e "${RED}✗ Отсутствует (HTTP $SITEMAP_CODE)${NC}"
    fi

    # 5. Проверка favicon (следуем редиректам)
    echo -n "  favicon.ico: "
    FAVICON_CODE=$(curl -sL -o /dev/null -w "%{http_code}" -H 'Cache-Control: no-cache' "$SITE/favicon.ico" 2>/dev/null || echo "000")
    if [ "$FAVICON_CODE" == "200" ]; then
        echo -e "${GREEN}✓ Найден${NC}"
    else
        echo -e "${YELLOW}⚠ Отсутствует (HTTP $FAVICON_CODE)${NC}"
    fi

    # 6. Время ответа
    echo -n "  Время ответа: "
    RESPONSE_TIME=$(curl -sL -o /dev/null -w "%{time_total}" -H 'Cache-Control: no-cache' "$SITE" 2>/dev/null || echo "0")
    RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc 2>/dev/null || echo "N/A")
    if (( $(echo "$RESPONSE_TIME < 1" | bc -l 2>/dev/null || echo 0) )); then
        echo -e "${GREEN}✓ ${RESPONSE_MS%.*}ms${NC}"
    elif (( $(echo "$RESPONSE_TIME < 3" | bc -l 2>/dev/null || echo 0) )); then
        echo -e "${YELLOW}⚠ ${RESPONSE_MS%.*}ms (медленно)${NC}"
    else
        echo -e "${RED}✗ ${RESPONSE_MS%.*}ms (очень медленно)${NC}"
    fi

    # 7. Проверка мета-тегов (следуем редиректам)
    echo -n "  Meta title: "
    TITLE=$(curl -sL -H 'Cache-Control: no-cache' "$SITE" 2>/dev/null | grep -o '<title>[^<]*</title>' | head -1 | sed 's/<[^>]*>//g')
    if [ -n "$TITLE" ]; then
        TITLE_LEN=${#TITLE}
        if [ $TITLE_LEN -gt 60 ]; then
            echo -e "${YELLOW}⚠ \"${TITLE:0:50}...\" (${TITLE_LEN} символов - слишком длинный)${NC}"
        elif [ $TITLE_LEN -lt 30 ]; then
            echo -e "${YELLOW}⚠ \"$TITLE\" (${TITLE_LEN} символов - слишком короткий)${NC}"
        else
            echo -e "${GREEN}✓ \"$TITLE\" (${TITLE_LEN} символов)${NC}"
        fi
    else
        echo -e "${RED}✗ Отсутствует${NC}"
    fi

    # 8. Проверка SSL сертификата (принудительное обновление)
    echo -n "  SSL сертификат: "
    DOMAIN=$(echo "$SITE" | sed 's|https://||' | sed 's|/.*||')
    SSL_EXPIRY=$(echo | timeout 5 openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    if [ -n "$SSL_EXPIRY" ]; then
        EXPIRY_EPOCH=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$SSL_EXPIRY" +%s 2>/dev/null || date -d "$SSL_EXPIRY" +%s 2>/dev/null || echo "0")
        NOW_EPOCH=$(date +%s)
        DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
        if [ $DAYS_LEFT -gt 30 ]; then
            echo -e "${GREEN}✓ Действителен ещё $DAYS_LEFT дней${NC}"
        elif [ $DAYS_LEFT -gt 7 ]; then
            echo -e "${YELLOW}⚠ Истекает через $DAYS_LEFT дней${NC}"
        else
            echo -e "${RED}✗ Истекает через $DAYS_LEFT дней!${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Не удалось проверить${NC}"
    fi

done

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    Проверка завершена${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Рекомендации:"
echo "  1. Добавьте robots.txt если отсутствует"
echo "  2. Создайте sitemap.xml для лучшей индексации"
echo "  3. Зарегистрируйте сайты в Google Search Console и Яндекс.Вебмастер"
echo ""
