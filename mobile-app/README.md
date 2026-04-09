# QO Music - Android App

Android music streaming app for [Qırım Online](https://qirim.online).

## Prerequisites

- Android Studio Hedgehog (2023.1.1) or later
- JDK 17
- Android SDK 34

## Setup

1. Download Rajdhani font from [Google Fonts](https://fonts.google.com/specimen/Rajdhani)
2. Place `Rajdhani-Regular.ttf`, `Rajdhani-Bold.ttf`, `Rajdhani-Medium.ttf` in `app/src/main/res/font/`
3. Open project in Android Studio
4. Sync Gradle

## Build

```bash
# Debug APK
./gradlew assembleQoDebug

# Release APK (requires keystore)
./gradlew assembleQoRelease
```

## Architecture

- **MVVM** with ViewModels + LiveData
- **Hilt** for dependency injection
- **Room** for local database
- **Retrofit** for Subsonic API
- **Media3** (ExoPlayer) for playback with background service
- **Navigation Component** for screen flow

## Package Structure

```
online.qirim.music/
├── di/              # Hilt dependency injection modules
├── repository/      # Data layer (Room DB, server config)
├── service/         # PlaybackService (Media3 MediaSessionService)
├── subsonic/
│   ├── api/         # Retrofit API interface
│   ├── model/       # Subsonic data models
│   └── utils/       # Auth interceptor
├── ui/
│   ├── activity/    # MainActivity
│   ├── adapter/     # RecyclerView adapters
│   ├── fragment/    # Screens (Home, Search, Library, Player, Login, Settings)
│   └── viewmodel/   # ViewModels
└── util/            # Transliteration, helpers
```
