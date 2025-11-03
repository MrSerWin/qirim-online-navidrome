#!/bin/bash
#
# Автоматическая установка Xray VPN на отдельный VPS
# Использование: ./scripts/install-xray-standalone.sh
#
# Требования:
# - Ubuntu 20.04/22.04 или Debian 11/12
# - Root доступ
# - Домен YOUR_DOMAIN направлен на IP этого сервера (62.72.20.196)
#

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Конфигурация
DOMAIN="YOUR_DOMAIN"
EMAIL="admin@YOUR_DOMAIN"
XRAY_UUID="YOUR_UUID"
XRAY_PATH="/video_bridge_42"
INSTALL_DIR="/opt/xray-vpn"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Установка Xray VPN на отдельный VPS               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Домен: ${DOMAIN}${NC}"
echo -e "${GREEN}Путь: ${XRAY_PATH}${NC}"
echo -e "${GREEN}UUID: ${XRAY_UUID}${NC}"
echo ""

# Проверка что скрипт запущен от root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Ошибка: Этот скрипт должен быть запущен от root${NC}"
   echo "Используйте: sudo $0"
   exit 1
fi

# Функция для вывода статуса
print_status() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Шаг 1: Обновление системы
print_status "Обновление системы..."
apt-get update -qq
apt-get upgrade -y -qq
print_success "Система обновлена"

# Шаг 2: Установка Docker
print_status "Проверка Docker..."
if ! command -v docker &> /dev/null; then
    print_status "Установка Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    print_success "Docker установлен"
else
    print_success "Docker уже установлен"
fi

# Шаг 3: Установка Docker Compose
print_status "Проверка Docker Compose..."
if ! command -v docker compose &> /dev/null; then
    print_status "Установка Docker Compose..."
    apt-get install -y docker-compose-plugin
    print_success "Docker Compose установлен"
else
    print_success "Docker Compose уже установлен"
fi

# Шаг 4: Создание директорий
print_status "Создание директорий..."
mkdir -p ${INSTALL_DIR}/{xray,nginx,certbot/www,certbot/conf}
print_success "Директории созданы"

