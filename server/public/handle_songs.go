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
	Album        string
	Year         int
	Duration     string
	Lyrics       string
	LyricsHTML   template.HTML
	ImageURL     string
	SongURL      string
	CanonicalURL string
	SiteName     string
	Description  string
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

// formatLyricsHTML converts plain text lyrics to HTML with line breaks
func formatLyricsHTML(lyrics string) string {
	if lyrics == "" {
		return "<p>Текст песни недоступен</p>"
	}
	escaped := html.EscapeString(lyrics)
	// Replace newlines with <br> tags
	return strings.ReplaceAll(escaped, "\n", "<br>\n")
}

// Song page HTML template with Schema.org markup
var songPageTemplate = template.Must(template.New("song").Parse(`<!DOCTYPE html>
<html lang="crh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{.Title}} — {{.Artist}} | Текст песни | {{.SiteName}}</title>
    <meta name="description" content="{{.Description}}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://qirim.online{{.CanonicalURL}}">

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

    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e0e0e0;
            min-height: 100vh;
            line-height: 1.6;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .header {
            display: flex;
            gap: 24px;
            margin-bottom: 32px;
            align-items: flex-start;
        }
        .cover {
            width: 200px;
            height: 200px;
            border-radius: 12px;
            object-fit: cover;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            flex-shrink: 0;
        }
        .info h1 {
            font-size: 2rem;
            color: #fff;
            margin-bottom: 8px;
        }
        .info .artist {
            font-size: 1.25rem;
            color: #64b5f6;
            margin-bottom: 8px;
        }
        .info .album {
            color: #9e9e9e;
            margin-bottom: 16px;
        }
        .listen-btn {
            display: inline-block;
            background: #4caf50;
            color: white;
            padding: 12px 24px;
            border-radius: 24px;
            text-decoration: none;
            font-weight: 500;
            transition: background 0.2s;
        }
        .listen-btn:hover {
            background: #66bb6a;
        }
        .lyrics-section {
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 32px;
            margin-top: 24px;
        }
        .lyrics-section h2 {
            font-size: 1.25rem;
            color: #fff;
            margin-bottom: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 12px;
        }
        .lyrics {
            white-space: pre-wrap;
            font-size: 1.1rem;
            line-height: 1.8;
            color: #e0e0e0;
        }
        .footer {
            margin-top: 48px;
            text-align: center;
            color: #666;
            font-size: 0.875rem;
        }
        .footer a {
            color: #64b5f6;
            text-decoration: none;
        }
        @media (max-width: 600px) {
            .header { flex-direction: column; align-items: center; text-align: center; }
            .cover { width: 160px; height: 160px; }
            .info h1 { font-size: 1.5rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <img class="cover" src="{{.ImageURL}}" alt="{{.Album}} — обложка альбома" loading="lazy">
            <div class="info">
                <h1>{{.Title}}</h1>
                <p class="artist">{{.Artist}}</p>
                <p class="album">{{.Album}}{{if .Year}} • {{.Year}}{{end}} • {{.Duration}}</p>
                <a href="{{.SongURL}}" class="listen-btn">▶ Слушать на Qirim.Online</a>
            </div>
        </header>

        <section class="lyrics-section">
            <h2>Текст песни</h2>
            <div class="lyrics">{{.LyricsHTML}}</div>
        </section>

        <footer class="footer">
            <p>© <a href="https://qirim.online">Qirim.Online</a> — Крупнейший архив крымскотатарской музыки</p>
        </footer>
    </div>
</body>
</html>
`))
