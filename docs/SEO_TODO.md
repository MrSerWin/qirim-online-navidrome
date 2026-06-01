# SEO TODO — qirim.online

История:
- 2026-05-14 — первичный аудит, Health Score **44/100**. Главная проблема: 1 198 пустых SPA-URL с canonical→home.
- 2026-05-15 (день) — серверный рендеринг развёрнут, повторный аудит. Health Score **75/100** (+31). Архитектурный долг закрыт.
- 2026-05-15 (вечер) — закрыты все P0/P1/P2 + большая часть P3. Health Score **85/100** (+10). Technical SEO долг ≈ 0.

Дальнейший рост — **off-page** (бэклинки, бренд-меншены, контент-маркетинг) и **измерение** (GSC, Яндекс.Вебмастер, AI-движки). В коде критичного не осталось.

---

## 🔴 GSC Coverage — разбор статусов (2026-05-21)

Google Search Console показал три раздела. Разбор и план фиксов:

### Статусы и вердикты

| Раздел GSC | Что значит | Узкое место | Действие |
|---|---|---|---|
| **Discovered – currently not indexed** (~5,6 тыс. `/album/`, `Last crawled: N/A`) | URL известны (из sitemap), но Google ещё не сканировал | Молодой домен + краулинг-бюджет | Ждать, бэклинки, перелинковка. Переоценить ~2026-05-29 |
| **Crawled – currently not indexed** (`/album/`, `/song/`, crawled May 19) | Google прочитал страницу, но не убедился индексировать | **Ценность/уникальность страницы (thin content)** | **← фиксить кодом, см. ниже** |
| **Blocked by robots.txt → `/app/`** | Намеренно закрытый SPA, чтобы не дублировать SSR-страницы | — | ✅ Ничего не делать, всё правильно |

**Важно про кнопку «Validate Fix»:** она НЕ чинит и НЕ является требованием Google. Только ставит URL в приоритет на пересканирование **после** реального фикса. Нажимать только после деплоя правок, иначе Google увидит ту же страницу → «Failed» → понизит приоритет.

### План фиксов для «Crawled – not indexed» (P1)

- [ ] **Проанализировать, что реально рендерится** на `/album/{id}` и `/song/{id}` — объём уникального текста, дубль артист↔альбом. Шаблоны в [server/public/](../server/public/).
- [ ] **Обогатить страницу альбома видимым уникальным текстом** — год, жанр, число треков, общая длительность в HTML (не только в JSON-LD) + короткое описание/контекст.
- [ ] **Текст песни на `/song/`** (если есть и права позволяют) — сильнейший уникальный контент против thin-content.
- [ ] **Различить дубли** артист vs одноимённый альбом (`Zarema Paday — Zarema Paday`) — разный контент/акценты.
- [ ] **Внутренняя перелинковка** альбом ↔ артист ↔ похожие альбомы; убрать «сиротские» страницы, на которые ведёт только sitemap.
- [ ] **После деплоя** — нажать «Validate Fix» в GSC по затронутым URL.

### Раздел «Not found (404)» — фикс готов, ждёт деплоя (2026-05-29)

54 URL застряли в GSC с декабря 2025 — Google не может перепроверить, потому что `/app/` заблокирован в robots.txt. Прошлый редирект был **302 на hash-фрагмент** (`/app/#/album/...`), что для Google = тот же URL (фрагмент клиентский) → сигнал в никуда.

**Что сделано (закоммитить и задеплоить):**
- [x] **nginx**: 302 → hash заменён на **301 → канонический SSR URL** ([nginx/nginx-qirim-online.conf](../nginx/nginx-qirim-online.conf)):
  - `/app/{album,artist,playlist}/{id}[/show|/anything]` → `/{album,artist,playlist}/{id}` (301)
  - `/app/{album,artist,playlist}` (голые) → `/` (301)
  - `/login` → `/` (301)
  - `/popular-genres` → `/` (301)
