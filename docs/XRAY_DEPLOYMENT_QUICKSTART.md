# Xray VPN - Быстрое развертывание

Краткая инструкция по развертыванию Xray VPN на YOUR_DOMAIN.

## Что сделано

✅ Создана конфигурация Xray ([xray/config.json](xray/config.json))
✅ Добавлен Xray контейнер в [docker-compose.qirim-online.yml](docker-compose.qirim-online.yml)
✅ Обновлен Nginx для проксирования ([nginx/nginx-qirim-online.conf](nginx/nginx-qirim-online.conf))
✅ Создан скрипт генерации QR-кода ([scripts/generate-xray-qr.sh](scripts/generate-xray-qr.sh))
✅ Написана полная документация ([docs/XRAY_VPN_SETUP.md](docs/XRAY_VPN_SETUP.md))

## Развертывание на сервере

### 1. Создать папку xray на сервере

```bash
cd /opt/navidrome
mkdir -p xray
```

### 2. Загрузить конфигурацию Xray

```bash
# На локальном Mac (из папки navidrome)
scp xray/config.json root@93.127.197.163:/opt/navidrome/xray/
```

### 3. Обновить docker-compose и nginx

```bash
# На локальном Mac
scp docker-compose.qirim-online.yml root@93.127.197.163:/opt/navidrome/
scp nginx/nginx-qirim-online.conf root@93.127.197.163:/opt/navidrome/nginx/
```

### 4. Запустить Xray контейнер

```bash
# На сервере
cd /opt/navidrome
docker compose -f docker-compose.qirim-online.yml up -d xray
docker compose -f docker-compose.qirim-online.yml restart nginx
```

### 5. Проверить статус

```bash
# Проверить запущен ли Xray
docker compose -f docker-compose.qirim-online.yml ps xray

# Посмотреть логи
docker compose -f docker-compose.qirim-online.yml logs -f xray
```

Должен быть вывод:
```
xray-vless-prod   Up   (healthy)
```

## Генерация QR-кода для родителей

На локальном Mac:

```bash
./scripts/generate-xray-qr.sh
```

Скрипт выведет:
1. **VLESS URI** - строку для ручного ввода
2. **QR-код в терминале** (если установлен qrencode)
3. **Файл xray-qr-code.png** - для отправки родителям

### Установка qrencode (опционально)

```bash
brew install qrencode
```

Затем повторно запустите скрипт для генерации QR-кода.

## Инструкция для родителей

