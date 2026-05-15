package public

import (
	"fmt"
	"html/template"
	"net/http"
	"strings"
	"time"

	"github.com/Masterminds/squirrel"
	"github.com/go-chi/chi/v5"
	"github.com/navidrome/navidrome/model"
	"github.com/navidrome/navidrome/server"
)

// ArtistRouter handles SEO-friendly artist pages
type ArtistRouter struct {
	http.Handler
	ds model.DataStore
}

func NewArtistRouter(ds model.DataStore) *ArtistRouter {
	ar := &ArtistRouter{ds: ds}
	ar.Handler = ar.routes()
	return ar
}

func (ar *ArtistRouter) routes() http.Handler {
	r := chi.NewRouter()
	r.Use(server.URLParamsMiddleware)
	r.Get("/{id}", ar.handleArtistPage)
	r.Head("/{id}", ar.handleArtistPage)
	return r
}

type artistAlbumItem struct {
	ID       string
	Name     string
	Year     int
	CoverURL string
	URL      string
}

type artistSongItem struct {
	ID       string
	Title    string
	Album    string
	Duration string
	URL      string
}

type ArtistPageData struct {
	ID             string
	Name           string
	Biography      template.HTML
	BiographyText  string
	ImageURL       string
	CanonicalURL   string
	AppURL         string
	AlbumCount     int
	SongCount      int
	Albums         []artistAlbumItem
	TopSongs       []artistSongItem
	SiteName       string
	Description    string
	CurrentYear    int
}

func (ar *ArtistRouter) handleArtistPage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Artist ID is required", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	artist, err := ar.ds.Artist(ctx).Get(id)
	if err != nil {
		artist, err = ar.ds.Artist(ctx).FindByAlias(id)
		if err != nil {
			http.Error(w, "Artist not found", http.StatusNotFound)
			return
		}
	}

	// Get artist albums (newest first)
	albums, _ := ar.ds.Album(ctx).GetAll(model.QueryOptions{
		Filters: squirrel.Eq{"album_artist_id": artist.ID},
		Sort:    "max_year",
		Order:   "desc",
		Max:     100,
	})

	albumItems := make([]artistAlbumItem, 0, len(albums))
	for _, a := range albums {
		albumItems = append(albumItems, artistAlbumItem{
			ID:       a.ID,
			Name:     a.Name,
			Year:     a.MaxYear,
			CoverURL: "/share/img/" + a.ID,
			URL:      "/album/" + a.ID,
		})
	}

	// Get top songs by play count
	songs, _ := ar.ds.MediaFile(ctx).GetAll(model.QueryOptions{
		Filters: squirrel.Eq{"artist_id": artist.ID},
		Sort:    "play_count",
		Order:   "desc",
		Max:     20,
	})

	songItems := make([]artistSongItem, 0, len(songs))
	for _, s := range songs {
		songItems = append(songItems, artistSongItem{
			ID:       s.ID,
			Title:    s.Title,
			Album:    s.Album,
			Duration: formatDuration(s.Duration),
			URL:      "/song/" + s.ID,
		})
	}

	bioText := stripHTML(artist.Biography)
	if bioText == "" {
		bioText = fmt.Sprintf("%s — крымскотатарский исполнитель. Слушайте песни и альбомы на Qirim.Online — крупнейшем архиве крымскотатарской музыки.", artist.Name)
	}
	description := bioText
	if len(description) > 300 {
		description = description[:297] + "..."
	}

	imageURL := artist.ArtistImageUrl()
	if imageURL == "" {
		imageURL = "/share/img/ar-" + artist.ID
	}

	data := ArtistPageData{
		ID:            artist.ID,
		Name:          artist.Name,
		BiographyText: bioText,
		Biography:     template.HTML(formatLyricsHTML(bioText)),
		ImageURL:      imageURL,
		CanonicalURL:  "/artist/" + artist.ID,
		AppURL:        "/app/#/artist/" + artist.ID + "/show",
		AlbumCount:    len(albumItems),
		SongCount:     len(songItems),
		Albums:        albumItems,
		TopSongs:      songItems,
		SiteName:      "Qirim.Online",
		Description:   description,
		CurrentYear:   time.Now().Year(),
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	if err := artistPageTemplate.Execute(w, data); err != nil {
		http.Error(w, "Error rendering page", http.StatusInternalServerError)
	}
}

func stripHTML(s string) string {
	s = strings.ReplaceAll(s, "\n", " ")
	out := strings.Builder{}
	inTag := false
	for _, ch := range s {
		switch {
		case ch == '<':
			inTag = true
		case ch == '>':
			inTag = false
		case !inTag:
			out.WriteRune(ch)
		}
	}
	return strings.TrimSpace(out.String())
}

