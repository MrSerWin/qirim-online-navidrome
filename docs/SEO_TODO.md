# SEO TODO — qirim.online

История:
- 2026-05-14 — первичный аудит, Health Score **44/100**. Главная проблема: 1 198 пустых SPA-URL с canonical→home.
- 2026-05-15 — серверный рендеринг развёрнут, повторный аудит. Health Score **75/100** (+31). Архитектурный долг закрыт.
- 2026-05-15 (вечер) — все активные P0/P1/P2 + большая часть P3 закрыты. Осталось только то, что требует данных извне (обогащение БД, image composition).

Это рабочий лист на текущий и следующий спринты. Закрытые пункты схлопнуты в раздел «✅ Сделано» внизу, чтобы наверху были только активные задачи.

---

## 🟢 Остаётся в бэклоге (требует внешних данных)

- [ ] **`lang` per song based on реальный язык трека.** Сейчас все песни `lang="crh"`. Большинство наверняка крымскотатарские, но есть русскоязычные/турецкие. Источник: language-tag на песне в БД (если нет — поле для будущего обогащения). **Блокер:** нужна language-колонка в media_file или тег `language` в файле.

- [ ] **hreflang per language URL.** Сейчас `hreflang ru` и `hreflang crh` указывают на один и тот же URL — мультиязычный документ. Если в будущем появятся переводы интерфейса под URL-префиксом `/crh/`, обновить.

- [ ] **Per-album/per-artist уникальные og:image размеров 1200×630** (сейчас отдаётся обложка как есть — может быть квадратной, что хуже для Twitter Card `summary_large_image`). Добавить серверную композицию через [server/public/share_image.go] (или аналог) при необходимости. **Блокер:** требует image composition pipeline.

---

## ✅ Сделано (от обоих аудитов)

Архитектурный фундамент (большинство критичного из первого аудита):
- [x] Серверный рендеринг публичных страниц в Go вместо Prerender.io / Next.js (`/`, `/song/`, `/artist/`, `/album/`, `/top50`, `/new`, `/karaoke`, `/clips`).
- [x] SPA-роуты `/app/*` под `Disallow:` — дубли с canonical→home устранены.
- [x] Уникальный `<link rel="canonical">` на каждой странице.
- [x] `/privacy.html` — был 404, теперь 200.
- [x] `/robots.txt` — переписан, есть Sitemap-директива, именованные блоки для Googlebot/Yandex/Bingbot.
- [x] `/llms.txt` — содержательный, описывает архив, темы, URL-структуру, sitemaps.
- [x] `og:image`, `og:url`, `twitter:image` — заполнены, per-entity картинки для артистов/альбомов.
- [x] Sitemap-index с реальными `<lastmod>` из БД, без `/app/*` мусора.
- [x] JSON-LD: `MusicGroup`, `MusicAlbum`, `MusicRecording`, `BreadcrumbList` на сущностях; `WebSite` на главной.
- [x] `MusicRecording.duration` в корректном ISO 8601 (`PT2M55S`).
- [x] Невалидный `MusicArchive` JSON-LD удалён.
- [x] Дубликаты `X-Frame-Options` (DENY vs SAMEORIGIN) устранены — отдаётся один `SAMEORIGIN`.
- [x] `hreflang ru/crh/x-default` на server-rendered страницах.
- [x] Песни отдаются с `lang="crh"`, главная с `lang="ru"`.
- [x] IndexNow обработчик и скрипт реализованы (осталось сгенерировать ключ и пинговать — P1).
- [x] `<meta name="keywords">`, `<meta name="language">`, `<meta name="revisit-after">` — устаревшее удалено.

2026-05-15 (вечер) — закрыто после второго аудита:
- [x] **Двойная HTML-экранизация в title/description** — добавлен `cleanText()` (html.UnescapeString) в song/artist/album/landing/playlist роутерах перед попаданием данных в html/template.
- [x] **Organization JSON-LD на главной** — восстановлен в LandingRouter home-template c полным набором (alternateName, sameAs, foundingDate, contactPoint).
- [x] **SearchAction удалён** (вариант Б из плана) — невалидный urlTemplate на disallowed `/app/` убран.
- [x] **Расширенный meta description песен** — теперь Title + Artist + альбом + год + жанр + фраза для CTR.
- [x] **Именованные блоки AI-ботов в robots.txt** — 18 ботов (GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-Web, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, CCBot, Amazonbot, Applebot, Applebot-Extended, Bytespider, Meta-ExternalAgent/Fetcher, cohere-ai, YouBot, DuckAssistBot).
- [x] **Nginx X-Frame-Options cleanup** — `proxy_hide_header` + `add_header` приведены в snippet [nginx/snippets/security-headers.conf](../nginx/snippets/security-headers.conf), задеплоено. Сейчас один заголовок SAMEORIGIN.
- [x] **X-XSS-Protection убран** из nginx snippet — header устарел.
- [x] **CSP-заголовок** — включён в [server/middlewares.go](../server/middlewares.go) `secureMiddleware`. Разрешены Yandex Metrika, gtag, inline JSON-LD, YouTube iframes, Google Fonts. `object-src 'none'`, `frame-ancestors 'self'`.
- [x] **Breadcrumb «Артисты» сокращён** до 2 уровней — `Главная › {Artist Name}`. Промежуточный «Артисты» удалён и из HTML, и из BreadcrumbList JSON-LD.
- [x] **Organization дополнен** `contactPoint` (email contact@qirim.online, 3 языка) и `foundingDate: 2025`. И в [seo_landing_router.go](../server/public/seo_landing_router.go), и в [ui/index.html](../ui/index.html).
- [x] **MusicPlaylist schema + SSR-страницы плейлистов** — создан [server/public/seo_playlist_router.go](../server/public/seo_playlist_router.go), маршрут `/playlist/{id}`. Только публичные плейлисты (private → 404). JSON-LD MusicPlaylist с `numTracks` и `track[]`. Добавлен `/sitemap-playlists.xml`. robots.txt разрешает `/playlist/`.
- [x] **changefreq/priority в sitemap** — удалены из всех sub-sitemap'ов и static-sitemap. Поисковики (Google) их игнорируют; для остальных оставляем только `<loc>` + `<lastmod>`.
- [x] **IndexNow setup-скрипт** — [scripts/indexnow-setup.sh](../scripts/indexnow-setup.sh) генерирует ключ, добавляет в .env, рестартит контейнер, верифицирует endpoint и пингует все sub-sitemap'ы автоматически. Запуск: `bash scripts/indexnow-setup.sh` один раз, потом `--ping-only` периодически.

---

## Что мерить через 7-14 дней после P0/P1

1. **Google Search Console → Coverage:** сколько `/artist/*`, `/album/*`, `/song/*` индексируется. Цель — >70% от sitemap.
2. **GSC → Performance:** позиции по `крымскотатарская музыка слушать онлайн`, `qirim`, имена артистов. Базовая отметка — текущее состояние.
3. **Яндекс.Вебмастер:** аналогично, индексация и страницы в поиске.
4. **Bing Webmaster Tools:** IndexNow ping result, indexed pages count.
5. **AI Overviews/ChatGPT/Perplexity:** ручная проверка цитирования через 2-4 недели. Запросы: `«крымскотатарская музыка онлайн»`, `«Crimean Tatar music archive»`, имена топ-артистов.
