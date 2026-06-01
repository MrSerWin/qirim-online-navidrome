package public

import (
	"fmt"
	"html/template"
	"net/http"
	"time"

	"github.com/Masterminds/squirrel"
	"github.com/go-chi/chi/v5"
	"github.com/navidrome/navidrome/model"
	"github.com/navidrome/navidrome/server"
)

type AlbumRouter struct {
	http.Handler
	ds model.DataStore
}

func NewAlbumRouter(ds model.DataStore) *AlbumRouter {
	ar := &AlbumRouter{ds: ds}
	ar.Handler = ar.routes()
	return ar
}

func (ar *AlbumRouter) routes() http.Handler {
	r := chi.NewRouter()
	r.Use(server.URLParamsMiddleware)
	r.Get("/{id}", ar.handleAlbumPage)
	r.Head("/{id}", ar.handleAlbumPage)
	return r
}

type albumTrackItem struct {
	ID          string
	Title       string
	Track       int
	Duration    string
	DurationISO string
	URL         string
}

type AlbumPageData struct {
	ID            string
	Name          string
	Artist        string
	ArtistID      string
	Year          int
	Genre         string
	Description   template.HTML
	DescText      string
	CoverURL      string
	CanonicalURL  string
	AppURL        string
	ArtistURL     string
	SongCount     int
	TotalDuration string
	Tracks        []albumTrackItem
	SiteName      string
	MetaDesc      string
	CurrentYear   int
	SelfTitled    bool // true when album.Name == album.AlbumArtist; suppresses duplicate signals
}

func (ar *AlbumRouter) handleAlbumPage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Album ID is required", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	album, err := ar.ds.Album(ctx).Get(id)
	if err != nil {
		album, err = ar.ds.Album(ctx).FindByAlias(id)
		if err != nil {
			http.Error(w, "Album not found", http.StatusNotFound)
			return
		}
	}

	tracks, _ := ar.ds.MediaFile(ctx).GetAll(model.QueryOptions{
		Filters: squirrel.Eq{"album_id": album.ID},
		Sort:    "disc_number, track_number",
		Order:   "asc",
		Max:     500,
	})

	albumName := cleanText(album.Name)
	albumArtist := cleanText(album.AlbumArtist)
	selfTitled := equalFold(albumName, albumArtist)

	trackItems := make([]albumTrackItem, 0, len(tracks))
	for _, t := range tracks {
		trackItems = append(trackItems, albumTrackItem{
			ID:          t.ID,
			Title:       stripArtistPrefix(cleanText(t.Title), albumArtist),
			Track:       t.TrackNumber,
			Duration:    formatDuration(t.Duration),
			DurationISO: formatISODuration(t.Duration),
			URL:         "/song/" + t.ID,
		})
	}

	descText := cleanText(stripHTML(album.Description))
	if descText == "" {
		if selfTitled {
			// Avoid the «Album X — X» phrasing that produced duplicate signals.
			descText = fmt.Sprintf("Все песни %s — %d треков в архиве крымскотатарской музыки Qirim.Online.", albumArtist, len(trackItems))
		} else {
			descText = fmt.Sprintf("Альбом «%s» — %s. %d песен. Слушайте онлайн на Qirim.Online.", albumName, albumArtist, len(trackItems))
		}
	}
	metaDesc := descText
	if len(metaDesc) > 300 {
		metaDesc = metaDesc[:297] + "..."
	}

	data := AlbumPageData{
		ID:            album.ID,
		Name:          albumName,
		Artist:        albumArtist,
		ArtistID:      album.AlbumArtistID,
		Year:          album.MaxYear,
		Genre:         cleanText(album.Genre),
		DescText:      descText,
		Description:   template.HTML(formatLyricsHTML(descText)),
		CoverURL:      "/share/img/" + album.ID,
		CanonicalURL:  "/album/" + album.ID,
		AppURL:        "/app/#/album/" + album.ID + "/show",
		ArtistURL:     "/artist/" + album.AlbumArtistID,
		SongCount:     len(trackItems),
		TotalDuration: formatDuration(album.Duration),
		Tracks:        trackItems,
		SiteName:      "Qirim.Online",
		MetaDesc:      metaDesc,
		CurrentYear:   time.Now().Year(),
		SelfTitled:    selfTitled,
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	if err := albumPageTemplate.Execute(w, data); err != nil {
		http.Error(w, "Error rendering page", http.StatusInternalServerError)
	}
}

