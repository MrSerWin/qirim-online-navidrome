# SEO TODO — qirim.online

Источник: полный SEO-аудит от 2026-05-14. Общий SEO Health Score: **44/100**.
Главный диагноз: 1 198 URL в sitemap отдают одну и ту же пустую React-оболочку с canonical, захардкоженным на главную → Google видит 1 198 дубликатов, AI-краулеры — пустой `<div id="root">`.

**Статус на 2026-05-15:** см. [SEO_SERVER_RENDERED.md](SEO_SERVER_RENDERED.md) — большинство критичных и high-priority пунктов закрыто через переход на server-rendered SEO-страницы вместо SSR React.

---

## 🔴 CRITICAL (блокирует индексацию — делать первым)

- [x] ~~**Переключить React Router с `HashRouter` на `BrowserRouter`**~~ → решено иначе: server-rendered страницы вне `/app/`. SPA-маршруты теперь `Disallow: /app/` в robots.txt — краулеры туда не ходят, дубли устранены.
- [x] **Динамический canonical на каждой странице** — каждая страница `/song/{id}`, `/artist/{id}`, `/album/{id}`, `/top50`, `/new`, `/karaoke`, `/clips`, `/` теперь имеет уникальный `<link rel="canonical">`.
- [x] **Внедрить SSR или prerender** — реализовано серверным рендерингом в Go (не Prerender.io). Все артисты, альбомы, песни отдают полный HTML с meta/OG/JSON-LD/тексты.
- [x] **Восстановить `/privacy.html`** — добавлен в список static-files в [server/server.go](../server/server.go) `mountRootRedirector`.
- [x] **Заменить невалидный JSON-LD `MusicArchive`** на `CollectionPage` — сделано в [ui/index.html](../ui/index.html). Удалён также невалидный `SearchAction` (вёл на несуществующий `/search?q=`).

## 🟠 HIGH (в течение недели)

- [x] **Создать `/robots.txt`** — переписан в [ui/public/robots.txt](../ui/public/robots.txt). AI-боты (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended) сейчас НЕ перечислены отдельно — попадают под `User-agent: *` и `Allow: /`. **TODO**: добавить именованные блоки для прозрачности.
- [x] **Заполнить `og:image`, `og:url`, `twitter:image`** дефолтами — сделано через `{{ if .ShareImageURL }}...{{ else }}...{{ end }}` в [ui/index.html](../ui/index.html).
- [x] **Сделать публичную SSR-главную** — реализовано в [server/public/seo_landing_router.go](../server/public/seo_landing_router.go). Главная отдаёт топ-исполнителей, новинки, описание архива. Логин/плеер ушли на `/app/`.
- [ ] **Заполнить `sameAs` в Organization JSON-LD** — добавлена ссылка на Wikipedia. **TODO**: добавить реальные YouTube/Telegram/Facebook URLs когда появятся.
- [x] **Убрать дубликаты заголовков в Nginx** (`X-Frame-Options` DENY vs SAMEORIGIN) — добавлен escape-hatch в [server/middlewares.go](../server/middlewares.go): если выставить `ND_HTTPSECURITYHEADERS_CUSTOMFRAMEOPTIONSVALUE=SAMEORIGIN`, Navidrome перестаёт слать `DENY`. На стороне nginx: добавить `proxy_hide_header X-Frame-Options;` перед `add_header X-Frame-Options "SAMEORIGIN" always;` — это TODO для deploy.
- [x] **Создать `/llms.txt`** — добавлен в [ui/public/llms.txt](../ui/public/llms.txt) с описанием архива, языков, структуры URL.
- [x] **Реальные `lastmod` в sitemap** — все URL берут `<lastmod>` из `updated_at` БД, см. [server/sitemap.go](../server/sitemap.go).
- [x] **Исправить ISO 8601 в `MusicRecording.duration`**: `PT3:18` → `PT3M18S` — добавлен `formatISODuration()` в [server/public/handle_songs.go](../server/public/handle_songs.go), применён в song/album JSON-LD.

