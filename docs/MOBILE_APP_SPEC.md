# QO Music — Mobile App (Android)

Technical Specification for a branded Android app based on [Tempo](https://github.com/CappielloAntonio/tempo) fork.

## Overview

| Parameter | Value |
|-----------|-------|
| Base project | Tempo v3.9.0 (GPL-3.0) |
| Language | Java + Kotlin |
| Min SDK | 24 (Android 7.0) |
| UI | Material 3 / Material You (XML + ViewBinding) |
| Media | AndroidX Media3 (ExoPlayer) — gapless, background playback |
| Network | Retrofit + OkHttp |
| Database | Room (SQLite) |
| Server | Navidrome (Subsonic/OpenSubsonic API) |
| Default server | `https://qirim.online` |

---

## Phase 1 — MVP (1-2 weeks)

Tempo already has all core music features. Phase 1 = branding + QO server preconfig.

### 1.1 Rebranding

| Item | Current (Tempo) | Target (QO Music) |
|------|-----------------|-------------------|
| App name | Tempo | QO Music / Qırım Online |
| Package ID | `com.cappielloantonio.tempo` | `online.qirim.music` |
| App icon | Tempo icon | QO logo (`qo-512x512.png`) |
| Splash screen | Tempo | QO logo + gradient |
| Color scheme | Material You default | QO Purple `#5b5fd5` as seed color |
| Fonts | System default | Rajdhani (as in web app) |

### 1.2 Pre-configured Server

- First launch: skip "add server" screen
- Auto-connect to `https://qirim.online` with guest access
- User can add additional servers in Settings
- "Login" button for registered users (Subsonic token auth)

### 1.3 Guest Access (No Login Required)

Tempo requires login. We need to add guest mode:

- On first launch → connect to `qirim.online` as guest (no credentials)
- Guest can browse, search, stream — all read-only
- Guest cannot: create playlists, star songs, scrobble to personal stats
- "Login" / "Sign Up" button in Settings or header
- Scrobble via `/rest/globalScrobble` endpoint (global stats only)

### 1.4 Home Screen Customization

Tempo's home has configurable sections. Configure defaults for QO:

| Section | Source | Priority |
|---------|--------|----------|
| Shuffle All | Random 500 songs | Top (hero button) |
| Recently Played | User history (if logged in) | 1 |
| Random Albums | `getAlbumList2?type=random` | 2 |
| New Additions | `getAlbumList2?type=newest` | 3 |
| Most Played | `getAlbumList2?type=frequent` | 4 |
| Top Rated | `getAlbumList2?type=highest` | 5 |

### 1.5 Build & Distribution

- Build flavor: `qo` (alongside existing `tempo`, `play`, `notquitemy`)
- Sign with QO keystore
- Distribute via:
  - Direct APK download from `qirim.online/app`
  - Google Play Store (later)
  - F-Droid (later)

---

## Phase 2 — QO Features (2-3 weeks)

### 2.1 OAuth Login

Tempo uses Subsonic token auth only. Add OAuth support:

- Login screen: "Login with Google" / "Login with Facebook" buttons
- Flow: Open browser → `qirim.online/auth/oauth/{provider}` → callback → receive JWT → store token
- Use JWT token for subsequent API requests
- Fallback: traditional username/password login (existing Tempo feature)

### 2.2 Wrapped (Year in Review)

Spotify-like statistics page:

- New screen accessible from menu / profile
- Fetch data from `/api/wrapped/{year}` endpoint
- Slides: Top Tracks, Top Artists, Top Albums, Stats, Badges
- Share button → generate shareable image or link
- Year selector (2024, 2025, 2026...)

### 2.3 Lyrics & Karaoke

Tempo already supports lyrics via OpenSubsonic `getLyricsBySongId`. Enhance:

- Synchronized lyrics display in player (already in Tempo v3.8.0)
- Karaoke mode toggle — highlight current line, larger font
- Fallback to plain lyrics if synced not available

### 2.4 Enhanced Search

- Transliteration support: Cyrillic ↔ Latin (Crimean Tatar)
- Search "Haytarma" should find "Хайтарма" and vice versa
- Implement client-side transliteration map (reuse from web app)

### 2.5 Mobile Player Bar Enhancements

Tempo already has a bottom player. Enhancements:

- Circular album art option (matching web app style)
- Swipe up to expand player
- Swipe left/right for next/previous track

---

## Phase 3 — Advanced (4+ weeks)

### 3.1 Video Clips

- Video clip browser (grid view)
- Video player integration (ExoPlayer already supports video)
- Audio/Video mutual exclusion (pause audio when video plays)

### 3.2 Social Features

- Share song/album/playlist via Android Share Sheet
- Deep links: `qirim.online/p/share_id` → opens in app
- Social media links (VK, Facebook, Instagram) in About screen

### 3.3 Device Grant

- TV/limited-input device authorization flow
- Display code → enter at `qirim.online/device/grant`
- Useful for Android TV version later

### 3.4 Offline Mode

Tempo has partial offline support. Complete it:

- Download albums/playlists for offline
- Download quality selector (original / 128kbps / 320kbps)
- Storage management (view cached size, clear cache)
- Offline indicator on downloaded content

### 3.5 Android Auto

Tempo v3.6.0+ already has Android Auto support. Verify it works with QO server and customize:

- QO branding in Auto interface
- Browse by: Albums, Artists, Playlists, Genres, Radio
- Voice: "Play Crimean Tatar music"

---

## Technical Implementation Notes

### What Tempo Already Handles (No Work Needed)

- Background playback with foreground service (solves our main problem)
- MediaSession integration (lock screen controls, headphone buttons)
- Gapless playback (ExoPlayer)
- ReplayGain support
- Queue management with persistence (Room DB)
- Multi-server support
- Chromecast (basic)
- Android Auto
- Material 3 theming with dark/light mode
- Notification with playback controls
- Scrobbling
- Bookmarks
- Internet Radio
- Podcasts

### What Needs to Be Added/Modified

| Feature | Effort | Priority |
|---------|--------|----------|
| Rebranding (icons, colors, name) | 2-3 days | P0 |
| Guest access (no login required) | 3-4 days | P0 |
| Pre-configured QO server | 1 day | P0 |
| OAuth login (Google, Facebook) | 3-5 days | P1 |
| Wrapped feature | 5-7 days | P1 |
| Transliteration search | 2-3 days | P2 |
| Karaoke mode enhancement | 2-3 days | P2 |
| Video clips | 5-7 days | P3 |
| Deep links | 2-3 days | P3 |
| Complete offline mode | 5-7 days | P3 |

### Architecture Changes

```
com.cappielloantonio.tempo → online.qirim.music

Modify:
  ├── App.java → Add default server config
  ├── ui/activity/MainActivity → Guest mode logic
  ├── ui/fragment/LoginFragment → OAuth buttons + guest skip
  ├── ui/fragment/HomeFragment → QO default sections
  ├── subsonic/RetrofitClient.kt → Guest auth headers
  └── service/MediaService → globalScrobble for guests

Add:
  ├── ui/fragment/WrappedFragment → Year in review
  ├── ui/fragment/OAuthFragment → OAuth WebView flow
  ├── util/Transliteration.kt → Cyrillic ↔ Latin
  └── model/WrappedData.kt → Wrapped API models
```

### API Endpoints (QO-specific, beyond standard Subsonic)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/rest/globalScrobble` | GET | No | Guest play statistics |
| `/api/wrapped/{year}` | GET | Yes | Wrapped data |
| `/api/wrapped/share` | POST | Yes | Create wrapped share |
| `/auth/oauth/{provider}` | GET | No | OAuth login flow |
| `/auth/oauth/callback/{provider}` | GET | No | OAuth callback |

### Build Configuration

```groovy
// build.gradle - new QO flavor
productFlavors {
    qo {
        applicationId "online.qirim.music"
        versionNameSuffix "-qo"
        buildConfigField "String", "DEFAULT_SERVER", "\"https://qirim.online\""
        buildConfigField "boolean", "GUEST_MODE_ENABLED", "true"
        buildConfigField "boolean", "OAUTH_ENABLED", "true"
    }
}
```

---

## Design Guidelines

### Colors
- Primary: `#5b5fd5` (QO Purple)
- Background Dark: `#303030`
- Background Light: `#FAFAFA`
- Accent: `#7C80E0`

### Typography
- Headings: Rajdhani (Bold)
- Body: Rajdhani (Regular)
- Player: Rajdhani (Medium)

### Icons & Assets
- App icon: QO logo (rounded corners for adaptive icon)
- Splash: QO logo centered on gradient background
- Notification: QO monochrome icon

---

## Testing Checklist

### Background Playback (Critical — the reason for this app)
- [ ] Play music → lock screen → continues playing
- [ ] Play music → switch to another app → continues playing
- [ ] Play music → remove from recent apps → continues playing
- [ ] Battery Optimized mode → still plays in background
- [ ] Track transition in background → next track starts
- [ ] 1 hour continuous playback in background → no interruption

### Core Playback
- [ ] Stream from qirim.online server
- [ ] Gapless playback between tracks
- [ ] Queue management (add, remove, reorder)
- [ ] Shuffle / Repeat modes
- [ ] Lock screen controls (play/pause/next/prev)
- [ ] Headphone button controls
- [ ] Notification controls

### Guest Mode
- [ ] First launch → browse without login
- [ ] Stream as guest → works
- [ ] Guest scrobble → globalScrobble endpoint called
- [ ] Login button → switches to authenticated mode
- [ ] Logout → returns to guest mode

### Android Auto
- [ ] Connect to car → browse library
- [ ] Play from Android Auto
- [ ] Controls work (next/prev/pause)

---

## Timeline

| Week | Milestone |
|------|-----------|
| 1 | Fork + rebrand + guest access + pre-configured server |
| 2 | OAuth login + home screen customization + APK release |
| 3 | Wrapped feature + karaoke enhancements |
| 4 | Transliteration search + polish + Play Store submission |

---

## Success Criteria

1. **Background playback works indefinitely** — no stops, no pauses, no battery optimization issues
2. Guest users can listen without registration
3. QO branding is consistent with web app
4. Available as direct APK download within 2 weeks
