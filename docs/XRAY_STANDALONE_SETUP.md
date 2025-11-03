# Xray VPN - Установка на отдельный VPS

Руководство по установке Xray VPN на выделенный сервер для максимальной производительности и изоляции.

## Требования

### Сервер
- **ОС:** Ubuntu 20.04/22.04 или Debian 11/12
- **RAM:** Минимум 512 MB (рекомендуется 1 GB)
- **CPU:** 1 ядро (рекомендуется 2)
- **Диск:** Минимум 10 GB
- **IP:** SERVER_IP_NEW (ваш VPS)
- **Root доступ:** Обязателен

### DNS настройки
Перед установкой настройте DNS записи для домена `YOUR_DOMAIN`:

```
A     YOUR_DOMAIN       → SERVER_IP_NEW
A     www.YOUR_DOMAIN   → SERVER_IP_NEW
```

**Проверка DNS:**
```bash
dig +short YOUR_DOMAIN
# Должен вернуть: SERVER_IP_NEW
```

## Быстрая установка (Автоматическая)

### Шаг 1: Подготовка

Подключитесь к серверу по SSH:
```bash
ssh root@SERVER_IP_NEW
```

### Шаг 2: Загрузка скрипта

Загрузите скрипт установки на сервер:

**Вариант А: Через scp (с вашего Mac)**
```bash
scp scripts/install-xray-standalone.sh root@SERVER_IP_NEW:/root/
```

**Вариант Б: Через wget (на сервере)**
```bash
# Если скрипт доступен по URL
wget https://raw.githubusercontent.com/your-repo/scripts/install-xray-standalone.sh
chmod +x install-xray-standalone.sh
```

**Вариант В: Скопировать вручную (на сервере)**
```bash
nano install-xray-standalone.sh
# Вставить содержимое скрипта
chmod +x install-xray-standalone.sh
```

### Шаг 3: Запуск установки

```bash
sudo ./install-xray-standalone.sh
```

Скрипт автоматически:
1. Обновит систему
2. Установит Docker и Docker Compose
3. Создаст конфигурации Xray и Nginx
4. Настроит SSL сертификат от Let's Encrypt
5. Запустит все сервисы
6. Выведет параметры подключения

**Время установки:** ~5-10 минут

### Шаг 4: Проверка

После установки проверьте:

```bash
# Статус сервисов
cd /opt/xray-vpn
docker compose ps

# Логи Xray
docker compose logs xray

# Логи Nginx
docker compose logs nginx

# Проверить что HTTPS работает
curl -I https://YOUR_DOMAIN
```

## Ручная установка (Альтернатива)

Если автоматический скрипт не подходит, можно установить вручную:

### 1. Установка Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker
```

### 2. Создание структуры каталогов

```bash
mkdir -p /opt/xray-vpn/{xray,nginx,certbot/www,certbot/conf}
cd /opt/xray-vpn
```

### 3. Создание конфигурации Xray

```bash
cat > xray/config.json <<'EOF'
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
            "id": "4e9c72a8-5b3d-4f2e-9a1c-8d7e6f5a4b3c",
            "level": 0,
            "email": "user@YOUR_DOMAIN"
          }
        ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "ws",
        "wsSettings": {
          "path": "/video_bridge_42"
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
        "ip": ["geoip:private"],
        "outboundTag": "blocked"
      }
    ]
  }
}
EOF
```

### 4. Создание Nginx конфигурации

```bash
# Конфигурация слишком длинная - см. файл scripts/install-xray-standalone.sh
# Скопируйте секцию nginx/nginx.conf из скрипта
```

### 5. Создание docker-compose.yml

```bash
# См. секцию docker-compose.yml в скрипте
```

### 6. Получение SSL сертификата

```bash
docker compose up -d nginx

docker compose run --rm certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@YOUR_DOMAIN \
    --agree-tos \
    --no-eff-email \
    -d YOUR_DOMAIN \
    -d www.YOUR_DOMAIN
```

### 7. Запуск всех сервисов

```bash
docker compose down
docker compose up -d
```

## Конфигурация

### Изменение UUID

Если нужен новый UUID:

```bash
# Сгенерировать новый UUID
uuidgen | tr '[:upper:]' '[:lower:]'

# Обновить в xray/config.json
nano /opt/xray-vpn/xray/config.json

# Перезапустить Xray
docker compose restart xray
```

### Изменение пути WebSocket

```bash
# 1. Обновить в xray/config.json
nano /opt/xray-vpn/xray/config.json
# Изменить "path": "/video_bridge_42" на новый путь

# 2. Обновить в nginx/nginx.conf
nano /opt/xray-vpn/nginx/nginx.conf
# Изменить location /video_bridge_42 на новый путь

# 3. Перезапустить
docker compose restart
```

### Добавление пользователей

Отредактируйте `xray/config.json`:

```json
"clients": [
  {
    "id": "uuid-user-1",
    "email": "user1@YOUR_DOMAIN"
  },
  {
    "id": "uuid-user-2",
    "email": "user2@YOUR_DOMAIN"
  }
]
```

Каждому пользователю нужен свой UUID и QR-код.

## Управление сервисом

### Основные команды

```bash
cd /opt/xray-vpn

# Статус
docker compose ps

# Логи (все сервисы)
docker compose logs -f

# Логи только Xray
docker compose logs -f xray

# Перезапуск
docker compose restart

# Остановка
docker compose down

# Запуск
docker compose up -d
```

### Обновление конфигурации

```bash
cd /opt/xray-vpn

# После изменения конфигурации
docker compose restart xray

