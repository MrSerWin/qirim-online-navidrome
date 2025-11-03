#!/bin/bash
#
# Скрипт для генерации QR-кода подключения к Xray VLESS
# Использование: ./scripts/generate-xray-qr.sh
#

set -e

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Xray VLESS QR Code Generator для YOUR_DOMAIN       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Параметры подключения (из xray/config.json)
UUID="YOUR_UUID"
ADDRESS="YOUR_DOMAIN"
PORT="443"
PATH="/video_bridge_42"
NETWORK="ws"
SECURITY="tls"
SNI="YOUR_DOMAIN"
ALPN="h2,http/1.1"
REMARK="YOUR_DOMAIN VPN"

# Формируем VLESS URI
VLESS_URI="vless://${UUID}@${ADDRESS}:${PORT}?type=${NETWORK}&security=${SECURITY}&path=${PATH}&sni=${SNI}&alpn=${ALPN}#${REMARK}"

echo -e "${GREEN}✓ VLESS URI сгенерирован${NC}"
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Скопируйте эту строку в V2RayNG (вручную):${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""
echo "$VLESS_URI"
echo ""

# Проверяем наличие qrencode
if command -v qrencode &> /dev/null; then
    echo -e "${GREEN}✓ Генерирую QR-код...${NC}"
    echo ""

    # Генерируем QR-код в терминале
    qrencode -t ANSIUTF8 "$VLESS_URI"

    echo ""
    echo -e "${GREEN}✓ QR-код готов!${NC}"
    echo ""

    # Сохраняем в файл PNG
    OUTPUT_FILE="xray-qr-code.png"
    qrencode -o "$OUTPUT_FILE" -s 10 -m 2 "$VLESS_URI"
    echo -e "${GREEN}✓ QR-код сохранен в файл: ${OUTPUT_FILE}${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠ qrencode не установлен${NC}"
    echo -e "${YELLOW}  Для генерации QR-кода установите:${NC}"
    echo -e "${YELLOW}  brew install qrencode${NC}"
    echo ""
    echo -e "${YELLOW}  Или используйте онлайн-генератор:${NC}"
    echo -e "${YELLOW}  https://qr.io/${NC}"
    echo ""
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Параметры подключения:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo "  Протокол:     VLESS"
echo "  Адрес:        ${ADDRESS}"
echo "  Порт:         ${PORT}"
echo "  UUID:         ${UUID}"
echo "  Транспорт:    WebSocket (${NETWORK})"
echo "  Path:         ${PATH}"
echo "  TLS:          Да (${SECURITY})"
echo "  SNI:          ${SNI}"
echo "  ALPN:         ${ALPN}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}✓ Готово!${NC}"
echo ""
echo -e "${YELLOW}Инструкция для родителей:${NC}"
echo "1. Установить приложение V2RayNG на Android"
echo "2. Открыть приложение"
echo "3. Нажать на '+' (добавить сервер)"
echo "4. Выбрать 'Scan QR code' или 'Import config from clipboard'"
echo "5. Отсканировать QR-код выше или вставить VLESS URI"
echo "6. Нажать на кнопку подключения (самолетик)"
echo "7. Готово! Теперь можно звонить через Telegram/WhatsApp"
echo ""
