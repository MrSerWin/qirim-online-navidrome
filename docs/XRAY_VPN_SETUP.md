# Xray VPN Setup - Настройка VPN для видеозвонков

Это руководство описывает настройку Xray VLESS/WebSocket VPN на YOUR_DOMAIN для обеспечения безопасных видеозвонков через Telegram, WhatsApp и другие мессенджеры.

## Что такое Xray?

Xray - это современный высокопроизводительный VPN-туннель, который:
- Маскирует трафик под обычный HTTPS (невидим для блокировок)
- Обеспечивает высокую скорость для видеозвонков
- Работает через стандартный порт 443 (HTTPS)
- Использует существующий SSL-сертификат от Let's Encrypt

## Архитектура

```
Родители (Android)
    ↓
V2RayNG приложение (QR-код)
    ↓
HTTPS/TLS (YOUR_DOMAIN:443)
    ↓
Nginx (reverse proxy)
    ↓
Xray (Docker контейнер)
    ↓
Интернет (Telegram, WhatsApp и т.д.)
```

## Структура файлов

```
/opt/navidrome/
├── docker-compose.qirim-online.yml  # Конфигурация Xray контейнера
├── nginx/nginx-qirim-online.conf    # Nginx проксирование на Xray
├── xray/
│   └── config.json                  # Конфигурация Xray (UUID, порт и т.д.)
└── scripts/
    └── generate-xray-qr.sh          # Генератор QR-кода для подключения
```

## Настройка сервера

### 1. Конфигурация Xray

Файл [xray/config.json](../xray/config.json) содержит:

- **UUID клиента**: `4e9c72a8-5b3d-4f2e-9a1c-8d7e6f5a4b3c` (уникальный идентификатор)
- **Протокол**: VLESS (современный, легковесный)
- **Транспорт**: WebSocket на пути `/video_bridge_42`
- **Порт**: 10000 (внутренний, недоступен извне)

**Важно**: UUID уже сгенерирован. Чтобы создать новый UUID:

```bash
uuidgen | tr '[:upper:]' '[:lower:]'
```

### 2. Docker Compose

Xray запускается как отдельный контейнер в [docker-compose.qirim-online.yml](../docker-compose.qirim-online.yml):

```yaml
xray:
  image: teddysun/xray:latest
  container_name: xray-vless-prod
  restart: unless-stopped
  networks:
    - navidrome-net
  volumes:
    - ./xray/config.json:/etc/xray/config.json:ro
  command: xray run -c /etc/xray/config.json
```

### 3. Nginx Reverse Proxy

Nginx проксирует запросы с `https://YOUR_DOMAIN/video_bridge_42` на Xray контейнер.

В [nginx/nginx-qirim-online.conf](../nginx/nginx-qirim-online.conf):

```nginx
location /video_bridge_42 {
    proxy_pass http://xray_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    # ... остальные заголовки
}
```

**Путь `/video_bridge_42`** - это специальный путь для VPN-туннеля. Можно изменить на любой другой, но нужно обновить:
1. `xray/config.json` → `wsSettings.path`
2. `nginx/nginx-qirim-online.conf` → `location`
3. `scripts/generate-xray-qr.sh` → `PATH`

## Развертывание

### Первоначальная установка

1. **На локальном Mac**: Создайте папку xray на сервере:

```bash
ssh root@93.127.197.163
mkdir -p /opt/navidrome/xray
exit
```

2. **Загрузите конфигурацию на сервер**:

```bash
# Из локальной папки navidrome
scp xray/config.json root@93.127.197.163:/opt/navidrome/xray/
```

3. **Обновите docker-compose и nginx**:

```bash
scp docker-compose.qirim-online.yml root@93.127.197.163:/opt/navidrome/
scp nginx/nginx-qirim-online.conf root@93.127.197.163:/opt/navidrome/nginx/
```

4. **На сервере**: Перезапустите контейнеры:

```bash
cd /opt/navidrome
docker compose -f docker-compose.qirim-online.yml up -d
docker compose -f docker-compose.qirim-online.yml restart nginx
```

### Обновление конфигурации

Если изменили `xray/config.json`:

```bash
# Локально
scp xray/config.json root@93.127.197.163:/opt/navidrome/xray/

# На сервере
cd /opt/navidrome
docker compose -f docker-compose.qirim-online.yml restart xray
```

## Генерация QR-кода для родителей

### Автоматический способ (рекомендуется)

```bash
./scripts/generate-xray-qr.sh
```

Скрипт:
1. Генерирует VLESS URI строку
2. Создает QR-код в терминале (если установлен qrencode)
3. Сохраняет QR-код в файл `xray-qr-code.png`

**Установка qrencode** (если нужно):

```bash
brew install qrencode
```

### Ручной способ

VLESS URI формат:

```
vless://4e9c72a8-5b3d-4f2e-9a1c-8d7e6f5a4b3c@YOUR_DOMAIN:443?type=ws&security=tls&path=/video_bridge_42&sni=YOUR_DOMAIN&alpn=h2,http/1.1#YOUR_DOMAIN VPN
```

Используйте онлайн-генератор QR-кода: https://qr.io/

## Инструкция для родителей (конечных пользователей)

### Шаг 1: Установка приложения

