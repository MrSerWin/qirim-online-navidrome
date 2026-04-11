# QO Workspace — Repo Map

Top-level layout of the `qo.code-workspace` that joins the server and mobile app.

## Workspace file

`d:/MyProjects/qo.code-workspace` — opens the two repos below as a single VS Code workspace:

```json
{
  "folders": [
    { "path": "qirim-online-navidrome" },
    { "path": "qo-music-android" }
  ]
}
```

Open the whole product with: `code d:/MyProjects/qo.code-workspace`.

## Repositories

### 1. [qirim-online-navidrome](../../qirim-online-navidrome/) — Server + Web

**Path:** `d:/MyProjects/qirim-online-navidrome`
**Stack:** Go (Navidrome fork v0.58.0) + React/MUI frontend + SQLite + Docker
**Runs on:** https://qirim.online (prod, server `93.127.197.163`) and https://YOUR_DOMAIN (stage)
**Project doc:** [CLAUDE.md](../CLAUDE.md)

This is the primary backend + web UI. It also serves the Subsonic API that the Android app talks to, the OAuth endpoints the app opens in the browser, and the public share pages (`/p/...`) used for deep links.

Things that live here and **only** here:
- Subsonic + native API (`server/subsonic/`, `server/nativeapi/`)
- OAuth providers / JWT auth (`server/oauth.go`, `server/auth.go`)
- `DevAutoLoginUsername` guest-mode wiring (required by the Android app)
- Wrapped feature, multilingual search, URL aliases
- Nginx + Docker Compose + Xray VPN deployment
- All server-side docs ([docs/](./))

**Note:** `qirim-online-navidrome/mobile-app/` is an abandoned early scaffold (last touched in commit `7fefa4f0 "mobile step 1"`). The live Android app is the separate repo below — do **not** edit `mobile-app/`, and eventually it should be deleted.

### 2. [qo-music-android](../../../qo-music-android/) — Android App

**Path:** `d:/MyProjects/qo-music-android`
**Stack:** Android (Java + Kotlin), Media3, Retrofit, Room, Navigation Component
**Fork of:** [Tempo](https://github.com/CappielloAntonio/tempo) v3.9.0
**Package:** `online.qirim.music` (QO product flavor)
**Project doc:** [qo-music-android/CLAUDE.md](../../../qo-music-android/CLAUDE.md)

Customizations live under `app/src/qo/` and override matching files in `app/src/main/` at compile time. Always build the `Qo` flavor:

```bash
./gradlew assembleQoDebug
./gradlew installQoDebug
```

Things that live here and **only** here:
- Android UI, navigation, playback service
- Chromecast integration (`qoImplementation` only)
- OAuth callback handler (`qomusic://oauth/callback`) in `MainActivity.handleIntent()`
- Deep-link handling for `https://qirim.online/p/{shareId}`
- Local Room caching, offline queue

## Cross-cutting concerns — where to look when something breaks

| Symptom | Start in | Then check |
|---|---|---|
| App can't reach server / 401 / 500 | `qirim-online-navidrome` Docker logs | `nginx/nginx-qirim-online.conf`, `server/auth.go` |
| Subsonic endpoint returns wrong shape | `server/subsonic/` | Retrofit models in `qo-music-android/app/src/main/java/.../subsonic/` |
| OAuth login fails on mobile | `server/oauth.go` + `ND_OAUTH_REDIRECTURL` env | `qo-music-android` `MainActivity.handleIntent()` + `AndroidManifest.xml` intent filter |
| Guest mode broken in app | `ND_DEVAUTOLOGINUSERNAME` in `docker-compose.qirim-online.yml` + user exists in DB | App `LoginFragment` guest path |
| Deep link `/p/{id}` doesn't open app | `server/public/` share handler | Android `AndroidManifest.xml` app links + `assetlinks.json` on server |
| Search returns nothing for Cyrillic | [docs/SEARCH_IMPROVEMENTS.md](SEARCH_IMPROVEMENTS.md), `persistence/sql_search.go` | App-side transliteration in `util/` |
| Playback stops / transcoding fails | Navidrome transcode config + ffmpeg in Docker image | Media3 service in `qo-music-android/app/src/qo/.../service/` |
| Wrapped page empty / broken share | `WRAPPED_IMPLEMENTATION_STATUS.md`, `server/public/` | — (web only, no mobile counterpart yet) |
| Xray VPN tunnel down | [docs/XRAY_VPN_SETUP.md](XRAY_VPN_SETUP.md) | `xray/config.json`, nginx `/video_bridge_42` location |

## Contracts between the two repos

These are the load-bearing agreements. Change one side, change the other.

1. **Subsonic API shape** — server must stay Subsonic-compatible; app is a Subsonic client.
2. **OAuth callback URL** — server redirects to `qomusic://oauth/callback?token=...&subsonicToken=...&subsonicSalt=...&username=...`. The query-param names are hard-coded on both sides.
3. **Guest mode** — server must keep `ND_DEVAUTOLOGINUSERNAME="qirim-guest"` set and the user must exist. The app relies on this to let guests browse without logging in.
4. **Deep links** — `https://qirim.online/p/{shareId}` must resolve on both server (public share page) and app (intent filter).
5. **BuildConfig flags** — `qo-music-android` reads `DEFAULT_SERVER_URL`, `OAUTH_GOOGLE_URL`, `OAUTH_FACEBOOK_URL` at build time. If server OAuth paths move, bump these in `app/build.gradle`.

## Deployment paths (quick reference)

- **Server:** `./deploy.sh` (from `qirim-online-navidrome`) — builds linux/amd64 image, uploads, restarts containers. ~3–5 min.
- **Android debug:** `./gradlew installQoDebug` (from `qo-music-android`) to a connected device.
- **Android release:** `./gradlew assembleQoRelease` — requires keystore; output in `app/build/outputs/apk/qo/release/`.

## See also

- Server architecture: [SERVER_ARCHITECTURE.md](SERVER_ARCHITECTURE.md)
- Deployment: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- Troubleshooting: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Mobile app spec: [MOBILE_APP_SPEC.md](MOBILE_APP_SPEC.md)
- Ideas backlog: [NEW_IDEAS.md](NEW_IDEAS.md)