- [x] **robots.txt**: добавлен `Allow: /app/{album,artist,playlist}/` в секциях `*`, Googlebot, Yandex, Bingbot ([ui/public/robots.txt](../ui/public/robots.txt)). Более длинный паттерн побеждает `Disallow: /app/` → Google теперь может дойти до 301.

**Задеплоено 2026-05-29:**
- robots.txt — через `deploy.sh` (встроен в Go-бинарь).
- nginx — точечный python-патч прямо на сервере в `/etc/nginx/conf.d/10-qirim-online.conf` (репо разошёлся с продом — см. долг ниже), backup сохранён рядом.
- Все 5 контрольных URL отдают `301` на канонический адрес. ✅

**После деплоя — GSC:**
- [ ] Открыть раздел «Not found (404)» → нажать **Validate Fix**.
- [ ] Через 1-3 недели проверить, что список 404 уменьшился (старт: 54).

### 🟢 Алерт GSC «Duplicate, Google chose different canonical than user» — фикс задеплоен (2026-05-31)

**Корневая причина:** массовый шаблон в данных — имена файлов вида `Artist - Song.mp3` / `Artist_Song.mp3`, плюс альбомы названы по имени артиста. Результат: `<title>`/`<h1>`/JSON-LD у /song, /album, /artist почти одинаковы; имя артиста повторяется 3-4 раза в каждом мета-теге; Google помечает их как дубли и сам выбирает canonical.

Пример «до» для одной песни:
```
<title>Elina Sosnovskaya - Ep ileri — Elina Sosnovskaya | Текст песни | Qirim.Online</title>
<h1>Elina Sosnovskaya - Ep ileri</h1>
description: ...— Elina Sosnovskaya, альбом «Elina Sosnovskaya»...
```

**Что сделано (закоммитить и задеплоено):**
- [x] **`stripArtistPrefix(title, artist)`** в [server/public/handle_songs.go](../server/public/handle_songs.go) — срезает префикс артиста из названия. Case-insensitive, разделители: ` - `, `–`, `—`, `-`, `_`, `.`. Подчёркивания нормализуются как пробелы.
- [x] **Humanize underscores** — после среза префикса `_` → ` ` и схлопывание пробелов. Названия вида `Elvira_Emir_Strunnyj_kvartet_chast_3` теперь рендерятся как `Strunnyj kvartet chast 3`.
- [x] **Самотитульные альбомы** ([server/public/seo_album_router.go](../server/public/seo_album_router.go)) — флаг `SelfTitled` (`album.Name == album.AlbumArtist`); `<title>` и `og:title` рендерятся как `«{Artist} — все песни»` вместо дублирующего `«{Artist} — {Artist} | Альбом»`. Description тоже без дубля.
- [x] **Treklist в альбоме и top-songs у артиста** — все названия проходят через `stripArtistPrefix` ([server/public/seo_album_router.go](../server/public/seo_album_router.go), [server/public/seo_artist_router.go](../server/public/seo_artist_router.go)).
- [x] **Песня — description без дублирования** ([server/public/song_router.go](../server/public/song_router.go)): «альбом «X»» больше не выводится, если `album == artist`. Добавлена длительность.

«После» для той же песни:
```
<title>Ep ileri — Elina Sosnovskaya | Текст песни | Qirim.Online</title>
<h1>Ep ileri</h1>
description: Ep ileri — Elina Sosnovskaya, длительность 3:29...
```

**После деплоя — GSC:**
- [ ] Открыть Pages → «Duplicate, Google chose different canonical than user» → **Validate Fix** (когда там накопится больше затронутых URL — сейчас всего 1, ждём что Google расширит выборку через 1-2 недели).
- [ ] Через 2-3 недели проверить, что счётчик не растёт и существующие URL переиндексировались с нашим canonical.

**Остаточные edge cases (не источник дублей):**
- Названия с именем артиста **в конце**: `Neizvesten_Kyrym_nagmeleri_kompozitor_Elvira_Emir` — не ловится prefix-strip-ом, но это не дубль.
- Транслитерация: `ehlvira_ehmir_Bez_nazvaniya` (в title) vs `Elvira Emir` (в artist) — разное написание. Решение через таблицу транслитерации — отдельная задача.
- Эти случаи остаются с подчёркиваниями в названии — UX просадка, не SEO-дубль.