**Android**:
- Скачать [V2RayNG](https://github.com/2dust/v2rayNG/releases) (APK файл, если Google Play недоступен)
- Или [Matsuri](https://github.com/MatsuriDayo/Matsuri/releases)

**iOS**:
- Установить [Shadowrocket](https://apps.apple.com/app/shadowrocket/id932747118) из App Store (платно)
- Или [OneClick](https://apps.apple.com/app/oneclick-safe-easy-fast/id1545555197)

### Шаг 2: Подключение через QR-код

1. Открыть приложение V2RayNG
2. Нажать на "+" (добавить сервер)
3. Выбрать "Scan QR code"
4. Отсканировать QR-код (отправить родителям по почте/WhatsApp)
5. Конфигурация автоматически загрузится

### Шаг 3: Активация VPN

1. Нажать на кнопку подключения (обычно значок "самолетик" или "Play")
2. Android попросит разрешение на VPN - нажать "OK"
3. В статус-баре появится значок ключа (VPN активен)

### Шаг 4: Использование

Теперь можно:
- Открыть Telegram/WhatsApp
- Совершать видеозвонки
- Весь трафик идет через безопасный туннель

**Важно**: VPN нужно включить ПЕРЕД открытием мессенджера!

## Мониторинг и диагностика

### Проверка статуса Xray

```bash
# На сервере
cd /opt/navidrome
docker compose -f docker-compose.qirim-online.yml ps xray
docker compose -f docker-compose.qirim-online.yml logs -f xray
```

### Проверка подключений

```bash
# Nginx логи - должны быть запросы на /video_bridge_42
docker compose -f docker-compose.qirim-online.yml exec nginx tail -f /var/log/nginx/YOUR_DOMAIN.access.log | grep video_bridge
```

### Тестирование подключения

С клиента (после подключения через V2RayNG):

```bash
# Проверить IP (должен показать IP вашего сервера)
curl https://ifconfig.me

# Проверить доступ к заблокированным ресурсам
curl https://www.youtube.com
```

## Безопасность

### UUID - секретный ключ

UUID (`4e9c72a8-5b3d-4f2e-9a1c-8d7e6f5a4b3c`) является секретным идентификатором:
- Не публикуйте его в открытом доступе
- Меняйте UUID при компрометации
- Один UUID = один пользователь/семья

### Изменение UUID

1. Сгенерировать новый:
```bash
uuidgen | tr '[:upper:]' '[:lower:]'
```

2. Обновить в `xray/config.json`:
```json
"clients": [
  {
    "id": "НОВЫЙ-UUID-ЗДЕСЬ",
    ...
  }
]
```

3. Перезапустить Xray и сгенерировать новый QR-код

### Смена пути WebSocket

Для дополнительной безопасности можно изменить путь `/video_bridge_42`:

1. `xray/config.json` → `"path": "/новый_путь"`
2. `nginx/nginx-qirim-online.conf` → `location /новый_путь`
3. `scripts/generate-xray-qr.sh` → `PATH="/новый_путь"`

## Производительность

### Скорость

Xray VLESS - один из самых быстрых VPN протоколов:
- Минимальные накладные расходы
- Поддержка HTTP/2 и HTTP/3
- Оптимизирован для видео

### Ресурсы сервера

Xray контейнер потребляет минимум ресурсов:
- ~20-50 МБ RAM в режиме ожидания
- ~100-200 МБ RAM при активном видеозвонке
- CPU < 5% при типичной нагрузке

### Лимиты

По умолчанию нет лимитов. Для добавления:

```json
// В xray/config.json → policy
"policy": {
  "levels": {
    "0": {
      "uplinkOnly": 0,
      "downlinkOnly": 0,
      "statsUserUplink": true,
      "statsUserDownlink": true
    }
  }
}
```

## Troubleshooting

### Проблема: Не удается подключиться

**Проверьте**:
1. Контейнер Xray запущен: `docker ps | grep xray`
2. Nginx проксирует запросы: `curl -I https://YOUR_DOMAIN/video_bridge_42`
3. Firewall не блокирует порт 443
4. SSL-сертификат валиден: `curl -v https://YOUR_DOMAIN`

### Проблема: Медленная скорость

**Попробуйте**:
1. Проверить нагрузку сервера: `htop`
2. Увеличить таймауты в nginx (уже установлены 300s)
3. Проверить пропускную способность сети сервера

### Проблема: Подключение обрывается

**Решение**:
1. Увеличьте таймауты в [nginx/nginx-qirim-online.conf](../nginx/nginx-qirim-online.conf):
```nginx
proxy_connect_timeout 600s;
proxy_send_timeout 600s;
proxy_read_timeout 600s;
```

2. Перезапустите nginx:
```bash
docker compose -f docker-compose.qirim-online.yml restart nginx
```

### Проблема: QR-код не сканируется

**Решение**:
1. Вручную введите параметры в V2RayNG:
   - Address: YOUR_DOMAIN
   - Port: 443
   - UUID: (скопируйте из config.json)
   - Network: ws
   - Path: /video_bridge_42
   - TLS: On
   - SNI: YOUR_DOMAIN

2. Или отправьте VLESS URI текстом и используйте "Import from clipboard"

## Дополнительные возможности

### Добавление нескольких пользователей

В `xray/config.json`:

```json
"clients": [
  {
    "id": "uuid-1",
    "email": "parents@YOUR_DOMAIN"
  },
  {
    "id": "uuid-2",
    "email": "friends@YOUR_DOMAIN"
  }
]
```

Для каждого пользователя нужен свой UUID и QR-код.

### Статистика использования

Добавить в `xray/config.json`:

```json
"stats": {},
"api": {
  "tag": "api",
  "services": ["StatsService"]
}
```

Затем использовать `xray api stats` для просмотра статистики.

### Ротация логов

Логи Xray собираются через Docker. Настройка ротации в docker-compose:

```yaml
xray:
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
```

## Полезные ссылки

- [Официальная документация Xray](https://xtls.github.io/)
- [V2RayNG (Android клиент)](https://github.com/2dust/v2rayNG)
- [Генератор UUID](https://www.uuidgenerator.net/)
- [QR Code Generator](https://qr.io/)

## Поддержка

При возникновении проблем:
1. Проверьте логи: `docker compose logs xray nginx`
2. Проверьте статус контейнеров: `docker compose ps`
3. См. раздел Troubleshooting выше