# Проверка синтаксиса nginx
docker compose exec nginx nginx -t

# Перезапуск nginx
docker compose restart nginx
```

### Мониторинг

```bash
# Использование ресурсов
docker stats

# Проверка работоспособности
curl https://YOUR_DOMAIN/health
# Должен вернуть: OK

# Проверка логов ошибок
docker compose logs nginx | grep error
docker compose logs xray | grep error
```

## Генерация QR-кода

**На вашем локальном Mac** (не на сервере):

```bash
./scripts/generate-xray-qr.sh
```

Это создаст файл `xray-qr-code.png` который можно отправить пользователям.

## Безопасность

### Firewall

Скрипт автоматически настроит UFW firewall:

```bash
# Проверить статус
ufw status

# Открытые порты
ufw status numbered
# Должны быть открыты: 22 (SSH), 80 (HTTP), 443 (HTTPS)
```

### Обновление SSL сертификата

Certbot автоматически обновляет сертификаты каждые 12 часов. Проверка:

```bash
docker compose logs certbot
```

Ручное обновление:

```bash
docker compose run --rm certbot renew
docker compose restart nginx
```

### Ограничение доступа

Для дополнительной безопасности можно ограничить доступ к SSH:

```bash
# Изменить порт SSH
nano /etc/ssh/sshd_config
# Port 2222

systemctl restart sshd
ufw allow 2222/tcp
```

## Производительность

### Мониторинг

```bash
# CPU и память
htop

# Сетевой трафик
iftop

# Дисковое пространство
df -h
```

### Оптимизация

Для высоких нагрузок увеличьте `worker_connections` в nginx:

```nginx
events {
    worker_connections 2048;  # Было 1024
}
```

## Backup

### Backup конфигурации

```bash
# Создать backup
tar -czf xray-backup-$(date +%Y%m%d).tar.gz /opt/xray-vpn

# Скачать backup на локальную машину
scp root@SERVER_IP_NEW:/root/xray-backup-*.tar.gz .
```

### Восстановление

```bash
# Загрузить backup на сервер
scp xray-backup-*.tar.gz root@SERVER_IP_NEW:/root/

# На сервере
tar -xzf xray-backup-*.tar.gz -C /
cd /opt/xray-vpn
docker compose up -d
```

## Troubleshooting

### Проблема: Не получается получить SSL сертификат

**Проверьте:**
1. DNS записи указывают на правильный IP:
   ```bash
   dig +short YOUR_DOMAIN
   ```

2. Порт 80 открыт:
   ```bash
   ufw status | grep 80
   netstat -tulpn | grep :80
   ```

3. Nginx запущен:
   ```bash
   docker compose ps nginx
   ```

**Решение:**
```bash
# Проверить логи certbot
docker compose logs certbot

# Попробовать получить сертификат заново
docker compose run --rm certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@YOUR_DOMAIN \
    --agree-tos \
    --force-renewal \
    -d YOUR_DOMAIN
```

### Проблема: Xray не запускается

**Проверьте:**
```bash
docker compose logs xray
```

**Частые ошибки:**
- Неправильный синтаксис JSON в config.json
- Порт 10000 занят

**Решение:**
```bash
# Проверить синтаксис JSON
cat /opt/xray-vpn/xray/config.json | jq .

# Проверить порты
netstat -tulpn | grep 10000
```

### Проблема: Не удается подключиться

**Проверьте:**
1. Xray запущен:
   ```bash
   docker compose ps xray
   ```

2. Nginx проксирует запросы:
   ```bash
   curl -I https://YOUR_DOMAIN/video_bridge_42
   # Ожидаемо: 400 Bad Request (нормально для WebSocket)
   ```

3. Firewall не блокирует:
   ```bash
   ufw status
   ```

4. UUID совпадает в конфигурации и QR-коде

## Миграция с другого сервера

Если нужно перенести Xray с текущего сервера (SERVER_IP) на новый (SERVER_IP_NEW):

### 1. Обновить DNS

```
A     YOUR_DOMAIN       → SERVER_IP_NEW  (было SERVER_IP)
```

### 2. Установить на новом сервере

```bash
# На новом сервере (SERVER_IP_NEW)
./install-xray-standalone.sh
```

### 3. Проверить работоспособность

```bash
curl https://YOUR_DOMAIN/health
```

### 4. Уведомить пользователей

QR-код остается тот же (UUID не изменился), но можно сгенерировать новый для уверенности:

```bash
./scripts/generate-xray-qr.sh
```

## Технические характеристики

### Архитектура

```
Клиент (Hiddify/V2RayNG)
    ↓
HTTPS/TLS (YOUR_DOMAIN:443)
    ↓
Nginx (reverse proxy) → /video_bridge_42
    ↓
Xray (Docker) → порт 10000
    ↓
Интернет
```

### Используемые порты

- **80** - HTTP (redirect to HTTPS + ACME challenge)
- **443** - HTTPS (Nginx + WebSocket)
- **10000** - Xray (внутренний, не доступен извне)

### Образы Docker

- **Xray:** teddysun/xray:latest (~50 MB)
- **Nginx:** nginx:alpine (~25 MB)
- **Certbot:** certbot/certbot:latest (~100 MB)

## Ссылки

- [Xray GitHub](https://github.com/XTLS/Xray-core)
- [Docker Documentation](https://docs.docker.com/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Nginx Configuration](https://nginx.org/en/docs/)

## Поддержка

При возникновении проблем:
1. Проверьте логи: `docker compose logs -f`
2. Проверьте статус: `docker compose ps`
3. См. раздел Troubleshooting выше
