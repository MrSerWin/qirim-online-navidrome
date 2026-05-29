# Nginx — реальная архитектура и как править

> Один источник правды о nginx на проде. Если в других доках или CLAUDE.md что-то противоречит — этот файл прав.

## TL;DR

- **Nginx работает на хосте** через systemd (`nginx.service`), **не в Docker**.
- Реальный конфиг qirim.online: **`/etc/nginx/conf.d/10-qirim-online.conf`**.
- `deploy.sh` **НЕ деплоит** nginx — только Go-бинарь navidrome.
- Файлы в `nginx/` в репо — **референс / черновики**, разошлись с продом. Не доверять как источнику правды.

## Где что лежит на проде (`93.127.197.163`)

```
/etc/nginx/
├── nginx.conf                       ← главный конфиг (worker_processes, events, http, include conf.d/*)
├── conf.d/
│   ├── 00-common.conf               ← общие http-настройки, map, gzip
│   ├── 05-admin-portainer.conf      ← Portainer admin
│   ├── 10-qirim-online.conf         ← ⭐ qirim.online (то, что чаще всего правим)
│   ├── 20-mail-qirim.conf           ← mail.qirim.online → Mailcow
│   └── 40-qirim-cloud.conf          ← qirim.cloud
├── snippets/
│   ├── proxy-params.conf            ← общие proxy_set_header
│   ├── security-headers.conf        ← HSTS, X-Frame-Options, CSP и т.п.
│   └── ssl-params.conf              ← общие ssl_* параметры
└── ssl/                             ← пусто (сертификаты от certbot в /etc/letsencrypt/)
```

`docker ps` показывает `mailcowdockerized-nginx-mailcow-1` — это **отдельный** nginx внутри Mailcow-стека, обслуживает только сам Mailcow на 127.0.0.1, не пересекается с хост-nginx.

## Что лежит в репо (`nginx/`) и зачем

```
nginx/
├── nginx-qirim-online.conf          ⚠ OUT OF SYNC c прод. Полный nginx.conf (events+http обёртка).
│                                       Историческая «всё в одном» версия. Не править вместо прод.
├── nginx.conf                       Малый файл, мэп в docker-compose.yml (которое НЕ используется на прод).
├── conf.d/                          Зеркало прод-фрагментов, но тоже может быть устаревшим.
│   ├── 00-common.conf
│   ├── 05-admin-portainer.conf
│   ├── 10-qirim-online.conf
│   ├── 20-mail-qirim.conf
│   └── 40-qirim-cloud.conf
├── snippets/                        То же зеркало. На проде включены через `include /etc/nginx/snippets/...`.
│   ├── proxy-params.conf
│   ├── security-headers.conf
│   └── ssl-params.conf
└── ssl/                             Пустой плейсхолдер.
```

**Правило:** перед правкой любого `nginx/...` файла в репо — **сначала** скачай актуальную версию с прода:

```bash
scp root@93.127.197.163:/etc/nginx/conf.d/10-qirim-online.conf /tmp/server-nginx.conf
diff nginx/conf.d/10-qirim-online.conf /tmp/server-nginx.conf
```

Если diff большой — править прямо на проде, не в репо (точечный patch через `sed`/python — см. ниже).

## Как править nginx на проде

### Безопасный workflow

```bash
# 1) Бэкап
sudo cp /etc/nginx/conf.d/10-qirim-online.conf \
        /etc/nginx/conf.d/10-qirim-online.conf.bak-$(date +%Y%m%d-%H%M)

# 2) Правка (любым способом — nano, vim, sed, python — см. ниже)

# 3) Проверка синтаксиса. Если ошибка — nginx НЕ ребутается, текущая конфигурация продолжает работать.
sudo nginx -t

# 4) Hot reload без обрыва соединений
sudo nginx -t && sudo nginx -s reload
```

### Точечная многострочная замена через Python (надёжно для сложных блоков)

```bash
sudo python3 << 'PYEOF'
path = '/etc/nginx/conf.d/10-qirim-online.conf'
with open(path) as f:
    content = f.read()

old_block = '''ТОЧНЫЙ_ТЕКСТ_СТАРОГО_БЛОКА'''
new_block = '''НОВЫЙ_БЛОК'''

if content.count(old_block) != 1:
    print(f"ERROR: expected 1 match, found {content.count(old_block)}. Aborting.")
    raise SystemExit(1)

with open(path, 'w') as f:
    f.write(content.replace(old_block, new_block))
print("OK: replaced.")
PYEOF
sudo nginx -t && sudo nginx -s reload
```

### Откат, если что-то пошло не так

```bash
sudo cp /etc/nginx/conf.d/10-qirim-online.conf.bak-ГГГГММДД-ЧЧММ \
        /etc/nginx/conf.d/10-qirim-online.conf
sudo nginx -t && sudo nginx -s reload
```

## SSL-сертификаты

- **Certbot** (`letsencrypt`) автоматически обновляет.
- Сертификаты в `/etc/letsencrypt/live/qirim.online/{fullchain,privkey}.pem`.
- Renewal: `scripts/renew-certs.sh` или системный `certbot.timer`.

## Где живёт robots.txt

**Не в nginx.** Отдаётся Go-сервером navidrome из встроенных ассетов ([ui/public/robots.txt](../ui/public/robots.txt)). Деплоится через `deploy.sh` (попадает в Go-бинарь). Nginx просто проксирует `/robots.txt` → 127.0.0.1:4533.

## Долг (TODO)

- `deploy.sh` не умеет раскатывать nginx. Каждый раз делаем руками. Имеет смысл добавить:
  ```bash
  rsync nginx/conf.d/ root@93.127.197.163:/etc/nginx/conf.d/
  ssh root@93.127.197.163 'nginx -t && nginx -s reload'
  ```
  Но сначала надо **синхронизировать** репо с продом (репо отстал).
- `nginx/nginx-qirim-online.conf` (полный nginx.conf с обёрткой) — артефакт прошлого. После синка можно удалить, оставив только `conf.d/`+`snippets/`.