### Долги, всплывшие при работе

- [ ] **Map старых SEO-URL → hash-роуты** (строки 1-330 в `/etc/nginx/conf.d/10-qirim-online.conf`). Редиректит URL вида `/album/105/elvira+sarıhalil/эльвира+сарыхалил` на `/app/#/album/{id}/show` — тот же мёртвый hash-роут. Перегенерировать через [scripts/find-redirects.py](../scripts/find-redirects.py), чтобы цели стали каноническими `/album/{id}` / `/artist/{id}`. Тот же класс SEO-ремонта.
- [ ] **Репо `nginx/nginx-qirim-online.conf` разошёлся с продом** (`/etc/nginx/conf.d/10-qirim-online.conf`). В репо лежит старая версия с обёрткой `events{}/http{}`, на проде — фрагмент для `conf.d/`. Перетянуть прод-файл в репо, починить `deploy.sh`, чтобы он раскатывал и nginx-конфиг (сейчас только Go-образ).

---

## 🟡 Косметика (опциональный полиш — можно не делать)

- [ ] **Лишние пробелы в `numTracks` JSON-LD плейлиста.**
  ```json
  "numTracks":  112 ,
  ```
  Двойной пробел перед числом, пробел перед запятой. JSON-LD валиден, но грязно. Источник — шаблон в [server/public/seo_playlist_router.go](../server/public/seo_playlist_router.go) (`{{ }}` с пробелами или `%d ` с trailing space).

- [ ] **Playlist `<title>` неинформативный.**
  Сейчас: `QirimOnline — плейлист | Qirim.Online`. Если в БД имя плейлиста = «QirimOnline» — две одинаковые упоминания бренда без полезной информации.
  Лучше: `«{Playlist Name}» — плейлист на {N} треков | Qirim.Online`.

- [ ] **CSP содержит `'unsafe-eval'` в `script-src`.**
  Часто нужен для Yandex Metrika. Попробовать убрать и посмотреть DevTools Console на проде в течение суток — если нарушений нет, удалить.

- [ ] **CSP `img-src` включает `http:`.**
  Сайт под HSTS, но `http:` ослабляет защиту от mixed content. Если все обложки на HTTPS — убрать `http:` из `img-src`.

---

## 🟢 Заблокировано внешними данными (когда появится повод)

- [ ] **`lang` per song по реальному языку трека** — нужна language-колонка в media_file или `language` тег в файле. Сейчас все песни `lang="crh"`, что в большинстве случаев правильно, но не всегда.

- [ ] **hreflang per language URL** — потребует переводов интерфейса под URL-префиксом `/crh/`. Сейчас `ru` и `crh` указывают на один и тот же URL (мультиязычный документ — допустимо).

- [ ] **og:image 1200×630 с серверной композицией** — требует image pipeline (обложка + overlay с логотипом и текстом). Сейчас отдаётся обложка как есть, что хуже для Twitter Card `summary_large_image`. Опционально через [server/public/share_image.go](../server/public/share_image.go).

---

## 📊 Измерять через 7-14 дней (без действий — наблюдение)

1. **Google Search Console → Coverage.** Цель — >70% URL из sitemap в индексе.
2. **GSC → Performance.** Импрешены и позиции по `крымскотатарская музыка слушать онлайн`, `qirim`, именам артистов, фрагментам лирики.
3. **Яндекс.Вебмастер** — индексация, страницы в поиске.
4. **Bing Webmaster Tools** — IndexNow ping success, indexed pages count, latency от ping до индексации.
5. **AI Overviews / ChatGPT / Perplexity** (через 2-4 недели) — ручная проверка цитирования. Запросы: «что такое qirim.online», «где послушать крымскотатарскую музыку», «Crimean Tatar music archive», топ-3 имени артистов.

**Триггер для следующего раунда работ:**
- Если coverage <50% через 14 дней → нырять в crawl errors, soft 404, дубли.
- Если coverage >70% → переходить к контент-маркетингу и линкбилдингу.

