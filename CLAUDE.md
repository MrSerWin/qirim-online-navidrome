# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Navidrome QO** - a custom fork of Navidrome music streaming server with custom themes, UI modifications, and OAuth integration for Qirim.Online (qirim.online) and stage environment (YOUR_DOMAIN).

**Key Customizations:**
- QO Dark/Light themes
- Circular album covers
- Continuous playback (queue all songs from current list)
- Auto-loading queue when < 10 songs remain
- OAuth authentication (Google, Facebook)
- Custom QO branding/logos
- Mailcow email server integration
- **Xray VPN** for secure video calls (VLESS/WebSocket/TLS)
- **Enhanced multilingual search** with Cyrillic/Latin transliteration (Crimean Tatar, Turkish, Russian)
- **Wrapped feature** - Spotify-like year-in-review with public sharing

## Tech Stack

- **Backend:** Go (based on Navidrome v0.58.0)
- **Frontend:** React with Material-UI
- **Database:** SQLite
- **Deployment:** Docker + Docker Compose
- **Reverse Proxy:** Nginx with SSL (Let's Encrypt)
- **Email:** Mailcow (mail.qirim.online)
- **VPN:** Xray (VLESS/WebSocket/TLS on qirim.online:443/video_bridge_42)

## Notes for Claude
- if you give me command to run on server giv it me without ssh root@... because I run it on server directly
- do not write documentation each time I ask you to implement something. Update doc only if I asked or when feature fully implemented
- store all documentation in foder docs
- store all *.sh in folder scripts

## Maintenance and Monitoring

### Health Checks
```bash
./scripts/health-check.sh  # Run comprehensive health check
```

### Backups
```bash
./scripts/backup-database.sh  # Manual database backup
```

**Recommended: Set up automated daily backups via cron on server:**
```bash
# Add to crontab (crontab -e)
0 2 * * * /opt/navidrome/scripts/backup-database.sh >> /var/log/navidrome-backup.log 2>&1
```

### Troubleshooting
See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for common issues and solutions.

## Development Commands

### Initial Setup
```bash
make setup  # Install all dependencies (Go, Node modules, golangci-lint)
```

### Development Mode
```bash
make dev     # Start both frontend and backend with hot-reload (loads .env)
make server  # Start only backend with hot-reload
```

### Building
```bash
make build    # Build complete project (backend + frontend)
make buildjs  # Build only frontend (React UI)
```

### Testing
```bash
make test          # Run Go tests (use PKG=./path to test specific package)
make test-race     # Run Go tests with race detector
make test-js       # Run JavaScript/React tests
make testall       # Run all tests (Go + JS + i18n)
make watch         # Run Go tests in watch mode
```

### Code Quality
```bash
make lint          # Lint Go code
make lintall       # Lint Go and JS code
make format        # Format code
```

### Database Migrations
```bash
make migration-sql  # Create empty SQL migration file
make migration-go   # Create empty Go migration file
```

### Deployment

**Stage (YOUR_DOMAIN):**
```bash
./rebuild-and-deploy.sh
```

**Production (qirim.online):**
```bash
./rebuild-and-deploy-qirim-online.sh
```

Both scripts:
1. Build Docker image for linux/amd64
2. Save as tar
3. Upload to server
4. Load and restart containers
5. Takes ~3-5 minutes

### Docker
```bash
./build-image.sh  # Build Docker image for linux/amd64

# Manual docker commands
docker compose -f docker-compose.qirim-online.yml up -d
docker compose -f docker-compose.qirim-online.yml restart navidrome
docker compose -f docker-compose.qirim-online.yml logs -f navidrome
```

## Architecture

### Server Structure (Go)

**Key Packages:**
- `server/` - HTTP server, routing, middleware, authentication
  - `auth.go` - JWT authentication, OAuth, login/signup handlers
  - `server.go` - Main server initialization and routing
  - `oauth.go` - OAuth providers (Google, Facebook)
  - `nativeapi/` - Native API endpoints
  - `public/` - Public sharing endpoints
  - `subsonic/` - Subsonic API compatibility
- `conf/` - Configuration management (loads from env vars, toml, etc.)
- `model/` - Data models and interfaces
- `persistence/` - Database layer (SQLite)
- `core/` - Business logic (auth, scanning, transcoding, etc.)
- `db/migrations/` - Database migrations

**Authentication Flow:**
1. `JWTVerifier` middleware extracts token from header/cookie/query
2. `Authenticator` middleware validates user from token
3. Special case: `DevAutoLoginUsername` for guest access (auto-login)
4. OAuth flow: `/auth/oauth/{provider}` → provider login → `/auth/oauth/callback/{provider}`

**Routing Pattern:**
```
/ → redirects to /app/
/app/ → React SPA
/api/ → Native API (requires auth)
/rest/ → Subsonic API
/auth/ → Login, signup, OAuth
/p/ → Public shares (no auth required)
```

### Frontend Structure (React)

**Key Directories:**
- `ui/src/themes/` - Custom QO Dark/Light themes
- `ui/src/layout/` - Login page, main layout
- `ui/src/album/` - Album views (includes circular cover modification)
- `ui/src/song/` - Song list, playback, auto-queue logic
- `ui/src/i18n/` - Translations (en, ru, etc.)
- `ui/public/` - Static assets (logos, privacy.html, etc.)

**Custom Modifications:**
- **AlbumGridView.jsx** - Circular album covers (70% size, centered)
- **SongList.jsx** - Click song → queue all songs from current list
- **useAutoLoadQueue.js** - Auto-load next page when queue < 10 songs
- **Login.jsx** - OAuth buttons, Privacy Policy link

### Configuration

Environment variables (via docker-compose or .env):
- `ND_DEVAUTOLOGINUSERNAME` - Auto-login as specific user (guest access)
- `ND_OAUTH_ENABLED`, `ND_OAUTH_GOOGLE_ENABLED`, etc. - OAuth config
- `ND_OAUTH_GOOGLE_CLIENTID`, `ND_OAUTH_GOOGLE_CLIENTSECRET` - OAuth credentials
- `ND_ENABLESELFREGISTRATION` - Allow user self-registration
- `ND_DEFAULTTHEME` - Default UI theme (e.g., "QODarkTheme")

See `docker-compose.qirim-online.yml` for full production config.

### Guest Access (DevAutoLoginUsername)

**How it works:**
1. Set `ND_DEVAUTOLOGINUSERNAME="qirim-guest"` in docker-compose
2. User "qirim-guest" MUST exist in database before enabling
3. `UsernameFromConfig()` returns username from config
4. `Authenticator` middleware checks `UsernameFromConfig` first in chain
5. All visitors auto-login as that user

**Important:** User must be created manually in admin panel BEFORE enabling auto-login.

## Important Files

### Deployment
- `docker-compose.qirim-online.yml` - Production config (qirim.online)
- `docker-compose.yml` - Stage config (YOUR_DOMAIN)
- `Dockerfile.simple` - Docker build file
- `nginx/nginx-qirim-online.conf` - Nginx reverse proxy config for production

### Documentation
- `DEPLOYMENT.md` - Detailed deployment guide
- `OAUTH_SETUP.md` - OAuth configuration guide
- `MAILCOW_SETUP.md` - Mailcow email server setup
- `PUBLIC_ACCESS_IMPLEMENTATION_PLAN.md` - Plan for proper guest user mode
- `WHY_GOOGLE_FLAGGED_AS_PHISHING.md` - OAuth false positive analysis
- `docs/XRAY_VPN_SETUP.md` - Xray VPN full documentation
- `XRAY_DEPLOYMENT_QUICKSTART.md` - Quick deployment guide for Xray
- `docs/SEARCH_IMPROVEMENTS.md` - Enhanced multilingual search documentation
- `docs/BACKUP_SETUP.md` - Backup configuration and automation
- `docs/TROUBLESHOOTING.md` - Common issues and solutions

### Configuration
- `navidrome.toml` - Local development config
- `.env.example` - Environment variables template
- `xray/config.json` - Xray VPN configuration (UUID, protocols, paths)

## Common Workflows

### Adding a New Theme
1. Create `ui/src/themes/yourTheme.js`
2. Export from `ui/src/themes/index.js`
3. Rebuild UI: `make buildjs`
4. Theme will be available in Settings

### Modifying OAuth Providers
1. Edit `server/oauth.go` to add/modify provider
2. Update `docker-compose.qirim-online.yml` with credentials
3. Add UI button in `ui/src/layout/OAuthButtons.jsx`
4. Rebuild and deploy

### Database Migration
1. Create migration: `make migration-sql` or `make migration-go`
2. Edit file in `db/migrations/`
3. Migrations run automatically on startup

### Updating UI Translations
1. Edit `ui/src/i18n/en.json` (English) or `ui/src/i18n/ru.json` (Russian)
2. Use translation key: `translate('ra.auth.privacyPolicy')`
3. Rebuild UI: `make buildjs`

### Deploying Xray VPN
1. Create xray folder on server: `mkdir -p /opt/navidrome/xray`
2. Upload config: `scp xray/config.json root@93.127.197.163:/opt/navidrome/xray/`
3. Upload docker-compose and nginx configs
4. Start: `docker compose -f docker-compose.qirim-online.yml up -d xray`
5. Generate QR: `./scripts/generate-xray-qr.sh`
6. Send QR code to users

See [docs/XRAY_DEPLOYMENT_QUICKSTART.md](docs/XRAY_DEPLOYMENT_QUICKSTART.md) for details.

## Testing Changes

### Local Testing
```bash
make dev  # Start dev server on http://localhost:4533
```

### Server Testing
After deployment, check:
```bash
ssh root@93.127.197.163 'cd /opt/navidrome && docker compose logs -f navidrome'
```

### OAuth Testing
1. Must use HTTPS (OAuth requires secure context)
2. Test both providers: Google, Facebook
3. Check redirect URI matches OAuth app config

## Known Issues & Gotchas

1. **DevAutoLoginUsername requires user to exist first** - Create user in admin panel BEFORE enabling auto-login
2. **OAuth callback must match exactly** - Check `ND_OAUTH_REDIRECTURL` matches OAuth app configuration
3. **DKIM for email** - Must be manually configured in DNS for each domain
4. **Google Safe Browsing false positives** - OAuth URLs can trigger phishing warnings; requires manual review request
5. **Build time** - Full build + deployment takes 3-5 minutes
6. **Platform-specific Docker build** - Use `build-image.sh` for linux/amd64 (Mac M1/M2 runs arm64 locally)

## External Services

- **Stage:** https://YOUR_DOMAIN (server: 93.127.197.163)
- **Production:** https://qirim.online (server: 93.127.197.163)
- **Mail Server:** https://mail.qirim.online (Mailcow)
- **OAuth Redirect:** https://qirim.online/auth/oauth/callback
- **Xray VPN Endpoint:** https://qirim.online/video_bridge_42 (WebSocket)

## Support Documents

When working on email/OAuth issues, refer to:
- [docs/MAILCOW_SETUP.md](docs/MAILCOW_SETUP.md) - Email server configuration
- [docs/OAUTH_SETUP.md](docs/OAUTH_SETUP.md) - OAuth setup details

When deploying, always check:
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Step-by-step deployment instructions
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Common issues and solutions
- Docker compose logs for errors
- Nginx logs on server for proxy issues

When working on Xray VPN, refer to:
- [docs/XRAY_DEPLOYMENT_QUICKSTART.md](docs/XRAY_DEPLOYMENT_QUICKSTART.md) - Quick deployment guide
- [docs/XRAY_VPN_SETUP.md](docs/XRAY_VPN_SETUP.md) - Full technical documentation
- `scripts/generate-xray-qr.sh` - QR code generator for clients

When working on backups, refer to:
- [docs/BACKUP_SETUP.md](docs/BACKUP_SETUP.md) - Backup configuration and automation
