# Navidrome QO - Custom Music Streaming Server for Qırım.Online

A customized fork of [Navidrome](https://github.com/navidrome/navidrome) v0.58.0 with custom themes, UI modifications, OAuth authentication, and features specifically designed for [Qırım.Online](https://qirim.online) - a Crimean Tatar music streaming platform.

![Version](https://img.shields.io/badge/version-0.58.0--QO-blue)
![Navidrome](https://img.shields.io/badge/based%20on-Navidrome%200.58.0-green)
![License](https://img.shields.io/badge/license-GPL%20v3-orange)

---

## 🎵 About Qırım.Online

[**Qırım.Online**](https://qirim.online) is a music streaming platform dedicated to preserving and sharing Crimean Tatar music and culture. This customized Navidrome server powers the platform with specialized features for the community.

**Live Platform:** https://qirim.online

---

## ✨ Custom Features

### 🎨 Custom QO Themes

Two custom-designed themes for Qırım.Online:

- **QO Dark Theme** (default) - Based on Nord color palette with warm accents
- **QO Light Theme** - Clean light theme with custom color scheme

**Files:**
- [`ui/src/themes/qoDark.js`](ui/src/themes/qoDark.js)
- [`ui/src/themes/qoLight.js`](ui/src/themes/qoLight.js)

### 🎨 Circular Album Covers

Album covers are displayed as circles (70% size, centered) for a modern look.

**File:** [`ui/src/album/AlbumGridView.jsx`](ui/src/album/AlbumGridView.jsx)

### 🎶 Continuous Playback

Clicking a song queues ALL songs from the current list, not just the selected track - enabling seamless listening experience.

**File:** [`ui/src/song/SongList.jsx`](ui/src/song/SongList.jsx)

### 🔄 Auto-Loading Queue

When the queue drops below 10 songs, the next page automatically loads - ensuring uninterrupted music flow.

**File:** [`ui/src/song/useAutoLoadQueue.js`](ui/src/song/useAutoLoadQueue.js)

### 🔐 OAuth Authentication

Built-in OAuth support for:
- Google Sign-In
- Facebook Login
- Self-registration with email verification

**Files:** [`server/oauth.go`](server/oauth.go), [`server/auth.go`](server/auth.go)

### 👤 Guest Access Mode

Automatic guest login for public access using `DevAutoLoginUsername` configuration.

### 📊 Wrapped - Year in Music

Spotify-style "Wrapped" statistics showing:
- Total listening time (smart conversion: minutes → hours → days)
- Top tracks, artists, and albums
- Formatted numbers (K/M/B notation)
- Public sharing links
- Multi-language support (English, Russian, Ukrainian, Turkish, Crimean Tatar)

**Files:** [`ui/src/wrapped/`](ui/src/wrapped/)

### 🌐 Multi-Language Support

Full interface translations:
- English
- Russian (Русский)
- Ukrainian (Українська)
- Turkish (Türkçe)
- Crimean Tatar (Qırımtatarca)

**Files:** [`ui/src/i18n/`](ui/src/i18n/)

### 🎨 Custom Branding

- Custom QO logos for light/dark themes
- Privacy Policy page
- About page with platform information
- Custom icons and assets

**Files:**
- [`ui/public/qo-logo-dark.png`](ui/public/qo-logo-dark.png)
- [`ui/public/qo-logo.png`](ui/public/qo-logo.png)

### 📧 Email Integration

Mailcow email server integration for:
- User registration emails
- Password reset
- Domain: mail.qirim.online


---

## 🚀 Quick Start

### Development

```bash
# Install dependencies
make setup

# Start development server (hot-reload)
make dev

# Build frontend only
make buildjs

# Build complete project
make build

# Run tests
make test
```

Development server runs at: http://localhost:4533

### Deployment

**Production (qirim.online):**
```bash
# Build and deploy
DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose -f docker-compose.qirim-online.yml build navidrome
docker compose -f docker-compose.qirim-online.yml up -d

# View logs
docker compose -f docker-compose.qirim-online.yml logs -f navidrome
```

**Deployment time:** ~3-5 minutes

---

## 📦 Project Structure

```
navidrome/
├── README.md                           # This file
├── CLAUDE.md                           # Project instructions for Claude Code
├── Dockerfile.simple                   # Docker build configuration
├── docker-compose.qirim-online.yml     # Production Docker Compose
├── Makefile                            # Build commands
│
├── docs/                               # Documentation
│   ├── DEPLOYMENT.md                   # Deployment guide
│   ├── OAUTH_SETUP.md                  # OAuth configuration
│   ├── MAILCOW_SETUP.md                # Email server setup
│   ├── XRAY_VPN_SETUP.md               # VPN documentation
│   └── TROUBLESHOOTING.md              # Common issues
│
├── scripts/                            # Utility scripts
│   ├── update-music-tags.sh            # Music metadata tagging
│   ├── generate-xray-qr.sh             # VPN QR code generator
│   ├── health-check.sh                 # System health check
│   └── backup-database.sh              # Database backup
│
├── nginx/                              # Nginx reverse proxy configs
│   └── nginx-qirim-online.conf         # Production config
│
├── xray/                               # Xray VPN configuration
│   └── config.json                     # VPN config
│
├── ui/                                 # React Frontend
│   ├── src/
│   │   ├── themes/                     # Custom themes
│   │   │   ├── qoDark.js               # QO Dark Theme
│   │   │   ├── qoLight.js              # QO Light Theme
│   │   │   └── index.js                # Theme exports
│   │   ├── wrapped/                    # Wrapped statistics feature
│   │   │   ├── Wrapped.jsx             # Main wrapper component
│   │   │   ├── WrappedSlides.jsx       # Slides container
│   │   │   ├── WrappedTestPage.jsx     # Testing page
│   │   │   └── slides/                 # Individual slides
│   │   ├── album/
│   │   │   └── AlbumGridView.jsx       # Circular album covers
│   │   ├── song/
│   │   │   ├── SongList.jsx            # Continuous playback
│   │   │   └── useAutoLoadQueue.js     # Auto-loading queue
│   │   ├── i18n/                       # Translations
│   │   ├── utils/
│   │   │   └── formatters.js           # Number/time formatters
│   │   └── layout/
│   │       ├── Login.jsx               # Login page with OAuth
│   │       └── OAuthButtons.jsx        # OAuth provider buttons
│   └── public/
│       ├── qo-logo-dark.png            # Dark theme logo
│       ├── qo-logo.png                 # Light theme logo
│       └── privacy.html                # Privacy policy
│
├── server/                             # Go Backend
│   ├── server.go                       # Main server initialization
│   ├── auth.go                         # Authentication & OAuth
│   ├── oauth.go                        # OAuth providers
│   └── nativeapi/                      # Native API endpoints
│
├── conf/                               # Configuration management
├── core/                               # Business logic
├── model/                              # Data models
├── persistence/                        # Database layer (SQLite)
└── db/migrations/                      # Database migrations
```

---

## 🛠 Tech Stack

### Backend
- **Go** - High-performance server
- **SQLite** - Embedded database
- **Navidrome Core** - Music server engine

### Frontend
- **React** - UI framework
- **Material-UI** - Component library
- **React Admin** - Admin framework
- **Vite** - Build tool

### Infrastructure
- **Docker** - Containerization
- **Nginx** - Reverse proxy with SSL
- **Let's Encrypt** - SSL certificates
- **Mailcow** - Email server
- **Xray** - VPN server

---

## 🔧 Configuration

### Environment Variables

Key configuration options (see `docker-compose.qirim-online.yml`):

```bash
# Auto-login (Guest Access)
ND_DEVAUTOLOGINUSERNAME="qirim-guest"

# OAuth
ND_OAUTH_ENABLED=true
ND_OAUTH_GOOGLE_ENABLED=true
ND_OAUTH_GOOGLE_CLIENTID="your-client-id"
ND_OAUTH_GOOGLE_CLIENTSECRET="your-client-secret"

# Registration
ND_ENABLESELFREGISTRATION=true

# Theme
ND_DEFAULTTHEME="QODarkTheme"
```

Full configuration guide: [`docs/OAUTH_SETUP.md`](docs/OAUTH_SETUP.md)

---

## 📚 Documentation

- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Deployment and update guide
- **[OAUTH_SETUP.md](docs/OAUTH_SETUP.md)** - OAuth configuration
- **[MAILCOW_SETUP.md](docs/MAILCOW_SETUP.md)** - Email server setup
- **[XRAY_VPN_SETUP.md](docs/XRAY_VPN_SETUP.md)** - VPN configuration
- **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues
- **[CLAUDE.md](CLAUDE.md)** - Project structure for AI assistants

---

## 🧪 Testing

```bash
# Run Go tests
make test

# Run specific package tests
PKG=./core/artwork make test

# Run JavaScript tests
make test-js

# Run all tests
make testall

# Run with race detector
make test-race
```

Test page for Wrapped statistics: https://qirim.online/wrapped-test

---

## 🎯 Development Workflow

### Making Changes

1. **Edit code** (UI or Go)
2. **Test locally**: `make dev`
3. **Build**: `make build`
4. **Test**: `make test`
5. **Deploy to production**

### Modifying UI

```bash
# Start dev server with hot-reload
cd ui && npm run dev

# Build for production
cd ui && npm run build
```

### Modifying Backend

```bash
# Run with hot-reload
make server

# Build binary
make build
```

### Database Migrations

```bash
# Create SQL migration
make migration-sql

# Create Go migration
make migration-go

# Migrations run automatically on startup
```

---


## 🔒 Security Features

- HTTPS/SSL with Let's Encrypt
- OAuth 2.0 authentication
- JWT tokens
- CORS protection
- Rate limiting
- Secure password hashing
- Email verification
- VPN encryption (Xray VLESS/TLS)

---

## 🎨 Customization Guide

### Adding a New Theme

1. Create theme file: `ui/src/themes/yourTheme.js`
2. Export from `ui/src/themes/index.js`
3. Rebuild: `make buildjs`
4. Theme appears in Settings

### Adding OAuth Provider

1. Edit `server/oauth.go`
2. Update `docker-compose.qirim-online.yml` with credentials
3. Add button in `ui/src/layout/OAuthButtons.jsx`
4. Rebuild and deploy

### Adding Translations

1. Edit `ui/src/i18n/en.json` (and other languages)
2. Use in components: `translate('your.key')`
3. Rebuild: `make buildjs`

---

## 🐛 Troubleshooting

### Common Issues

1. **OAuth not working**
   - Check redirect URI matches OAuth app config
   - Verify credentials in docker-compose
   - Must use HTTPS

2. **Guest access fails**
   - Create user in admin panel BEFORE enabling `ND_DEVAUTOLOGINUSERNAME`
   - Check user exists in database

3. **Build fails**
   - Clear cache: `make clean`
   - Check Node.js version (v18+)
   - Check Go version (1.21+)

See [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) for more.

---

## 📊 Monitoring & Maintenance

### Health Check

```bash
# Run comprehensive health check
./scripts/health-check.sh
```

### Database Backup

```bash
# Manual backup
./scripts/backup-database.sh

# Setup automated daily backups (on server)
crontab -e
# Add: 0 2 * * * /opt/navidrome/scripts/backup-database.sh
```

### View Logs

```bash
# Docker logs
docker compose -f docker-compose.qirim-online.yml logs -f navidrome

# Nginx logs (on server)
tail -f /var/log/nginx/qirim.online.access.log
tail -f /var/log/nginx/qirim.online.error.log
```

---

## 🤝 Contributing

This project is a custom fork maintained for Qırım.Online. It's based on the excellent work of the [Navidrome](https://github.com/navidrome/navidrome) team.

### Credits

- **Navidrome Team** - Original music server
- **Qırım.Online Team** - Custom features and themes
- **Material-UI** - React components
- **React Admin** - Admin framework

---

## 📄 License

Like the original Navidrome, this project is licensed under **GPL v3**.

See [LICENSE](https://github.com/navidrome/navidrome/blob/master/LICENSE) for details.

---

## 🔗 Links

- **Live Platform:** https://qirim.online
- **Email Server:** https://mail.qirim.online
- **Original Navidrome:** https://www.navidrome.org
- **Navidrome GitHub:** https://github.com/navidrome/navidrome

---

## 📌 Quick Reference

### Useful Scripts

```bash
# Music metadata tagging
./scripts/update-music-tags.sh "/path/to/music/folder" --yes

# Generate VPN QR code
./scripts/generate-xray-qr.sh

# Health check
./scripts/health-check.sh

# Database backup
./scripts/backup-database.sh
```

### Docker Commands

```bash
# Build image
DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose -f docker-compose.qirim-online.yml build

# Start services
docker compose -f docker-compose.qirim-online.yml up -d

# Stop services
docker compose -f docker-compose.qirim-online.yml down

# Restart Navidrome
docker compose -f docker-compose.qirim-online.yml restart navidrome

# View logs
docker compose -f docker-compose.qirim-online.yml logs -f navidrome

# Check status
docker compose -f docker-compose.qirim-online.yml ps
```

### Makefile Commands

```bash
make setup          # Install dependencies
make dev            # Start dev server with hot-reload
make build          # Build complete project
make buildjs        # Build frontend only
make test           # Run Go tests
make test-js        # Run JavaScript tests
make testall        # Run all tests
make lint           # Lint Go code
make lintall        # Lint Go + JS
make clean          # Clean build artifacts
```

---

## 📮 Support

For Qırım.Online platform support and feedback, please contact the platform administrators.

For Navidrome core issues, see the [official documentation](https://www.navidrome.org/docs/).

---

**Version:** v0.58.0-QO
**Based on:** Navidrome v0.58.0
**Platform:** https://qirim.online
**Last Updated:** 2025-01-23


./scripts/update-music-tags.sh "/Volumes/T9/MyOneDrive/Media/Music/Музыка/QirimTatar/Zarema Halitova"


# Один файл → MP3 (320kbps, по умолчанию)
./scripts/extract-audio-from-video.sh video.mp4

# Один файл → FLAC (без потерь)
./scripts/extract-audio-from-video.sh video.mp4 flac

# Один файл → M4A (копирует AAC без перекодирования, быстро)
./scripts/extract-audio-from-video.sh video.mp4 m4a

# Вся папка с видео
./scripts/extract-audio-from-video.sh /path/to/videos/