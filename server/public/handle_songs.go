package public

import (
	"encoding/json"
	"fmt"
	"html"
	"html/template"
	"strings"
	"time"

	"github.com/navidrome/navidrome/model"
)

// SongPageData contains data for rendering the song SEO page
type SongPageData struct {
	Title        string
	Artist       string
	ArtistID     string
	Album        string
	AlbumID      string
	Year         int
	Duration     string
	Lyrics       string
	LyricsHTML   template.HTML
	ImageURL     string
	SongURL      string
	LyricsURL    string
	CanonicalURL string
	SiteName     string
	Description  string
	CurrentYear  int
}

// extractLyricsText extracts plain text lyrics from the MediaFile
func extractLyricsText(mf *model.MediaFile) string {
	if mf.Lyrics == "" || mf.Lyrics == "[]" {
		return ""
	}

	// Try to parse structured lyrics
	var lyricsList model.LyricList
	if err := json.Unmarshal([]byte(mf.Lyrics), &lyricsList); err != nil {
		// If parsing fails, it might be plain text
		return mf.Lyrics
	}

	if len(lyricsList) == 0 {
		return ""
	}

	// Extract text from the first lyrics entry
	var lines []string
	for _, line := range lyricsList[0].Line {
		lines = append(lines, line.Value)
	}

	return strings.Join(lines, "\n")
}

// formatDuration formats duration in seconds to MM:SS format
func formatDuration(seconds float32) string {
	d := time.Duration(seconds) * time.Second
	m := int(d.Minutes())
	s := int(d.Seconds()) % 60
	return fmt.Sprintf("%d:%02d", m, s)
}

// formatLyricsHTML converts plain text lyrics to HTML (escapes special chars)
func formatLyricsHTML(lyrics string) string {
	if lyrics == "" {
		return "<p class=\"no-lyrics\">Текст песни недоступен</p>"
	}
	// Just escape HTML, white-space: pre-wrap handles line breaks
	return html.EscapeString(lyrics)
}

