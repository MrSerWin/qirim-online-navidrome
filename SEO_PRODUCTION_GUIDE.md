# 📋 Руководство по SEO и Подготовке к Продакшену

## Qirim.Online — Production Ready Checklist

### ✅ Выполненные SEO оптимизации

#### 1. **HTML Meta Tags** (`ui/index.html`)
- ✅ SEO-оптимизированный `<title>` с ключевыми словами
- ✅ Расширенное `description` мета-тег (155-160 символов)
- ✅ `keywords` мета-тег с релевантными ключевыми словами
- ✅ `robots` мета-тег (index, follow)
- ✅ `language` и `author` мета-теги
- ✅ Canonical URL
- ✅ `lang="ru"` атрибут на `<html>` теге

#### 2. **Open Graph (Facebook/VK)**
- ✅ `og:type`, `og:title`, `og:description`
- ✅ `og:image` с правильными размерами (1200x630)
- ✅ `og:locale` с альтернативными языками (ru_RU, crh_UA, en_US)
- ✅ `og:site_name`, `og:url`

#### 3. **Twitter Card**
- ✅ `summary_large_image` формат
- ✅ Оптимизированные title и description
- ✅ Image с alt-текстом

#### 4. **Structured Data (Schema.org)**
- ✅ WebSite schema с SearchAction
- ✅ MusicArchive schema
- ✅ Organization schema
- ✅ JSON-LD формат

#### 5. **PWA Manifest** (`ui/public/manifest.webmanifest`)
- ✅ Обновленное имя и описание
- ✅ Правильные `lang`, `dir`, `scope`
- ✅ Категории: music, entertainment
- ✅ Icons (192x192, 512x512) с `purpose: any/maskable`

#### 6. **Robots.txt** (`ui/public/robots.txt`)
- ✅ Разрешен доступ к публичным страницам
- ✅ Запрещен доступ к API и админке
- ✅ Sitemap указан
- ✅ Crawl-delay для всех ботов
- ✅ Специальные правила для Google, Yandex, Bing

#### 7. **Sitemap.xml** (`ui/public/sitemap.xml`)
- ✅ Основные страницы с приоритетами
- ✅ hreflang альтернативы (ru, crh, en)
- ✅ changefreq и lastmod
- ✅ XML формат по стандарту sitemaps.org

#### 8. **Build Optimization** (`ui/vite.config.js`)
- ✅ Sourcemaps отключены для production
- ✅ Консоль-логи удалены из production сборки
- ✅ Terser минификация
- ✅ Code splitting (manual chunks)
- ✅ Chunk size warnings

#### 9. **Apache Configuration** (`ui/public/.htaccess`)
- ✅ Gzip compression
- ✅ Browser caching
- ✅ Security headers
- ✅ React Router fallback
- ✅ UTF-8 encoding

---

## 🚀 Production Deployment

### 1. **Сборка проекта**

```bash
# Установить зависимости
cd ui
npm install

# Production сборка
npm run build

# Результат будет в ui/build/
```

### 2. **Конфигурация сервера**

#### Nginx
```nginx
server {
    listen 80;
    server_name qirim.online www.qirim.online;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name qirim.online www.qirim.online;

    # SSL Certificates
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Root directory
    root /path/to/navidrome/ui/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy to backend
    location ~ ^/(api|rest|auth|backgrounds)/ {
        proxy_pass http://localhost:4633;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # React Router - всё на index.html
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
}
```

### 3. **Проверка SEO**

После деплоя проверьте:

#### Google
- [Google Search Console](https://search.google.com/search-console)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- [PageSpeed Insights](https://pagespeed.web.dev/)

#### Яндекс
- [Яндекс.Вебмастер](https://webmaster.yandex.ru/)

#### Другие инструменты
- [Schema.org Validator](https://validator.schema.org/)
- [Open Graph Debugger](https://www.opengraph.xyz/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)

### 4. **Регистрация в поисковых системах**

```bash
# Добавить сайт в:
1. Google Search Console
2. Яндекс.Вебмастер
3. Bing Webmaster Tools

# Отправить sitemap:
https://qirim.online/sitemap.xml
```

---

## 🔑 Ключевые слова

### Основные (русский)
- крымскотатарская музыка
- кърымтатар джыры
- народные песни крымских татар
- крымскотатарские исполнители
- онлайн архив музыки
- qirim online
- крымскотатарская культура

### Дополнительные
- традиционная крымскотатарская музыка
- современная крымскотатарская музыка
- слушать крымскотатарскую музыку онлайн
- крымскотатарские песни
- музыкальный стриминг

### На крымскотатарском
- qırımtatar müziği
- halq cırları
- qırımtatar sanatçıları

---

## 📊 Analytics (опционально)

### Google Analytics
Добавить в `ui/index.html` перед `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Яндекс.Метрика
```html
<!-- Yandex.Metrika -->
<script type="text/javascript">
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();
   for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
   k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

   ym(XXXXXXXX, "init", {
        clickmap:true,
        trackLinks:true,
        accurateTrackBounce:true,
        webvisor:true
   });
</script>
```

---

## ✅ Production Checklist

- [ ] Запустить production сборку `npm run build`
- [ ] Проверить все мета-теги
- [ ] Протестировать на мобильных устройствах
- [ ] Проверить PWA functionality
- [ ] Настроить SSL сертификат (HTTPS обязателен!)
- [ ] Настроить редирект www → non-www (или наоборот)
- [ ] Включить Gzip/Brotli компрессию
- [ ] Настроить кеширование статики
- [ ] Проверить robots.txt доступность
- [ ] Проверить sitemap.xml доступность
- [ ] Добавить сайт в Google Search Console
- [ ] Добавить сайт в Яндекс.Вебмастер
- [ ] Отправить sitemap в поисковые системы
- [ ] Протестировать structured data
- [ ] Проверить Open Graph preview
- [ ] Установить Google Analytics / Яндекс.Метрика
- [ ] Проверить скорость загрузки (PageSpeed Insights)
- [ ] Настроить мониторинг uptime

---

## 📝 Дополнительные рекомендации

### Content
1. Добавить уникальные описания для каждой страницы
2. Создать страницу "О проекте" с полным описанием
3. Добавить FAQ раздел
4. Создать блог/новости о крымскотатарской музыке

### Technical
1. Использовать CDN для статических файлов
2. Оптимизировать изображения (WebP формат)
3. Lazy loading для изображений
4. Implement HTTP/2 Server Push
5. Consider Brotli compression

### Social Media
1. Создать страницы в соцсетях
2. Добавить social sharing кнопки
3. Open Graph оптимизация для каждой песни/альбома

---

## 🎯 SEO Метрики для отслеживания

- **Organic Traffic** - органический трафик из поиска
- **Click-Through Rate (CTR)** - процент кликов в выдаче
- **Bounce Rate** - процент отказов
- **Average Session Duration** - средняя продолжительность сессии
- **Pages per Session** - страниц за сессию
- **Keyword Rankings** - позиции по ключевым словам
- **Backlinks** - обратные ссылки
- **Domain Authority** - авторитет домена

---

**Последнее обновление:** 10 января 2025
