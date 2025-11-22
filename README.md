# Navidrome QO - Custom Music Streaming Server

Кастомная версия Navidrome с темами QO Dark/Light, круглыми обложками альбомов, непрерывным воспроизведением и автоматической загрузкой очереди.

![Version](https://img.shields.io/badge/version-0.58.0--QO-blue)
![Navidrome](https://img.shields.io/badge/based%20on-Navidrome%200.58.0-green)

---

## 🚀 Быстрый старт

### Stage (qirim.cloud)

```bash
./rebuild-and-deploy.sh
```

### Production (qirim.online)

```bash
./rebuild-and-deploy-qirim-online.sh
```

**Время:** ~3-5 минут

---

## 📚 Документация

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Полное руководство по развертыванию и обновлению для stage и production

---

## ✨ Кастомные функции

### 1. Темы QO Dark/Light

Две новые темы разработанные специально для QO Music:

- **QO Dark** (по умолчанию) - Тёмная тема на основе Nord Theme
- **QO Light** - Светлая тема с цветовой схемой Light Theme

**Файлы:**
- [ui/src/themes/qoDark.js](ui/src/themes/qoDark.js)
- [ui/src/themes/qoLight.js](ui/src/themes/qoLight.js)

### 2. Круглые обложки альбомов

Обложки альбомов отображаются круглыми (70% размера, по центру).

**Файл:** [ui/src/album/AlbumGridView.jsx](ui/src/album/AlbumGridView.jsx)

### 3. Непрерывное воспроизведение

При клике на песню в очередь добавляются ВСЕ песни из текущего списка, а не только одна.

**Файл:** [ui/src/song/SongList.jsx](ui/src/song/SongList.jsx)

### 4. Автоматическая загрузка очереди

Когда в очереди остаётся меньше 10 песен, автоматически загружается следующая страница.

**Файл:** [ui/src/song/useAutoLoadQueue.js](ui/src/song/useAutoLoadQueue.js)

### 5. Кастомные логотипы

- Логотип QO для тёмной темы
- Логотип QO для светлой темы

**Файлы:**
- [ui/public/qo-logo-dark.png](ui/public/qo-logo-dark.png)
- [ui/public/qo-logo-light.png](ui/public/qo-logo-light.png)

---

## 🛠 Скрипты

### Развертывание и обновление:

- **`build-image.sh`** - Сборка Docker образа для linux/amd64
- **`rebuild-and-deploy.sh`** - Развертывание stage (qirim.cloud)
- **`rebuild-and-deploy-qirim-online.sh`** - Развертывание production (qirim.online)

### Примеры использования:

```bash
# Развертывание stage
./rebuild-and-deploy.sh

# Развертывание production
./rebuild-and-deploy-qirim-online.sh
```

---

## 📦 Структура проекта

```
navidrome/
├── build-image.sh                      # Сборка Docker образа
├── rebuild-and-deploy.sh               # Деплой stage
├── rebuild-and-deploy-qirim-online.sh  # Деплой production
│
├── README.md                           # Описание проекта
├── DEPLOYMENT.md                       # Руководство по развертыванию
│
├── docker-compose.yml                  # Docker конфиг для stage
├── docker-compose.qirim-online.yml     # Docker конфиг для production
├── Dockerfile.simple                   # Dockerfile
├── .dockerignore                       # Исключения Docker
│
├── nginx/
│   ├── nginx.conf                      # Nginx для stage
│   └── nginx-qirim-online.conf         # Nginx для production
│
├── ui/                                 # React UI
│   ├── src/
│   │   ├── themes/
│   │   │   ├── qoDark.js               # Тёмная тема QO
│   │   │   ├── qoLight.js              # Светлая тема QO
│   │   │   └── index.js                # Экспорт тем
│   │   ├── album/
│   │   │   └── AlbumGridView.jsx       # Круглые обложки
│   │   └── song/
│   │       ├── SongList.jsx            # Непрерывное воспроизведение
│   │       └── useAutoLoadQueue.js     # Автозагрузка очереди
│   └── public/
│       ├── qo-logo-dark.png            # Логотип для тёмной темы
│       └── qo-logo-light.png           # Логотип для светлой темы
│
├── db/                                 # Go код и миграции
└── server/                             # Серверный код
```

---

## 🔧 Требования

### На Mac (разработка):

- Git
- SSH доступ к VPS

### На VPS (production):

- Ubuntu 20.04+
- Docker и Docker Compose (установится автоматически)
- Открытые порты: 80, 443
- DNS A-запись на IP VPS

---

## 🌐 Текущие развертывания

- **Stage:** https://qirim.cloud
- **Production:** https://qirim.online

---

## 📝 Обновление кода

### После любых изменений (UI или Go):

```bash
# Stage
./rebuild-and-deploy.sh

# Production
./rebuild-and-deploy-qirim-online.sh
```

⏱ **Время:** ~3-5 минут

Подробнее: [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 🤝 Вклад в проект

Этот проект основан на [Navidrome](https://github.com/navidrome/navidrome).

---

## 📄 Лицензия

Как и оригинальный Navidrome, этот проект распространяется под лицензией GPL v3.

---

## 🔗 Полезные ссылки

- [Navidrome Official Site](https://www.navidrome.org)
- [Navidrome GitHub](https://github.com/navidrome/navidrome)

---

**Версия:** v0.58.0-QO
**Базируется на:** Navidrome v0.58.0
**Последнее обновление:** 2025-10-14

Команды для управления сервером:
Остановить:
pkill -f navidrome

Запустить в фоне:
./navidrome > /tmp/navidrome-test.log 2>&1 &

Запустить в терминале (с выводом логов):
./navidrome

Остановить конкретный процесс по PID:
ps aux | grep navidrome  # найти PID
kill <PID>
Проверить, запущен ли:
ps aux | grep navidrome
# или
curl http://localhost:4533/ping

Tags:
./scripts/update-music-tags.sh "/Volumes/T9/MyOneDrive/Media/Music/Музыка/QirimTatar/Emine Ziadin" --yes



В следующий раз после деплоя запускайте на сервере:
cd /opt/navidrome && chmod +x scripts/*.sh