// Song page HTML template with Schema.org markup - QO Dark theme
var songPageTemplate = template.Must(template.New("song").Parse(`<!DOCTYPE html>
<html lang="crh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{.Title}} — {{.Artist}} | Текст песни | {{.SiteName}}</title>
    <meta name="description" content="{{.Description}}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://qirim.online{{.CanonicalURL}}">
    <link rel="icon" href="/app/favicon.ico" type="image/x-icon">

    <!-- Open Graph -->
    <meta property="og:type" content="music.song">
    <meta property="og:title" content="{{.Title}} — {{.Artist}}">
    <meta property="og:description" content="{{.Description}}">
    <meta property="og:image" content="https://qirim.online{{.ImageURL}}">
    <meta property="og:url" content="https://qirim.online{{.CanonicalURL}}">
    <meta property="og:site_name" content="{{.SiteName}}">
    <meta property="music:duration" content="{{.Duration}}">
    <meta property="music:musician" content="{{.Artist}}">
    <meta property="music:album" content="{{.Album}}">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{.Title}} — {{.Artist}}">
    <meta name="twitter:description" content="{{.Description}}">
    <meta name="twitter:image" content="https://qirim.online{{.ImageURL}}">

    <!-- Schema.org JSON-LD -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "MusicRecording",
        "name": "{{.Title}}",
        "byArtist": {
            "@type": "MusicGroup",
            "name": "{{.Artist}}"
        },
        "inAlbum": {
            "@type": "MusicAlbum",
            "name": "{{.Album}}"
        },
        "duration": "PT{{.Duration}}",
        {{if .Year}}"datePublished": "{{.Year}}",{{end}}
        "url": "https://qirim.online{{.SongURL}}",
        "image": "https://qirim.online{{.ImageURL}}"
    }
    </script>

    <!-- Google Fonts - Rajdhani (same as QO Dark theme) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet">

    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Rajdhani', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: #202021;
            color: #D8DEE9;
            min-height: 100vh;
            line-height: 1.6;
        }

        /* Navigation bar - matching QO Dark */
        .navbar {
            background-color: #4C566A;
            box-shadow: rgba(15, 17, 21, 0.25) 0px 4px 6px, rgba(15, 17, 21, 0.1) 0px 5px 7px;
            padding: 0 16px;
            height: 64px;
            display: flex;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .navbar-content {
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            color: #fff;
        }

        .logo img {
            height: 40px;
            width: auto;
        }

        .logo-text {
            font-size: 1.25rem;
            font-weight: 700;
            color: #E5E9F0;
        }

        .nav-links {
            display: flex;
            gap: 8px;
        }

        .nav-link {
            color: #D8DEE9;
            text-decoration: none;
            padding: 8px 16px;
            border-radius: 500px;
            font-size: 0.875rem;
            font-weight: 500;
            transition: background-color 0.2s;
        }

        .nav-link:hover {
            background-color: #5E81AC;
        }

        /* Main content */
        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 32px 20px;
        }

        /* Breadcrumb */
        .breadcrumb {
            font-size: 0.875rem;
            color: #b3b3b3;
            margin-bottom: 24px;
        }

        .breadcrumb a {
            color: #81A1C1;
            text-decoration: none;
        }

        .breadcrumb a:hover {
            text-decoration: underline;
        }

        /* Song header */
        .song-header {
            display: flex;
            gap: 32px;
            margin-bottom: 32px;
            background: #2b2b2b;
            border-radius: 8px;
            padding: 24px;
        }

        .cover {
            width: 200px;
            height: 200px;
            border-radius: 8px;
            object-fit: cover;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            flex-shrink: 0;
        }

        .song-info {
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .song-info h1 {
            font-size: 2rem;
            font-weight: 700;
            color: #E5E9F0;
            margin-bottom: 8px;
            line-height: 1.2;
        }

        .song-info .artist {
            font-size: 1.25rem;
            color: #81A1C1;
            margin-bottom: 8px;
            font-weight: 600;
        }

        .song-info .artist a {
            color: inherit;
            text-decoration: none;
        }

        .song-info .artist a:hover {
            text-decoration: underline;
        }

        .song-info .meta {
            color: #b3b3b3;
            font-size: 0.875rem;
            margin-bottom: 20px;
        }

        .song-info .meta a {
            color: #b3b3b3;
            text-decoration: none;
        }

        .song-info .meta a:hover {
            color: #81A1C1;
            text-decoration: underline;
        }

        .listen-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #5E81AC;
            color: #fff;
            padding: 12px 24px;
            border-radius: 500px;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.875rem;
            transition: all 0.2s;
            border: none;
            cursor: pointer;
        }

        .listen-btn:hover {
            background: #81A1C1;
            transform: scale(1.02);
        }

        .listen-btn svg {
            width: 20px;
            height: 20px;
        }

        /* Lyrics section */
        .lyrics-section {
            background: #2b2b2b;
            border-radius: 8px;
            padding: 32px;
        }

        .lyrics-section h2 {
            font-size: 1.125rem;
            font-weight: 700;
            color: #E5E9F0;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid #4C566A;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .lyrics {
            white-space: pre-wrap;
            font-size: 1.05rem;
            line-height: 2;
            color: #D8DEE9;
        }

        .no-lyrics {
            color: #b3b3b3;
            font-style: italic;
            text-align: center;
            padding: 40px 0;
        }

        /* Footer */
        .footer {
            margin-top: 48px;
            padding: 24px;
            text-align: center;
            color: #b3b3b3;
            font-size: 0.875rem;
            border-top: 1px solid #4C566A;
        }

        .footer a {
            color: #81A1C1;
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        /* Mobile responsive */
        @media (max-width: 640px) {
            .song-header {
                flex-direction: column;
                align-items: center;
                text-align: center;
            }

            .cover {
                width: 180px;
                height: 180px;
            }

            .song-info h1 {
                font-size: 1.5rem;
            }

            .nav-links {
                display: none;
            }

            .lyrics-section {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="navbar-content">
            <a href="/app/" class="logo">
                <img src="/qo-logo.png" alt="Qirim.Online" onerror="this.style.display='none';">
                <span class="logo-text">Qirim.Online</span>
            </a>
            <div class="nav-links">
                <a href="/app/#/album" class="nav-link">Альбомы</a>
                <a href="/app/#/artist" class="nav-link">Артисты</a>
                <a href="/app/#/song" class="nav-link">Песни</a>
            </div>
        </div>
    </nav>

    <div class="container">
        <!-- Breadcrumb -->
        <nav class="breadcrumb">
            <a href="/app/">Главная</a> ›
            <a href="/app/#/song">Песни</a> ›
            {{.Title}}
        </nav>

        <!-- Song Header -->
        <header class="song-header">
            <img class="cover" src="{{.ImageURL}}" alt="{{.Album}} — обложка альбома" loading="lazy" onerror="this.onerror=null; this.src='/album-placeholder.webp';">
            <div class="song-info">
                <h1>{{.Title}}</h1>
                <p class="artist"><a href="/app/#/artist/{{.ArtistID}}/show">{{.Artist}}</a></p>
                <p class="meta"><a href="/app/#/album/{{.AlbumID}}/show">{{.Album}}</a>{{if .Year}} • {{.Year}}{{end}} • {{.Duration}}</p>
                <a href="{{.LyricsURL}}" class="listen-btn">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    Открыть в приложении
                </a>
            </div>
        </header>

        <!-- Lyrics -->
        <section class="lyrics-section">
            <h2>Текст песни</h2>
            <div class="lyrics">{{.LyricsHTML}}</div>
        </section>

        <!-- Footer -->
        <footer class="footer">
            <p>© {{.CurrentYear}} <a href="https://qirim.online">Qirim.Online</a> — Крупнейший архив крымскотатарской музыки</p>
        </footer>
    </div>
</body>
</html>
`))