---

## ✅ Сделано (полная история)

### Архитектурный фундамент (закрыто после первого аудита)
- [x] Серверный рендеринг публичных страниц в Go (`/`, `/song/`, `/artist/`, `/album/`, `/top50`, `/new`, `/karaoke`, `/clips`, `/playlist/`).
- [x] SPA-роуты `/app/*` под `Disallow:` — дубли с canonical→home устранены.
- [x] Уникальный `<link rel="canonical">` на каждой странице.
- [x] `/privacy.html` — был 404, теперь 200.
- [x] `/robots.txt` — переписан, есть Sitemap-директива, именованные блоки для Googlebot/Yandex/Bingbot.
- [x] `/llms.txt` — содержательный, описывает архив, темы, URL-структуру, sitemaps.
- [x] `og:image`, `og:url`, `twitter:image` — заполнены, per-entity картинки.
- [x] Sitemap-index с реальными `<lastmod>` из БД, без `/app/*` мусора.
- [x] JSON-LD: `MusicGroup`, `MusicAlbum`, `MusicRecording`, `BreadcrumbList`, `WebSite`.
- [x] `MusicRecording.duration` в корректном ISO 8601.
- [x] Невалидный `MusicArchive` JSON-LD удалён.
- [x] Дубликаты `X-Frame-Options` устранены — один `SAMEORIGIN`.
- [x] `hreflang ru/crh/x-default` на server-rendered страницах.
- [x] Песни — `lang="crh"`, главная — `lang="ru"`.
- [x] IndexNow обработчик + скрипт.
- [x] Устаревшее (`keywords`, `language`, `revisit-after`) удалено.

### Полировка (закрыто после второго аудита, 2026-05-15 вечер)
- [x] **Двойная HTML-экранизация в title/description** — `cleanText()` (html.UnescapeString) перед попаданием в html/template.
- [x] **Organization JSON-LD на главной** — полный блок с `alternateName`, `logo`, `description`, `foundingDate: 2025`, `contactPoint` (email + 3 lang), `sameAs` (YouTube + Telegram + Facebook + Wikipedia).
- [x] **SearchAction удалён** — невалидный urlTemplate на `/app/` убран.
- [x] **Расширенный meta description песен** — Title + Artist + альбом + год + жанр + CTR-фраза.
- [x] **Именованные блоки AI-ботов в robots.txt** — 23 UA: GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-Web, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, CCBot, Amazonbot, Applebot/Applebot-Extended, Bytespider, Meta-ExternalAgent/Fetcher, cohere-ai, YouBot, DuckAssistBot.
- [x] **Nginx X-Frame-Options cleanup** — `proxy_hide_header` + `add_header` в [nginx/snippets/security-headers.conf](../nginx/snippets/security-headers.conf). Один `SAMEORIGIN`.
- [x] **X-XSS-Protection убран** из nginx snippet.
- [x] **CSP-заголовок** — включён в [server/middlewares.go](../server/middlewares.go). `object-src 'none'`, `frame-ancestors 'self'`, `base-uri 'self'`, разрешены Yandex Metrika, gtag, YouTube, Google Fonts.
- [x] **Breadcrumb сокращён** до 2 уровней — `Главная → {Artist}`, без промежуточного «Артисты».
- [x] **Organization.contactPoint + foundingDate** — email contact@qirim.online (3 языка), 2025.
- [x] **MusicPlaylist schema + SSR-страницы** — [server/public/seo_playlist_router.go](../server/public/seo_playlist_router.go). Маршрут `/playlist/{id}`. Только публичные, private → 404. JSON-LD с `numTracks` и `track[]`. `/sitemap-playlists.xml` в индексе.
- [x] **changefreq/priority** удалены из всех sub-sitemap'ов.
- [x] **IndexNow setup-скрипт** — [scripts/indexnow-setup.sh](../scripts/indexnow-setup.sh) генерирует ключ, добавляет в .env, рестартит, верифицирует, пингует все sitemap'ы.
