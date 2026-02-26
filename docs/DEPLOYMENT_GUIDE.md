# Deployment Guide

Полная инструкция по деплою всех проектов на VPS `93.127.197.163`.

## Оглавление

- [Первоначальная настройка сервера](#первоначальная-настройка-сервера)
- [Структура сервера](#структура-сервера)
- [Деплой Nginx конфигов](#деплой-nginx-конфигов)
- [Деплой Navidrome (qirim.online)](#деплой-navidrome-qirimonline)
- [Деплой Sevil AI Hub (sevil.chat)](#деплой-sevil-ai-hub-sevilchat)
- [Деплой Share App (ana-yurt.dev)](#деплой-share-app-ana-yurtdev)
- [SSL сертификаты](#ssl-сертификаты)
- [Cron задачи](#cron-задачи)
- [Бэкапы](#бэкапы)
- [Добавление нового домена](#добавление-нового-домена)
- [Мониторинг и диагностика](#мониторинг-и-диагностика)
- [Частые проблемы и решения](#частые-проблемы-и-решения)

---

## Первоначальная настройка сервера

Выполняется один раз при настройке нового сервера.

### 1. Установка зависимостей

```bash
apt update && apt install -y nginx certbot docker.io docker-compose-plugin
```

### 2. Создание директорий

```bash
mkdir -p /etc/nginx/snippets /etc/nginx/conf.d /var/www/certbot
mkdir -p /opt/navidrome /opt/sevil-ai-hub /opt/share-app /opt/mailcow-dockerized
```

### 3. Защита nginx от перезаписи при apt upgrade

```bash
echo "nginx hold" | dpkg --set-selections
```

Проверка: `dpkg --get-selections | grep nginx`

### 4. Деплой nginx конфигов

См. [Деплой Nginx конфигов](#деплой-nginx-конфигов).

### 5. Настройка cron задач

```bash
crontab -e
```

Добавить:
```cron
# SSL certificate renewal (daily at 3:00 AM)
0 3 * * * /opt/navidrome/scripts/renew-certs.sh >> /var/log/ssl-renew.log 2>&1

# Navidrome database backup (daily at 2:00 AM)
0 2 * * * /opt/navidrome/scripts/backup-database.sh >> /var/log/navidrome-backup.log 2>&1
```

---

## Структура сервера

```
/opt/
├── navidrome/                    ← Navidrome (qirim.online)
│   ├── docker-compose.qirim-online.yml
│   ├── data/                     ← данные + SQLite DB
│   ├── music/                    ← музыкальная библиотека
│   ├── nginx/                    ← nginx конфиги (источник правды)
│   │   ├── nginx.conf
│   │   ├── snippets/
│   │   └── conf.d/
│   └── scripts/
│
├── sevil-ai-hub/                 ← Sevil AI Hub (sevil.chat)
│   ├── docker/
│   │   └── docker-compose.sevil.chat.yml
│   └── nginx/
│       └── conf.d/
│
├── share-app/                    ← Share App (ana-yurt.dev)
│   ├── docker-compose.yml
│   ├── website/                  ← статический лендинг
│   └── nginx/
│       └── conf.d/
│
└── mailcow-dockerized/           ← Mailcow (mail.qirim.online)
    ├── docker-compose.yml
    └── docker-compose.override.yml  ← фиксированный IP 172.22.1.10

/etc/nginx/
├── nginx.conf                    ← минимальный базовый конфиг
├── snippets/                     ← общие SSL/headers/proxy настройки
└── conf.d/                       ← per-site конфиги (нумерованные)
```

---

## Деплой Nginx конфигов

Nginx конфиги хранятся в трёх репозиториях. Каждый проект управляет своими файлами.

### Полный деплой всех конфигов

```bash
# 1. Копируем базу и общие файлы (из navidrome репо)
cp /opt/navidrome/nginx/nginx.conf /etc/nginx/nginx.conf
cp /opt/navidrome/nginx/snippets/* /etc/nginx/snippets/
cp /opt/navidrome/nginx/conf.d/* /etc/nginx/conf.d/

# 2. Копируем Sevil конфиг
cp /opt/sevil-ai-hub/nginx/conf.d/* /etc/nginx/conf.d/

# 3. Копируем Share App конфиги
cp /opt/share-app/nginx/conf.d/* /etc/nginx/conf.d/

# 4. Проверяем и применяем
nginx -t && systemctl reload nginx
```

### Обновление конфига одного сайта

```bash
# Пример: обновили только Sevil
cp /opt/sevil-ai-hub/nginx/conf.d/30-sevil-chat.conf /etc/nginx/conf.d/
nginx -t && systemctl reload nginx
```

### Важно

- Всегда проверяй `nginx -t` перед reload/restart
- Используй `systemctl reload nginx` (не restart) чтобы не терять соединения
- Если `nginx -t` падает на отсутствующем сертификате — закомментируй HTTPS блок этого сайта

---

## Деплой Navidrome (qirim.online)

### Быстрый деплой (обычное обновление)

Запуск с локальной машины:

```bash
cd /Volumes/T9/1_dev/1_QO/myQO/navidrome
./scripts/rebuild-and-deploy-qirim-online.sh
```

Скрипт автоматически:
1. Собирает Docker образ для linux/amd64
2. Сохраняет в tar
3. Загружает на сервер
4. Загружает образ и перезапускает контейнер

Время: ~3-5 минут.

### Ручной деплой

```bash
# На локальной машине
./build-image.sh
docker save -o /tmp/navidrome-qo.tar navidrome-qo:latest
scp /tmp/navidrome-qo.tar root@93.127.197.163:/tmp/
```

```bash
# На сервере
docker load -i /tmp/navidrome-qo.tar
rm /tmp/navidrome-qo.tar
cd /opt/navidrome
docker compose -f docker-compose.qirim-online.yml stop navidrome
docker compose -f docker-compose.qirim-online.yml up -d navidrome
```

### Обновление docker-compose

```bash
# С локальной машины
scp docker-compose.qirim-online.yml root@93.127.197.163:/opt/navidrome/

# На сервере
cd /opt/navidrome
docker compose -f docker-compose.qirim-online.yml up -d
```

### Проверка после деплоя

```bash
# Статус контейнера
docker compose -f docker-compose.qirim-online.yml ps

# Логи (последние 50 строк)
docker compose -f docker-compose.qirim-online.yml logs --tail=50 navidrome

# HTTP проверка
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4533       # 302
curl -s -o /dev/null -w "%{http_code}" https://qirim.online         # 302
```

---

## Деплой Sevil AI Hub (sevil.chat)

### Сборка и деплой

```bash
# На локальной машине (из sevil-ai-hub директории)
cd /Volumes/T9/1_dev/1_AI/sevil-ai-hub
./deploy.sh   # или ручной деплой ниже
```

### Ручной деплой

```bash
# Сборка образов
cd /opt/sevil-ai-hub/docker
docker compose -f docker-compose.sevil.chat.yml build

# Перезапуск
docker compose -f docker-compose.sevil.chat.yml down
docker compose -f docker-compose.sevil.chat.yml up -d
```

### Обновление nginx конфига

```bash
scp nginx/conf.d/30-sevil-chat.conf root@93.127.197.163:/etc/nginx/conf.d/
ssh root@93.127.197.163 'nginx -t && systemctl reload nginx'
```

### Проверка

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/   # Django
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000         # Next.js
curl -s -o /dev/null -w "%{http_code}" https://sevil.chat             # 200
```

---

## Деплой Share App (ana-yurt.dev)

### Архитектура

Share App — монорепо с workspaces:
- `packages/server` — Next.js приложение (backend + frontend)
- `packages/shared` — общие типы и утилиты
- `packages/desktop` — macOS десктоп клиент (НЕ деплоится на сервер)

Next.js использует `output: 'standalone'` — это значит:
- Статические файлы (`_next/static/`) **не** обслуживаются Node.js сервером
- Они расшариваются через volume и обслуживаются nginx напрямую
- Путь на хосте: `/opt/share-app/data/next-static/`

### Первый деплой

#### 1. Загрузить файлы на сервер

**Важно**: НЕ копировать весь проект (`scp -r`). Загружать только нужные файлы:

```bash
# Создать директорию
mkdir -p /opt/share-app

# С локальной машины — структурные файлы
scp /Volumes/T9/1_dev/share-app/package.json root@93.127.197.163:/opt/share-app/
scp /Volumes/T9/1_dev/share-app/package-lock.json root@93.127.197.163:/opt/share-app/
scp /Volumes/T9/1_dev/share-app/tsconfig.base.json root@93.127.197.163:/opt/share-app/
scp /Volumes/T9/1_dev/share-app/docker-compose.yml root@93.127.197.163:/opt/share-app/
scp /Volumes/T9/1_dev/share-app/.env.example root@93.127.197.163:/opt/share-app/

# Только server и shared пакеты (НЕ desktop!)
scp -r /Volumes/T9/1_dev/share-app/packages/server root@93.127.197.163:/opt/share-app/packages/
scp -r /Volumes/T9/1_dev/share-app/packages/shared root@93.127.197.163:/opt/share-app/packages/
```

#### 2. Настроить .env

```bash
cp /opt/share-app/.env.example /opt/share-app/.env
nano /opt/share-app/.env
```

**Критически важно**: `DB_PASSWORD` должен генерироваться через `openssl rand -hex 32` (НЕ `-base64`!). Base64 содержит `/` и `=`, которые ломают DATABASE_URL.

```bash
# Генерация безопасных секретов
openssl rand -hex 32  # для DB_PASSWORD
openssl rand -hex 32  # для NEXTAUTH_SECRET
openssl rand -hex 32  # для CRON_SECRET
```

#### 3. Загрузить лендинг

Файлы лендинга должны быть в `/opt/share-app/website/`.

#### 4. Создать директорию для статических файлов

```bash
mkdir -p /opt/share-app/data/next-static
chown -R 1001:1001 /opt/share-app/data/next-static
```

Контейнер работает от пользователя `nextjs` (uid 1001), поэтому ему нужны права на запись.

#### 5. Настроить DNS

Направить `ana-yurt.dev` и `shareapp.ana-yurt.dev` на `93.127.197.163`.

**Если домен на Cloudflare**: выставить режим "DNS only" (серая иконка), НЕ "Proxied" (оранжевая). Иначе certbot не сможет получить сертификат — ACME challenge пойдёт через Cloudflare.

#### 6. Получить SSL сертификаты

```bash
certbot certonly --webroot -w /var/www/certbot -d ana-yurt.dev -d www.ana-yurt.dev
certbot certonly --webroot -w /var/www/certbot -d shareapp.ana-yurt.dev
```

#### 7. Раскомментировать HTTPS блоки в nginx конфигах

- `50-ana-yurt-dev.conf` — раскомментировать HTTPS server block
- `60-shareapp.conf` — раскомментировать HTTPS server block

```bash
nginx -t && systemctl reload nginx
```

#### 8. Собрать и запустить контейнеры

```bash
cd /opt/share-app
docker compose build server
docker compose up -d
```

Проверить логи:
```bash
docker compose logs --tail=20 server
```

Должно быть: "No pending migrations to apply", "Syncing static files...", "Starting server..."

### Последующие обновления

```bash
# 1. Загрузить обновлённые файлы (с локальной машины)
scp -r /Volumes/T9/1_dev/share-app/packages/server root@93.127.197.163:/opt/share-app/packages/
scp -r /Volumes/T9/1_dev/share-app/packages/shared root@93.127.197.163:/opt/share-app/packages/

# 2. На сервере: пересобрать и перезапустить
cd /opt/share-app
docker compose build server
docker compose up -d server
```

### Docker-специфика Share App

**Dockerfile** (`packages/server/Dockerfile`) — multi-stage build:
1. `deps` — установка npm dependencies
2. `shared-builder` — сборка shared пакета
3. `builder` — генерация Prisma клиента + сборка Next.js
4. `runner` — production образ

**Важные моменты**:
- Standalone node_modules в монорепо содержит симлинки → полные `node_modules` копируются из builder поверх standalone
- Статические файлы (`_next/static`) копируются ПОСЛЕ `node_modules` чтобы не были перезаписаны
- Prisma CLI нужен для миграций при старте → используется из `./node_modules/prisma/build/index.js`
- `docker-entrypoint.sh` сначала запускает миграции, потом синхронизирует статику в shared volume, потом стартует сервер

**Если сервер крутится в restart loop**:
```bash
docker compose logs --tail=50 server
```

Частые причины:
- `prisma: not found` — entrypoint использует `npx prisma` вместо прямого пути
- `MODULE_NOT_FOUND: next` — standalone симлинки сломаны, нужен полный node_modules
- `P1013: invalid port number` — спецсимволы в DB_PASSWORD (см. выше)
- `P1000: Authentication failed` — postgres volume хранит старый пароль, нужно пересоздать:
  ```bash
  docker compose down
  docker volume rm share-app_pgdata
  docker compose up -d
  ```

### Проверка

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001         # Share App (200)
curl -s -o /dev/null -w "%{http_code}" https://ana-yurt.dev           # Landing (200)
curl -s -o /dev/null -w "%{http_code}" https://shareapp.ana-yurt.dev  # App (200)
```

---

## SSL сертификаты

### Текущие сертификаты

| Домен | Статус |
|-------|--------|
| qirim.online | Активен, автообновление |
| mail.qirim.online | Активен, автообновление |
| sevil.chat | Активен, автообновление |
| ana-yurt.dev | Активен, автообновление |
| shareapp.ana-yurt.dev | Активен, автообновление |
| qirim.cloud | Ожидает DNS + certbot |

### Проверка сроков

```bash
for domain in qirim.online mail.qirim.online sevil.chat ana-yurt.dev shareapp.ana-yurt.dev; do
  expiry=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$domain/cert.pem" 2>/dev/null | cut -d= -f2)
  echo "$domain: $expiry"
done
```

### Получение нового сертификата

Перед получением: DNS A-запись домена должна указывать на `93.127.197.163`.

```bash
# Одиночный домен
certbot certonly --webroot -w /var/www/certbot -d example.com

# С www
certbot certonly --webroot -w /var/www/certbot -d example.com -d www.example.com
```

После получения:
1. Раскомментировать HTTPS server block в соответствующем nginx конфиге
2. `nginx -t && systemctl reload nginx`
3. Добавить домен в массив `DOMAINS` в `renew-certs.sh`

### Автообновление

Скрипт `/opt/navidrome/scripts/renew-certs.sh` запускается ежедневно в 3:00 через cron:

```
0 3 * * * /opt/navidrome/scripts/renew-certs.sh >> /var/log/ssl-renew.log 2>&1
```

Что делает:
1. `certbot renew --quiet` — обновляет сертификаты, срок которых < 30 дней
2. `--deploy-hook "nginx -t && systemctl reload nginx"` — перезагружает nginx только если сертификат обновился
3. Проверяет и логирует сроки всех сертификатов

Лог: `/var/log/ssl-renew.log`

### Ручное обновление

```bash
certbot renew --dry-run   # тест (ничего не обновляет)
certbot renew              # обновление
nginx -t && systemctl reload nginx
```

### Важно

- **Nginx работает на хосте**, не в Docker. Поэтому `systemctl reload nginx`, а не `docker exec`
- Certbot использует webroot `/var/www/certbot` — HTTP server block каждого сайта имеет `location /.well-known/acme-challenge/` для этого
- Не удаляй HTTP server блоки — они нужны для ACME challenge при обновлении сертификатов
- **Cloudflare**: если домен на Cloudflare, перед получением сертификата выставить "DNS only" (серая иконка). Cloudflare Proxy перехватывает ACME challenge и certbot получит ошибку

---

## Cron задачи

Настроить через `crontab -e`:

```cron
# SSL certificate renewal — ежедневно в 3:00
0 3 * * * /opt/navidrome/scripts/renew-certs.sh >> /var/log/ssl-renew.log 2>&1

# Navidrome database backup — ежедневно в 2:00
0 2 * * * /opt/navidrome/scripts/backup-database.sh >> /var/log/navidrome-backup.log 2>&1
```

Проверка текущих задач: `crontab -l`

---

## Бэкапы

### Navidrome (SQLite)

```bash
/opt/navidrome/scripts/backup-database.sh
```

- Бэкапы сохраняются в `/opt/navidrome/data/backups/`
- Хранятся 30 дней, старые удаляются автоматически
- Формат: `navidrome-YYYYMMDD-HHMMSS.db`

### Sevil AI Hub (PostgreSQL)

```bash
docker exec sevil-db pg_dump -U sevilhub_user sevilhub > /opt/sevil-ai-hub/backup-$(date +%Y%m%d).sql
```

### Share App (PostgreSQL)

```bash
docker exec share-app-postgres-1 pg_dump -U shareapp shareapp > /opt/share-app/backup-$(date +%Y%m%d).sql
```

### Mailcow

Mailcow имеет встроенный бэкап:

```bash
cd /opt/mailcow-dockerized
./helper-scripts/backup_and_restore.sh backup
```

---

## Добавление нового домена

Пошаговая инструкция для добавления нового сайта на сервер.

### 1. Создать nginx конфиг

Создать файл `XX-domain-name.conf` (где XX — порядковый номер):

```nginx
# HTTP server (for ACME challenge and redirect)
server {
    listen 80;
    server_name newdomain.com www.newdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server — UNCOMMENT after obtaining SSL certificate
# server {
#     listen 443 ssl;
#     http2 on;
#     server_name newdomain.com www.newdomain.com;
#
#     ssl_certificate /etc/letsencrypt/live/newdomain.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/newdomain.com/privkey.pem;
#     include /etc/nginx/snippets/ssl-params.conf;
#     include /etc/nginx/snippets/security-headers.conf;
#
#     location / {
#         proxy_pass http://127.0.0.1:PORT;
#         include /etc/nginx/snippets/proxy-params.conf;
#     }
# }
```

### 2. Загрузить и активировать

```bash
cp XX-domain-name.conf /etc/nginx/conf.d/
nginx -t && systemctl reload nginx
```

### 3. Настроить DNS

В DNS-провайдере создать A-запись:
- `newdomain.com` → `93.127.197.163`
- `www.newdomain.com` → `93.127.197.163`

Подождать 5-10 минут для пропагации.

### 4. Получить SSL сертификат

```bash
certbot certonly --webroot -w /var/www/certbot -d newdomain.com -d www.newdomain.com
```

### 5. Активировать HTTPS

Раскомментировать HTTPS server block в конфиге.

```bash
nginx -t && systemctl reload nginx
```

### 6. Добавить в renew-certs.sh

Добавить домен в массив `DOMAINS` в `/opt/navidrome/scripts/renew-certs.sh`.

---

## Мониторинг и диагностика

### Быстрая проверка всех сервисов

```bash
echo "=== Nginx ==="
systemctl is-active nginx

echo "=== Navidrome ==="
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4533

echo "=== Mailcow ==="
curl -sk -o /dev/null -w "%{http_code}" https://172.22.1.10:443

echo "=== Sevil Backend ==="
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000

echo "=== Sevil Frontend ==="
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000

echo "=== Share App ==="
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001

echo "=== HTTPS (external) ==="
for site in qirim.online mail.qirim.online sevil.chat ana-yurt.dev shareapp.ana-yurt.dev; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://$site")
  echo "$site: $code"
done
```

### Комплексная проверка

```bash
/opt/navidrome/scripts/health-check.sh
```

### Логи

```bash
# Nginx (все сайты)
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/qirim.online.error.log
tail -f /var/log/nginx/sevil.chat.error.log

# Navidrome
cd /opt/navidrome && docker compose -f docker-compose.qirim-online.yml logs -f navidrome

# Sevil
cd /opt/sevil-ai-hub/docker && docker compose -f docker-compose.sevil.chat.yml logs -f backend
cd /opt/sevil-ai-hub/docker && docker compose -f docker-compose.sevil.chat.yml logs -f frontend

# Share App
cd /opt/share-app && docker compose logs -f server

# Mailcow
cd /opt/mailcow-dockerized && docker compose logs -f nginx-mailcow

# SSL renewal
tail -f /var/log/ssl-renew.log
```

### Диск

```bash
df -h /
docker system df   # Docker disk usage
```

### Очистка Docker

```bash
# Удалить неиспользуемые образы и контейнеры
docker system prune -f

# Удалить всё неиспользуемое (включая volumes — ОСТОРОЖНО)
docker system prune -af --volumes
```

---

## Частые проблемы и решения

### Сайт не открывается (HTTPS возвращает 000)

Nginx не слушает порт 443.

```bash
systemctl status nginx
nginx -t
```

Если конфиг сломан — восстановить:
```bash
cp /opt/navidrome/nginx/nginx.conf /etc/nginx/nginx.conf
cp /opt/navidrome/nginx/snippets/* /etc/nginx/snippets/
cp /opt/navidrome/nginx/conf.d/* /etc/nginx/conf.d/
cp /opt/sevil-ai-hub/nginx/conf.d/* /etc/nginx/conf.d/
cp /opt/share-app/nginx/conf.d/* /etc/nginx/conf.d/
nginx -t && systemctl restart nginx
```

### 502 Bad Gateway

Бэкенд контейнер не запущен или недоступен.

```bash
# Проверить контейнеры
docker ps -a | grep -E "navidrome|sevil|share"

# Проверить порты
ss -tlnp | grep -E "4533|8000|3000|3001"

# Перезапустить нужный контейнер
cd /opt/navidrome && docker compose -f docker-compose.qirim-online.yml restart navidrome
```

### Nginx не стартует: "host not found in upstream"

В конфиге использовано Docker имя вместо IP.

Решение: заменить `proxy_pass http://container_name:port` на `proxy_pass http://127.0.0.1:port`.

### Nginx не стартует: "cannot load certificate"

SSL сертификат не найден для домена.

```bash
# Проверить наличие сертификата
ls -la /etc/letsencrypt/live/

# Если сертификата нет — закомментировать HTTPS блок этого домена
# или получить сертификат:
certbot certonly --webroot -w /var/www/certbot -d domain.com
```

### Mailcow 502

Docker IP мог измениться.

```bash
# Проверить текущий IP
docker inspect mailcowdockerized-nginx-mailcow-1 \
  --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'

# Если не 172.22.1.10 — пересоздать контейнер
cd /opt/mailcow-dockerized
docker compose up -d --force-recreate nginx-mailcow
```

### Сертификат не обновился

```bash
# Проверить лог
tail -50 /var/log/ssl-renew.log

# Ручное обновление
certbot renew --dry-run   # тест
certbot renew              # обновление
nginx -t && systemctl reload nginx

# Проверить cron
crontab -l | grep renew
```

### Docker-контейнер не стартует

```bash
# Посмотреть логи
docker logs <container_name> --tail=50

# Частые причины:
# - Порт занят другим контейнером: ss -tlnp | grep PORT
# - Нет свободного места: df -h /
# - Образ не загружен: docker images | grep IMAGE_NAME
```

### Порт 80/443 занят Docker nginx

Если старый Docker nginx ещё работает:

```bash
# Найти и остановить
docker ps | grep nginx
docker stop <container_id>

# Или через compose
cd /opt/navidrome && docker compose -f docker-compose.qirim-online.yml stop nginx
```

---

## Полезные команды

```bash
# Перезапуск всех сервисов
systemctl restart nginx
cd /opt/navidrome && docker compose -f docker-compose.qirim-online.yml restart
cd /opt/sevil-ai-hub/docker && docker compose -f docker-compose.sevil.chat.yml restart
cd /opt/share-app && docker compose restart

# Обновить docker-compose на сервере (с локальной машины)
scp docker-compose.qirim-online.yml root@93.127.197.163:/opt/navidrome/

# Посмотреть все запущенные контейнеры
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Проверить кто слушает какие порты
ss -tlnp | grep -E "80|443|4533|8000|3000|3001"
```