var albumPageTemplate = template.Must(template.New("album").Funcs(template.FuncMap{
	"add1": func(i int) int { return i + 1 },
}).Parse(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{if .SelfTitled}}{{.Artist}} — все песни | {{.SiteName}}{{else}}{{.Name}} — {{.Artist}} | Альбом | {{.SiteName}}{{end}}</title>
    <meta name="description" content="{{.MetaDesc}}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://qirim.online{{.CanonicalURL}}">
    <link rel="alternate" hreflang="ru" href="https://qirim.online{{.CanonicalURL}}">
    <link rel="alternate" hreflang="crh" href="https://qirim.online{{.CanonicalURL}}">
    <link rel="alternate" hreflang="x-default" href="https://qirim.online{{.CanonicalURL}}">
    <link rel="icon" href="/app/favicon.ico" type="image/x-icon">

    <meta property="og:type" content="music.album">
    <meta property="og:title" content="{{if .SelfTitled}}{{.Artist}} — все песни{{else}}{{.Name}} — {{.Artist}}{{end}}">
    <meta property="og:description" content="{{.MetaDesc}}">
    <meta property="og:image" content="https://qirim.online{{.CoverURL}}">
    <meta property="og:url" content="https://qirim.online{{.CanonicalURL}}">
    <meta property="og:site_name" content="{{.SiteName}}">
    <meta property="music:musician" content="{{.Artist}}">
    {{if .Year}}<meta property="music:release_date" content="{{.Year}}">{{end}}

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{if .SelfTitled}}{{.Artist}} — все песни{{else}}{{.Name}} — {{.Artist}}{{end}}">
    <meta name="twitter:description" content="{{.MetaDesc}}">
    <meta name="twitter:image" content="https://qirim.online{{.CoverURL}}">

    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "MusicAlbum",
        "name": {{.Name | printf "%q"}},
        "url": "https://qirim.online{{.CanonicalURL}}",
        "image": "https://qirim.online{{.CoverURL}}",
        "byArtist": {
            "@type": "MusicGroup",
            "name": {{.Artist | printf "%q"}},
            "url": "https://qirim.online{{.ArtistURL}}"
        },
        {{if .Year}}"datePublished": "{{.Year}}",{{end}}
        {{if .Genre}}"genre": {{.Genre | printf "%q"}},{{end}}
        "numTracks": {{.SongCount}},
        "description": {{.MetaDesc | printf "%q"}}{{if .Tracks}},
        "track": [{{range $i, $t := .Tracks}}{{if $i}},{{end}}{
            "@type": "MusicRecording",
            "position": {{add1 $i}},
            "name": {{$t.Title | printf "%q"}},
            "duration": "{{$t.DurationISO}}",
            "url": "https://qirim.online{{$t.URL}}"
        }{{end}}]{{end}}
    }
    </script>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Главная", "item": "https://qirim.online/"},
            {"@type": "ListItem", "position": 2, "name": {{.Artist | printf "%q"}}, "item": "https://qirim.online{{.ArtistURL}}"},
            {"@type": "ListItem", "position": 3, "name": {{.Name | printf "%q"}}, "item": "https://qirim.online{{.CanonicalURL}}"}
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
        .container { max-width: 1000px; margin: 0 auto; padding: 32px 20px; }
        .breadcrumb { font-size: 0.875rem; color: #b3b3b3; margin-bottom: 24px; }
        .breadcrumb a { color: #81A1C1; text-decoration: none; }
        .breadcrumb a:hover { text-decoration: underline; }
        .album-header { display: flex; gap: 32px; margin-bottom: 32px; background: #2b2b2b; border-radius: 8px; padding: 24px; }
        .cover { width: 240px; height: 240px; border-radius: 8px; object-fit: cover; box-shadow: 0 8px 24px rgba(0,0,0,0.4); flex-shrink: 0; background: #4C566A; }
        .album-info { display: flex; flex-direction: column; justify-content: center; flex: 1; }
        .album-info h1 { font-size: 2.25rem; font-weight: 700; color: #E5E9F0; margin-bottom: 8px; line-height: 1.2; }
        .album-info .artist-link { font-size: 1.25rem; color: #81A1C1; margin-bottom: 8px; font-weight: 600; text-decoration: none; }
        .album-info .artist-link:hover { text-decoration: underline; }
        .meta { color: #b3b3b3; font-size: 0.875rem; margin-bottom: 16px; }
        .listen-btn { display: inline-flex; align-items: center; gap: 8px; background: #5E81AC; color: #fff; padding: 12px 24px; border-radius: 500px; text-decoration: none; font-weight: 600; font-size: 0.875rem; width: fit-content; }
        .listen-btn:hover { background: #81A1C1; }
        section { background: #2b2b2b; border-radius: 8px; padding: 24px; margin-bottom: 24px; }
        section h2 { font-size: 1.125rem; font-weight: 700; color: #E5E9F0; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #4C566A; text-transform: uppercase; letter-spacing: 1px; }
        .desc { color: #D8DEE9; line-height: 1.7; }
        .tracks-list { list-style: none; }
        .tracks-list li { padding: 10px 12px; border-bottom: 1px solid #3b3b3b; display: flex; align-items: center; gap: 12px; }
        .tracks-list li:last-child { border-bottom: none; }
        .tracks-list .idx { color: #b3b3b3; font-weight: 600; min-width: 28px; }
        .tracks-list a { color: #E5E9F0; text-decoration: none; flex: 1; font-weight: 500; }
        .tracks-list a:hover { color: #81A1C1; text-decoration: underline; }
        .tracks-list .dur { color: #b3b3b3; font-size: 0.875rem; min-width: 50px; text-align: right; }
        .footer { margin-top: 48px; padding: 24px; text-align: center; color: #b3b3b3; font-size: 0.875rem; border-top: 1px solid #4C566A; }
        .footer a { color: #81A1C1; text-decoration: none; }
        @media (max-width: 640px) {
            .album-header { flex-direction: column; align-items: center; text-align: center; }
            .cover { width: 200px; height: 200px; }
            .album-info h1 { font-size: 1.75rem; }
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
            <a href="{{.ArtistURL}}">{{.Artist}}</a> ›
            {{.Name}}
        </nav>

        <header class="album-header">
            <img class="cover" src="{{.CoverURL}}" alt="{{.Name}} — обложка альбома {{.Artist}}" loading="lazy" onerror="this.onerror=null; this.src='/album-placeholder.webp';">
            <div class="album-info">
                <h1>{{.Name}}</h1>
                <a class="artist-link" href="{{.ArtistURL}}">{{.Artist}}</a>
                <p class="meta">{{if .Year}}{{.Year}} • {{end}}{{.SongCount}} песен • {{.TotalDuration}}{{if .Genre}} • {{.Genre}}{{end}}</p>
                <a href="{{.AppURL}}" class="listen-btn">▶ Слушать альбом</a>
            </div>
        </header>

        {{if .DescText}}
        <section>
            <h2>Об альбоме</h2>
            <div class="desc">{{.Description}}</div>
        </section>
        {{end}}

        {{if .Tracks}}
        <section>
            <h2>Треклист</h2>
            <ol class="tracks-list">
                {{range $i, $t := .Tracks}}
                <li>
                    <span class="idx">{{add1 $i}}</span>
                    <a href="{{$t.URL}}">{{$t.Title}}</a>
                    <span class="dur">{{$t.Duration}}</span>
                </li>
                {{end}}
            </ol>
        </section>
        {{end}}

        <footer class="footer">
            <p>© {{.CurrentYear}} <a href="https://qirim.online">Qirim.Online</a> — Крупнейший архив крымскотатарской музыки</p>
        </footer>
    </div>
</body>
</html>
`))
