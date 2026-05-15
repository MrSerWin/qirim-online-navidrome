package public

import (
	"fmt"
	"html/template"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/navidrome/navidrome/model"
	"github.com/navidrome/navidrome/server"
)

type PlaylistRouter struct {
	http.Handler
	ds model.DataStore
}

func NewPlaylistRouter(ds model.DataStore) *PlaylistRouter {
	pr := &PlaylistRouter{ds: ds}
	pr.Handler = pr.routes()
	return pr
}

func (pr *PlaylistRouter) routes() http.Handler {
	r := chi.NewRouter()
	r.Use(server.URLParamsMiddleware)
	r.Get("/{id}", pr.handlePlaylistPage)
	r.Head("/{id}", pr.handlePlaylistPage)
	return r
}

type playlistTrackItem struct {
	ID          string
	Title       string
	Artist      string
	Album       string
	Duration    string
	DurationISO string
	URL         string
	ArtistURL   string
}

type PlaylistPageData struct {
	ID            string
	Name          string
	Description   string
	OwnerName     string
	SongCount     int
	TotalDuration string
	Tracks        []playlistTrackItem
	CanonicalURL  string
	AppURL        string
	CoverURL      string
	SiteName      string
	MetaDesc      string
	CurrentYear   int
}

func (pr *PlaylistRouter) handlePlaylistPage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Playlist ID is required", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	// includeMissing=false → don't list dead tracks; refreshSmartPlaylist=true → smart lists stay current
	pl, err := pr.ds.Playlist(ctx).GetWithTracks(id, true, false)
	if err != nil {
		http.Error(w, "Playlist not found", http.StatusNotFound)
		return
	}
	// Only public playlists are SEO-indexable
	if !pl.Public {
		http.Error(w, "Playlist not found", http.StatusNotFound)
		return
	}

	items := make([]playlistTrackItem, 0, len(pl.Tracks))
	for _, t := range pl.Tracks {
		items = append(items, playlistTrackItem{
			ID:          t.ID,
			Title:       cleanText(t.MediaFile.Title),
			Artist:      cleanText(t.MediaFile.Artist),
			Album:       cleanText(t.MediaFile.Album),
			Duration:    formatDuration(t.MediaFile.Duration),
			DurationISO: formatISODuration(t.MediaFile.Duration),
			URL:         "/song/" + t.MediaFile.ID,
			ArtistURL:   "/artist/" + t.MediaFile.ArtistID,
		})
	}

	name := cleanText(pl.Name)
	descText := cleanText(pl.Comment)
	if descText == "" {
		descText = fmt.Sprintf("Плейлист «%s» — %d песен. Слушайте крымскотатарскую музыку на Qirim.Online.", name, len(items))
	}
	metaDesc := descText
	if len(metaDesc) > 300 {
		metaDesc = metaDesc[:297] + "..."
	}

	data := PlaylistPageData{
		ID:            pl.ID,
		Name:          name,
		Description:   descText,
		OwnerName:     cleanText(pl.OwnerName),
		SongCount:     len(items),
		TotalDuration: formatDuration(pl.Duration),
		Tracks:        items,
		CanonicalURL:  "/playlist/" + pl.ID,
		AppURL:        "/app/#/playlist/" + pl.ID + "/show",
		CoverURL:      "/share/img/pl-" + pl.ID,
		SiteName:      "Qirim.Online",
		MetaDesc:      metaDesc,
		CurrentYear:   time.Now().Year(),
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=1800")
	if err := playlistPageTemplate.Execute(w, data); err != nil {
		http.Error(w, "Error rendering page", http.StatusInternalServerError)
	}
}