**Шаг 1: Установить приложение**
- Android: [V2RayNG](https://github.com/2dust/v2rayNG/releases) (скачать APK)
- iOS: [Shadowrocket](https://apps.apple.com/app/shadowrocket/id932747118) (платно $2.99)

**Шаг 2: Отсканировать QR-код**
1. Открыть V2RayNG
2. Нажать "+" → "Scan QR code"
3. Отсканировать QR-код (отправьте им файл `xray-qr-code.png`)

**Шаг 3: Подключиться**
1. Нажать кнопку "самолетик" (подключение)
2. Разрешить VPN (Android спросит один раз)
3. Открыть Telegram/WhatsApp и звонить!

## Технические детали

### Протокол
- **VLESS** через **WebSocket** + **TLS**
- Порт: **443** (HTTPS)
- Path: **/video_bridge_42**
- Домен: **YOUR_DOMAIN**

### Безопасность
- UUID: `4e9c72a8-5b3d-4f2e-9a1c-8d7e6f5a4b3c` (секретный ключ доступа)
- SSL-сертификат от Let's Encrypt (уже настроен)
- Трафик замаскирован под обычный HTTPS

### Архитектура

```
Клиент (V2RayNG)
    ↓
HTTPS/TLS (YOUR_DOMAIN:443)
    ↓
Nginx (reverse proxy) → /video_bridge_42
    ↓
Xray (Docker) → порт 10000
    ↓
Интернет
```

## Проверка работоспособности

### На сервере

```bash
# Проверить контейнер
docker ps | grep xray

# Проверить логи
docker logs xray-vless-prod

# Проверить Nginx прокси
curl -I https://YOUR_DOMAIN/video_bridge_42
# Ожидаемый ответ: 400 Bad Request (нормально для WebSocket без upgrade)
```

### С клиента (после подключения)

```bash
# Проверить IP (должен быть IP вашего сервера)
curl https://ifconfig.me

# Или через браузер
# Открыть: https://whoer.net/
```

## Обновление конфигурации

Если нужно изменить UUID или другие параметры:

```bash
# 1. Отредактировать локально xray/config.json
# 2. Загрузить на сервер
scp xray/config.json root@93.127.197.163:/opt/navidrome/xray/

# 3. Перезапустить Xray
cd /opt/navidrome
docker compose -f docker-compose.qirim-online.yml restart xray

# 4. Сгенерировать новый QR-код
./scripts/generate-xray-qr.sh
```

## Troubleshooting

### Проблема: Xray не запускается

```bash
# Проверить синтаксис config.json
docker compose -f docker-compose.qirim-online.yml logs xray

# Проверить что файл существует
ls -lh /opt/navidrome/xray/config.json
```

### Проблема: Не удается подключиться

1. Проверить что Xray запущен: `docker ps | grep xray`
2. Проверить Nginx: `docker logs navidrome-nginx-prod | grep video_bridge`
3. Проверить firewall на сервере: `ufw status` (порт 443 должен быть открыт)

### Проблема: Медленная скорость

1. Проверить нагрузку сервера: `htop`
2. Проверить пинг: `ping YOUR_DOMAIN`
3. Попробовать другой путь WebSocket (изменить `/video_bridge_42`)

## Дополнительные функции

### Добавление нескольких пользователей

Отредактируйте `xray/config.json`:

```json
"clients": [
  {
    "id": "uuid-user-1",
    "email": "parents@YOUR_DOMAIN"
  },
  {
    "id": "uuid-user-2",
    "email": "friends@YOUR_DOMAIN"
  }
]
```

Каждому пользователю нужен свой UUID (сгенерировать: `uuidgen | tr '[:upper:]' '[:lower:]'`)

### Изменение пути WebSocket

Для дополнительной безопасности:

1. `xray/config.json` → `"path": "/new_secret_path"`
2. `nginx/nginx-qirim-online.conf` → `location /new_secret_path`
3. `scripts/generate-xray-qr.sh` → `PATH="/new_secret_path"`

Затем перезапустите Xray и Nginx, сгенерируйте новый QR-код.

## Полезные команды

```bash
# Статус всех контейнеров
docker compose -f docker-compose.qirim-online.yml ps

# Логи Xray (real-time)
docker compose -f docker-compose.qirim-online.yml logs -f xray

# Логи Nginx (фильтр по Xray пути)
docker compose -f docker-compose.qirim-online.yml logs nginx | grep video_bridge

# Перезапуск Xray
docker compose -f docker-compose.qirim-online.yml restart xray

# Остановка Xray
docker compose -f docker-compose.qirim-online.yml stop xray

# Удаление Xray (если нужно)
docker compose -f docker-compose.qirim-online.yml down xray
```

## Ссылки

- **Полная документация**: [docs/XRAY_VPN_SETUP.md](docs/XRAY_VPN_SETUP.md)
- **Xray GitHub**: https://github.com/XTLS/Xray-core
- **V2RayNG (Android)**: https://github.com/2dust/v2rayNG
- **Online QR Generator**: https://qr.io/

## Что дальше?

После успешного развертывания:

1. ✅ Сгенерируйте QR-код: `./scripts/generate-xray-qr.sh`
2. ✅ Отправьте QR-код родителям (файл `xray-qr-code.png`)
3. ✅ Помогите им установить V2RayNG и подключиться
4. ✅ Проверьте что видеозвонки работают (Telegram/WhatsApp)

**Готово!** 🎉
