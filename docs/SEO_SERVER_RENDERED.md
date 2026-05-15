# Server-Rendered SEO Pages

Запущено: 2026-05-14. Решает проблему «поисковики плохо индексируют сайт».

## Что сделано

### 1. Server-rendered HTML для всех ключевых сущностей

| URL | Файл | Что внутри |
|---|---|---|
| `/` | [server/public/seo_landing_router.go](../server/public/seo_landing_router.go) | Hero + топ-исполнители + новые альбомы + Schema.org WebSite |
| `/song/{id}` | [server/public/song_router.go](../server/public/song_router.go) | Текст песни, MusicRecording schema (было) |
| `/artist/{id}` | [server/public/seo_artist_router.go](../server/public/seo_artist_router.go) | Био, топ-20 песен, альбомы, MusicGroup schema |
| `/album/{id}` | [server/public/seo_album_router.go](../server/public/seo_album_router.go) | Треклист, MusicAlbum schema |
| `/top50` | seo_landing_router.go | Топ-50 песен (ItemList schema) |
| `/new` | seo_landing_router.go | Новинки — последние альбомы |
| `/karaoke` | seo_landing_router.go | Песни с одобренной лирикой |
| `/clips` | seo_landing_router.go | Видеоклипы (YouTube) |

Все страницы:
- `<title>` + `<meta description>` уникальные
- `<link rel="canonical">`
- Open Graph + Twitter Card
- Schema.org JSON-LD
- Хлебные крошки
- Внутренние ссылки на канонические `/song/`, `/artist/`, `/album/` URL
- Кнопка «Открыть в плеере» → `/app/`

### 2. Sitemap разбит на index + по типам

`/sitemap.xml` теперь sitemap-index, ссылающийся на:
- `/sitemap-static.xml` — landing-страницы
- `/sitemap-artists.xml` — все артисты (`/artist/{id}`)
- `/sitemap-albums.xml` — все альбомы (`/album/{id}`)
- `/sitemap-songs.xml` — топ-45 000 песен по play count (`/song/{id}`)
- `/sitemap-clips.xml` — клипы

Реализация: [server/sitemap.go](../server/sitemap.go). Все URL включают `<lastmod>` из `updated_at`. Старые `/app/*/show` URL удалены (они не индексируемые).

### 3. robots.txt переписан

[ui/public/robots.txt](../ui/public/robots.txt):
- `Disallow: /app/` — SPA-роуты больше не предлагаются краулерам (есть канонические серверные версии)
- `Allow:` для `/song/`, `/artist/`, `/album/`, `/top50`, `/new`, `/karaoke`, `/clips`
- Убран `Crawl-delay: 2`
- Перечислены sub-sitemap файлы

### 4. IndexNow для мгновенного оповещения Bing/Яндекс/Seznam

**Настройка сервера:**

```bash
# Сгенерировать ключ (32 hex-символа)
KEY=$(openssl rand -hex 16)
echo "ND_INDEXNOWKEY=$KEY" >> /opt/navidrome/.env
```

Сервер автоматически выставит `/{KEY}.txt` на верификацию. Когда `ND_INDEXNOWKEY` пустой, IndexNow выключен.

**Ручной пинг:**

```bash
# Скрипт берёт URL'ы прямо из sub-sitemap
INDEXNOW_KEY=$KEY ./scripts/indexnow-ping.sh \
    --from-sitemap https://qirim.online/sitemap-songs.xml
```

Или передать список:

```bash
INDEXNOW_KEY=$KEY ./scripts/indexnow-ping.sh \
    https://qirim.online/artist/abc \
    https://qirim.online/album/xyz
```

Endpoint: `POST https://api.indexnow.org/IndexNow`. Лимит — 10 000 URL за запрос.

## Что делать после деплоя

1. **Google Search Console** — заново отправить sitemap:
   `https://qirim.online/sitemap.xml`
2. **Яндекс.Вебмастер** — то же самое + проверить, что `/artist/`, `/album/` появились в обходе
3. **Bing Webmaster Tools** — submit sitemap
4. Сгенерировать `ND_INDEXNOWKEY`, перезапустить контейнер
5. После первого скана прогнать `./scripts/indexnow-ping.sh --from-sitemap https://qirim.online/sitemap-artists.xml`
6. Через 7–14 дней проверить:
   - `site:qirim.online/artist/` в Google
   - Запросы вида «крымскотатарская музыка [имя артиста]»
7. Регулярно (cron, раз в день) пинговать новые URL:
   ```bash
   0 4 * * * INDEXNOW_KEY=... /opt/navidrome/scripts/indexnow-ping.sh --from-sitemap https://qirim.online/sitemap-songs.xml
   ```

## Главная страница больше не редиректит

Раньше `/` → `302 /app/`. Краулер видел только пустой SPA.

Теперь `/` отдаёт полный HTML с топ-исполнителями и новинками. Кнопка «Открыть плеер» ведёт в `/app/`. Изменено в [server/server.go](../server/server.go) — `mountRootRedirector` больше не регистрирует `/`.

## Где смотреть, если что-то сломалось

- Логи сервера на 404 для `/artist/{id}` → артист не найден или не имеет alias
- `curl -sI https://qirim.online/sitemap.xml` → должен вернуть `Content-Type: application/xml`
- `curl https://qirim.online/${INDEXNOW_KEY}.txt` → должен вернуть ключ plain text
- `Disallow: /app/` в robots.txt не ломает работу плеера — поисковики просто его не сканируют, реальные пользователи всё видят