var playlistPageTemplate = template.Must(template.New("playlist").Funcs(template.FuncMap{
	"add1": func(i int) int { return i + 1 },
}).Parse(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{.Name}} — плейлист | {{.SiteName}}</title>
    <meta name="description" content="{{.MetaDesc}}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://qirim.online{{.CanonicalURL}}">
    <link rel="alternate" hreflang="ru" href="https://qirim.online{{.CanonicalURL}}">
    <link rel="alternate" hreflang="crh" href="https://qirim.online{{.CanonicalURL}}">
    <link rel="alternate" hreflang="x-default" href="https://qirim.online{{.CanonicalURL}}">
    <link rel="icon" href="/app/favicon.ico" type="image/x-icon">

    <meta property="og:type" content="music.playlist">
    <meta property="og:title" content="{{.Name}}">
    <meta property="og:description" content="{{.MetaDesc}}">
    <meta property="og:image" content="https://qirim.online{{.CoverURL}}">
    <meta property="og:url" content="https://qirim.online{{.CanonicalURL}}">
    <meta property="og:site_name" content="{{.SiteName}}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{.Name}}">
    <meta name="twitter:description" content="{{.MetaDesc}}">
    <meta name="twitter:image" content="https://qirim.online{{.CoverURL}}">

    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "MusicPlaylist",
        "name": {{.Name | printf "%q"}},
        "url": "https://qirim.online{{.CanonicalURL}}",
        "image": "https://qirim.online{{.CoverURL}}",
        "description": {{.MetaDesc | printf "%q"}},
        "numTracks": {{.SongCount}}{{if .Tracks}},
        "track": [{{range $i, $t := .Tracks}}{{if $i}},{{end}}{
            "@type": "MusicRecording",
            "position": {{add1 $i}},
            "name": {{$t.Title | printf "%q"}},
            "duration": "{{$t.DurationISO}}",
            "url": "https://qirim.online{{$t.URL}}",
            "byArtist": {
                "@type": "MusicGroup",
                "name": {{$t.Artist | printf "%q"}},
                "url": "https://qirim.online{{$t.ArtistURL}}"
            }
        }{{end}}]{{end}}
    }
    </script>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Главная", "item": "https://qirim.online/"},
            {"@type": "ListItem", "position": 2, "name": {{.Name | printf "%q"}}, "item": "https://qirim.online{{.CanonicalURL}}"}
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
        .pl-header { display: flex; gap: 32px; margin-bottom: 32px; background: #2b2b2b; border-radius: 8px; padding: 24px; }
        .cover { width: 240px; height: 240px; border-radius: 8px; object-fit: cover; box-shadow: 0 8px 24px rgba(0,0,0,0.4); flex-shrink: 0; background: #4C566A; }
        .pl-info { display: flex; flex-direction: column; justify-content: center; flex: 1; }
        .pl-info h1 { font-size: 2.25rem; font-weight: 700; color: #E5E9F0; margin-bottom: 8px; line-height: 1.2; }
        .meta { color: #b3b3b3; font-size: 0.875rem; margin-bottom: 16px; }
        .listen-btn { display: inline-flex; align-items: center; gap: 8px; background: #5E81AC; color: #fff; padding: 12px 24px; border-radius: 500px; text-decoration: none; font-weight: 600; font-size: 0.875rem; width: fit-content; }
        .listen-btn:hover { background: #81A1C1; }
        section { background: #2b2b2b; border-radius: 8px; padding: 24px; margin-bottom: 24px; }
        section h2 { font-size: 1.125rem; font-weight: 700; color: #E5E9F0; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #4C566A; text-transform: uppercase; letter-spacing: 1px; }
        .desc { color: #D8DEE9; line-height: 1.7; margin-bottom: 16px; }
        .tracks-list { list-style: none; }
        .tracks-list li { padding: 10px 12px; border-bottom: 1px solid #3b3b3b; display: flex; align-items: center; gap: 12px; }
        .tracks-list li:last-child { border-bottom: none; }
        .tracks-list .idx { color: #b3b3b3; font-weight: 600; min-width: 28px; }
        .tracks-list .meta-cell { flex: 1; min-width: 0; }
        .tracks-list .meta-cell a { color: #E5E9F0; text-decoration: none; font-weight: 500; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tracks-list .meta-cell a:hover { color: #81A1C1; text-decoration: underline; }
        .tracks-list .meta-cell .sub { color: #b3b3b3; font-size: 0.875rem; }
        .tracks-list .sub a { color: #b3b3b3; font-size: 0.875rem; display: inline; }
        .tracks-list .dur { color: #b3b3b3; font-size: 0.875rem; min-width: 50px; text-align: right; }
        .footer { margin-top: 48px; padding: 24px; text-align: center; color: #b3b3b3; font-size: 0.875rem; border-top: 1px solid #4C566A; }
        .footer a { color: #81A1C1; text-decoration: none; }
        @media (max-width: 640px) {
            .pl-header { flex-direction: column; align-items: center; text-align: center; }
            .cover { width: 200px; height: 200px; }
            .pl-info h1 { font-size: 1.75rem; }
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
            {{.Name}}
        </nav>

        <header class="pl-header">
            <img class="cover" src="{{.CoverURL}}" alt="{{.Name}} — обложка плейлиста" loading="lazy" onerror="this.onerror=null; this.src='/album-placeholder.webp';">
            <div class="pl-info">
                <h1>{{.Name}}</h1>
                <p class="meta">{{.SongCount}} песен • {{.TotalDuration}}{{if .OwnerName}} • {{.OwnerName}}{{end}}</p>
                <a href="{{.AppURL}}" class="listen-btn">▶ Слушать плейлист</a>
            </div>
        </header>

        {{if .Description}}
        <section>
            <h2>Описание</h2>
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
                    <div class="meta-cell">
                        <a href="{{$t.URL}}">{{$t.Title}}</a>
                        <div class="sub"><a href="{{$t.ArtistURL}}">{{$t.Artist}}</a> • {{$t.Album}}</div>
                    </div>
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