var artistPageTemplate = template.Must(template.New("artist").Funcs(template.FuncMap{
	"add1": func(i int) int { return i + 1 },
}).Parse(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{.Name}} — слушать песни и альбомы | {{.SiteName}}</title>
    <meta name="description" content="{{.Description}}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://qirim.online{{.CanonicalURL}}">
    <link rel="alternate" hreflang="ru" href="https://qirim.online{{.CanonicalURL}}">
    <link rel="alternate" hreflang="crh" href="https://qirim.online{{.CanonicalURL}}">
    <link rel="alternate" hreflang="x-default" href="https://qirim.online{{.CanonicalURL}}">
    <link rel="icon" href="/app/favicon.ico" type="image/x-icon">

    <meta property="og:type" content="profile">
    <meta property="og:title" content="{{.Name}} — Qirim.Online">
    <meta property="og:description" content="{{.Description}}">
    <meta property="og:image" content="https://qirim.online{{.ImageURL}}">
    <meta property="og:url" content="https://qirim.online{{.CanonicalURL}}">
    <meta property="og:site_name" content="{{.SiteName}}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{.Name}}">
    <meta name="twitter:description" content="{{.Description}}">
    <meta name="twitter:image" content="https://qirim.online{{.ImageURL}}">

    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "MusicGroup",
        "name": "{{.Name}}",
        "url": "https://qirim.online{{.CanonicalURL}}",
        "image": "https://qirim.online{{.ImageURL}}",
        "description": {{.Description | printf "%q"}}{{if .Albums}},
        "album": [{{range $i, $a := .Albums}}{{if $i}},{{end}}{
            "@type": "MusicAlbum",
            "name": {{$a.Name | printf "%q"}},
            "url": "https://qirim.online{{$a.URL}}"{{if $a.Year}},
            "datePublished": "{{$a.Year}}"{{end}}
        }{{end}}]{{end}}{{if .TopSongs}},
        "track": [{{range $i, $s := .TopSongs}}{{if $i}},{{end}}{
            "@type": "MusicRecording",
            "name": {{$s.Title | printf "%q"}},
            "url": "https://qirim.online{{$s.URL}}"
        }{{end}}]{{end}}
    }
    </script>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Главная", "item": "https://qirim.online/"},
            {"@type": "ListItem", "position": 2, "name": "Артисты", "item": "https://qirim.online/"},
            {"@type": "ListItem", "position": 3, "name": "{{.Name}}", "item": "https://qirim.online{{.CanonicalURL}}"}
        ]
    }
    </script>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet">

    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Rajdhani', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #202021; color: #D8DEE9; min-height: 100vh; line-height: 1.6; }
        .navbar { background-color: #4C566A; box-shadow: rgba(15,17,21,0.25) 0px 4px 6px; padding: 0 16px; height: 64px; display: flex; align-items: center; position: sticky; top: 0; z-index: 100; }
        .navbar-content { max-width: 1200px; margin: 0 auto; width: 100%; display: flex; align-items: center; justify-content: space-between; }
        .logo { display: flex; align-items: center; gap: 12px; text-decoration: none; color: #fff; }
        .logo img { height: 40px; width: auto; }
        .logo-text { font-size: 1.25rem; font-weight: 700; color: #E5E9F0; }
        .nav-links { display: flex; gap: 8px; }
        .nav-link { color: #D8DEE9; text-decoration: none; padding: 8px 16px; border-radius: 500px; font-size: 0.875rem; font-weight: 500; }
        .nav-link:hover { background-color: #5E81AC; }
        .container { max-width: 1100px; margin: 0 auto; padding: 32px 20px; }
        .breadcrumb { font-size: 0.875rem; color: #b3b3b3; margin-bottom: 24px; }
        .breadcrumb a { color: #81A1C1; text-decoration: none; }
        .breadcrumb a:hover { text-decoration: underline; }
        .artist-header { display: flex; gap: 32px; margin-bottom: 32px; background: #2b2b2b; border-radius: 8px; padding: 24px; align-items: center; }
        .avatar { width: 200px; height: 200px; border-radius: 50%; object-fit: cover; box-shadow: 0 8px 24px rgba(0,0,0,0.4); flex-shrink: 0; background: #4C566A; }
        .artist-info h1 { font-size: 2.5rem; font-weight: 700; color: #E5E9F0; margin-bottom: 8px; line-height: 1.1; }
        .meta { color: #b3b3b3; font-size: 0.95rem; margin-bottom: 16px; }
        .bio { color: #D8DEE9; font-size: 1rem; line-height: 1.7; max-height: 200px; overflow-y: auto; }
        .listen-btn { display: inline-flex; align-items: center; gap: 8px; background: #5E81AC; color: #fff; padding: 12px 24px; border-radius: 500px; text-decoration: none; font-weight: 600; font-size: 0.875rem; margin-top: 16px; }
        .listen-btn:hover { background: #81A1C1; }
        section { background: #2b2b2b; border-radius: 8px; padding: 24px; margin-bottom: 24px; }
        section h2 { font-size: 1.25rem; font-weight: 700; color: #E5E9F0; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #4C566A; text-transform: uppercase; letter-spacing: 1px; }
        .albums-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px; }
        .album-card { text-decoration: none; color: inherit; transition: transform 0.2s; }
        .album-card:hover { transform: translateY(-2px); }
        .album-card img { width: 100%; aspect-ratio: 1; border-radius: 8px; object-fit: cover; background: #4C566A; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .album-card .album-name { margin-top: 8px; font-weight: 600; font-size: 0.95rem; color: #E5E9F0; }
        .album-card .album-year { color: #b3b3b3; font-size: 0.85rem; }
        .songs-list { list-style: none; }
        .songs-list li { padding: 12px; border-bottom: 1px solid #3b3b3b; display: flex; align-items: center; gap: 12px; }
        .songs-list li:last-child { border-bottom: none; }
        .songs-list .idx { color: #b3b3b3; font-weight: 600; min-width: 24px; }
        .songs-list a { color: #E5E9F0; text-decoration: none; flex: 1; font-weight: 500; }
        .songs-list a:hover { color: #81A1C1; text-decoration: underline; }
        .songs-list .song-album { color: #b3b3b3; font-size: 0.875rem; }
        .songs-list .song-dur { color: #b3b3b3; font-size: 0.875rem; min-width: 50px; text-align: right; }
        .footer { margin-top: 48px; padding: 24px; text-align: center; color: #b3b3b3; font-size: 0.875rem; border-top: 1px solid #4C566A; }
        .footer a { color: #81A1C1; text-decoration: none; }
        @media (max-width: 640px) {
            .artist-header { flex-direction: column; text-align: center; }
            .avatar { width: 160px; height: 160px; }
            .artist-info h1 { font-size: 1.75rem; }
            .nav-links { display: none; }
        }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="navbar-content">
            <a href="/" class="logo">
                <img src="/qo-logo.png" alt="Qirim.Online" onerror="this.style.display='none';">
                <span class="logo-text">Qirim.Online</span>
            </a>
            <div class="nav-links">
                <a href="/top50" class="nav-link">Топ-50</a>
                <a href="/new" class="nav-link">Новинки</a>
                <a href="/karaoke" class="nav-link">Караоке</a>
                <a href="/clips" class="nav-link">Клипы</a>
            </div>
        </div>
    </nav>

    <div class="container">
        <nav class="breadcrumb">
            <a href="/">Главная</a> ›
            <a href="/app/#/artist">Артисты</a> ›
            {{.Name}}
        </nav>

        <header class="artist-header">
            <img class="avatar" src="{{.ImageURL}}" alt="{{.Name}} — фото исполнителя" loading="lazy" onerror="this.onerror=null; this.src='/artist-placeholder.webp';">
            <div class="artist-info">
                <h1>{{.Name}}</h1>
                <p class="meta">{{.AlbumCount}} альбом(ов) • {{.SongCount}} песен в топе</p>
                {{if .BiographyText}}<div class="bio">{{.Biography}}</div>{{end}}
                <a href="{{.AppURL}}" class="listen-btn">▶ Слушать на Qirim.Online</a>
            </div>
        </header>

        {{if .TopSongs}}
        <section>
            <h2>Популярные песни</h2>
            <ol class="songs-list">
                {{range $i, $s := .TopSongs}}
                <li>
                    <span class="idx">{{add1 $i}}</span>
                    <a href="{{$s.URL}}">{{$s.Title}}</a>
                    <span class="song-album">{{$s.Album}}</span>
                    <span class="song-dur">{{$s.Duration}}</span>
                </li>
                {{end}}
            </ol>
        </section>
        {{end}}

        {{if .Albums}}
        <section>
            <h2>Альбомы</h2>
            <div class="albums-grid">
                {{range .Albums}}
                <a class="album-card" href="{{.URL}}">
                    <img src="{{.CoverURL}}" alt="{{.Name}}" loading="lazy" onerror="this.onerror=null; this.src='/album-placeholder.webp';">
                    <div class="album-name">{{.Name}}</div>
                    {{if .Year}}<div class="album-year">{{.Year}}</div>{{end}}
                </a>
                {{end}}
            </div>
        </section>
        {{end}}

        <footer class="footer">
            <p>© {{.CurrentYear}} <a href="https://qirim.online">Qirim.Online</a> — Крупнейший архив крымскотатарской музыки</p>
        </footer>
    </div>
</body>
</html>
`))