# Шаг 5: Создание конфигурации Xray
print_status "Создание конфигурации Xray..."
cat > ${INSTALL_DIR}/xray/config.json <<EOF
{
  "log": {
    "loglevel": "warning"
  },
  "inbounds": [
    {
      "port": 10000,
      "protocol": "vless",
      "settings": {
        "clients": [
          {
            "id": "${XRAY_UUID}",
            "level": 0,
            "email": "user@${DOMAIN}"
          }
        ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "ws",
        "wsSettings": {
          "path": "${XRAY_PATH}"
        }
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom",
      "settings": {},
      "tag": "direct"
    },
    {
      "protocol": "blackhole",
      "settings": {},
      "tag": "blocked"
    }
  ],
  "routing": {
    "rules": [
      {
        "type": "field",
        "ip": [
          "geoip:private"
        ],
        "outboundTag": "blocked"
      }
    ]
  }
}
EOF
print_success "Конфигурация Xray создана"

# Шаг 6: Создание Nginx конфигурации
print_status "Создание конфигурации Nginx..."
cat > ${INSTALL_DIR}/nginx/nginx.conf <<'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # WebSocket upgrade mapping
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    # Upstream для Xray
    upstream xray_backend {
        server xray:10000;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name YOUR_DOMAIN www.YOUR_DOMAIN;

        # ACME challenge для Let's Encrypt
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # Redirect to HTTPS
        location / {
            return 301 https://YOUR_DOMAIN$request_uri;
        }
    }

    # HTTPS redirect www -> non-www
    server {
        listen 443 ssl;
        http2 on;
        server_name www.YOUR_DOMAIN;

        ssl_certificate /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem;

        return 301 https://YOUR_DOMAIN$request_uri;
    }

    # HTTPS server для YOUR_DOMAIN
    server {
        listen 443 ssl default_server;
        http2 on;
        server_name YOUR_DOMAIN;

        # SSL configuration
        ssl_certificate /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Logging
        access_log /var/log/nginx/YOUR_DOMAIN.access.log;
        error_log /var/log/nginx/YOUR_DOMAIN.error.log;

        # Xray VLESS/WebSocket VPN endpoint
        location /video_bridge_42 {
            proxy_redirect off;
            proxy_pass http://xray_backend;
            proxy_http_version 1.1;

            # WebSocket upgrade headers
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # Standard proxy headers
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts для стабильного видео
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
        }

        # Default location (можно показать статичную страницу)
        location / {
            return 200 "Xray VPN Server Running\n";
            add_header Content-Type text/plain;
        }

        # Health check endpoint
        location /health {
            return 200 "OK\n";
            add_header Content-Type text/plain;
            access_log off;
        }
    }
}
EOF
print_success "Конфигурация Nginx создана"

# Шаг 7: Создание docker-compose.yml
print_status "Создание docker-compose.yml..."
cat > ${INSTALL_DIR}/docker-compose.yml <<EOF
services:
  xray:
    image: teddysun/xray:latest
    container_name: xray-vpn
    restart: unless-stopped
    networks:
      - xray-net
    volumes:
      - ./xray/config.json:/etc/xray/config.json:ro
    command: xray run -c /etc/xray/config.json
    healthcheck:
      test: ["CMD", "xray", "version"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: xray-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - certbot-data:/var/www/certbot:ro
      - certbot-conf:/etc/letsencrypt:rw
    depends_on:
      - xray
    networks:
      - xray-net

  certbot:
    image: certbot/certbot:latest
    container_name: xray-certbot
    volumes:
      - certbot-data:/var/www/certbot
      - certbot-conf:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait \$\${!}; done;'"

volumes:
  certbot-data:
  certbot-conf:

networks:
  xray-net:
    driver: bridge
EOF
print_success "docker-compose.yml создан"

# Шаг 8: Настройка firewall
print_status "Настройка firewall..."
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw reload
    print_success "Firewall настроен (UFW)"
else
    print_warning "UFW не установлен, пропускаем настройку firewall"
fi

# Шаг 9: Получение SSL сертификата
print_status "Получение SSL сертификата от Let's Encrypt..."
print_warning "ВАЖНО: Убедитесь что DNS записи для ${DOMAIN} указывают на этот сервер!"
read -p "Домен ${DOMAIN} настроен? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Запускаем Nginx для ACME challenge
    cd ${INSTALL_DIR}
    docker compose up -d nginx

    # Получаем сертификат
    docker compose run --rm certbot certonly --webroot \
        --webroot-path=/var/www/certbot \
        --email ${EMAIL} \
        --agree-tos \
        --no-eff-email \
        -d ${DOMAIN} \
        -d www.${DOMAIN}

    if [ $? -eq 0 ]; then
        print_success "SSL сертификат получен"
    else
        print_error "Ошибка при получении SSL сертификата"
        print_warning "Возможные причины:"
        print_warning "1. DNS записи для ${DOMAIN} не указывают на этот сервер"
        print_warning "2. Порты 80/443 закрыты firewall'ом"
        print_warning "3. Домен недоступен из интернета"
        exit 1
    fi
else
    print_error "Настройте DNS записи и запустите скрипт снова"
    exit 1
fi

# Шаг 10: Запуск всех сервисов
print_status "Запуск всех сервисов..."
cd ${INSTALL_DIR}
docker compose down
docker compose up -d
print_success "Все сервисы запущены"

# Шаг 11: Проверка статуса
sleep 5
print_status "Проверка статуса сервисов..."
docker compose ps

# Шаг 12: Вывод информации
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Установка завершена успешно!                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Параметры подключения:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo "  Домен:        ${DOMAIN}"
echo "  Порт:         443"
echo "  UUID:         ${XRAY_UUID}"
echo "  Путь:         ${XRAY_PATH}"
echo "  Протокол:     VLESS"
echo "  Транспорт:    WebSocket (ws)"
echo "  TLS:          Да"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}VLESS URI:${NC}"
echo "vless://${XRAY_UUID}@${DOMAIN}:443?type=ws&security=tls&path=${XRAY_PATH}&sni=${DOMAIN}&alpn=h2,http/1.1#YOUR_DOMAIN VPN"
echo ""
echo -e "${GREEN}Следующие шаги:${NC}"
echo "1. Проверьте что сайт открывается: https://${DOMAIN}"
echo "2. Проверьте логи: cd ${INSTALL_DIR} && docker compose logs -f"
echo "3. Сгенерируйте QR-код на локальной машине: ./scripts/generate-xray-qr.sh"
echo "4. Отправьте QR-код пользователям"
echo ""
echo -e "${YELLOW}Полезные команды:${NC}"
echo "  Статус:       cd ${INSTALL_DIR} && docker compose ps"
echo "  Логи:         cd ${INSTALL_DIR} && docker compose logs -f xray"
echo "  Перезапуск:   cd ${INSTALL_DIR} && docker compose restart"
echo "  Остановка:    cd ${INSTALL_DIR} && docker compose down"
echo ""
print_success "Готово! Xray VPN успешно установлен и запущен"