## 🟡 MEDIUM (в течение месяца)

- [x] **Добавить `hreflang`** (`ru`, `crh`, `x-default`) — на все мои server-rendered страницы. На SPA `/app/*` пока нет (там disallow).
- [ ] **Исправить `lang` per route** — сейчас все SEO-страницы `lang="ru"`. Песни в идеале `lang="crh"`, но без определения языка трека сложно. **TODO низкий**.
- [x] **Починить или удалить `SearchAction` JSON-LD** — удалён (см. CRITICAL).
- [ ] **Удалить `changefreq` и `priority` из sitemap** — оставлено. Google игнорирует, но Яндекс ещё использует. Минор.
- [x] **Убрать из sitemap generic-URL `/app/album`, `/app/artist`** — sitemap полностью переписан, теперь только канонические `/artist/{id}` etc. без generic индексов.
- [x] **Внедрить IndexNow** — реализовано в [server/indexnow.go](../server/indexnow.go) + [scripts/indexnow-ping.sh](../scripts/indexnow-ping.sh).
- [ ] **Добавить CSP-заголовок** — `secureMiddleware` имеет закомментированный CSP. Включение требует аудита inline-скриптов (Yandex Metrika, gtag, JSON-LD), `unsafe-inline` для скриптов обязателен. **TODO**.
- [x] **Убрать устаревшие `x-xss-protection` и `<meta name="revisit-after">`** — `revisit-after` удалён из [ui/index.html](../ui/index.html). `X-XSS-Protection` остаётся в nginx — отдельный deploy-cleanup.
- [ ] **Расширить meta description на страницах песен** — добавить bio-фрагмент артиста. **TODO**.

## 🟢 LOW (бэклог)

- [x] **Удалить устаревшие `<meta name="keywords">` и `<meta name="language">`** — удалены из [ui/index.html](../ui/index.html).
- [x] **Добавить `BreadcrumbList`** (артист → альбом → песня) — JSON-LD на всех трёх типах страниц.
- [ ] **Добавить `MusicPlaylist` schema** — на страницах плейлистов. Плейлисты пока вне SEO-роутера (только в SPA).
- [ ] **Дополнить Organization полями `contactPoint`, `foundingDate`** — TODO.

---

## Что осталось (приоритет, отсортирован)

1. **Deploy nginx fix**: `proxy_hide_header X-Frame-Options;` + установить `ND_HTTPSECURITYHEADERS_CUSTOMFRAMEOPTIONSVALUE=SAMEORIGIN` либо удалить из nginx `add_header X-Frame-Options`. Цель — один заголовок, не два.
2. **Сгенерировать `ND_INDEXNOWKEY`** и пинговать после деплоя:
   ```
   openssl rand -hex 16
   ```
3. **Заполнить `sameAs`** реальными соцсетями (YouTube, Telegram, Facebook).
4. Именованные блоки в robots.txt для AI-ботов (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended).
5. CSP-заголовок (требует аудита inline-кода).
6. MusicPlaylist schema (требует server-rendered страниц плейлистов — отдельный спринт).

## Рекомендованная последовательность для деплоя

1. `make build` (полная сборка фронт+бэк).
2. `./deploy.sh` на прод.
3. После: проверить `curl -sI https://qirim.online/privacy.html` → 200 (а не 404).
4. Проверить `curl -sI https://qirim.online/llms.txt` → 200.
5. Проверить `curl https://qirim.online/sitemap.xml` → sitemap-index (5 sub-файлов).
6. Сгенерировать `ND_INDEXNOWKEY`, добавить в .env, перезапустить контейнер.
7. Прогнать `./scripts/indexnow-ping.sh --from-sitemap https://qirim.online/sitemap-artists.xml`.
8. Google Search Console + Яндекс.Вебмастер: повторно отправить sitemap.
9. Через 7 дней проверить через GSC, сколько /artist/* и /album/* проиндексировано.
