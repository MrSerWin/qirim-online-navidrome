package public

// SEO landing pages (server-rendered) for crawlers and the public homepage.

import (
	"fmt"
	"html/template"
	"net/http"
	"time"

	"github.com/Masterminds/squirrel"
	"github.com/go-chi/chi/v5"
	"github.com/navidrome/navidrome/consts"
	"github.com/navidrome/navidrome/model"
)

type LandingRouter struct {
	http.Handler
	ds model.DataStore
}

func NewLandingRouter(ds model.DataStore) *LandingRouter {
	lr := &LandingRouter{ds: ds}
	lr.Handler = lr.routes()
	return lr
}

func (lr *LandingRouter) routes() http.Handler {
	r := chi.NewRouter()
	for _, route := range []struct {
		path    string
		handler http.HandlerFunc
	}{
		{"/", lr.handleHome},
		{"/top50", lr.handleTop50},
		{"/new", lr.handleNew},
		{"/karaoke", lr.handleKaraoke},
		{"/clips", lr.handleClips},
	} {
		r.Get(route.path, route.handler)
		r.Head(route.path, route.handler)
	}
	return r
}

// validAlbumFilter returns a filter that excludes missing albums and the
// untagged "[Unknown Album]" / "[Unknown Artist]" placeholders Navidrome assigns
// to files without metadata, so they never appear on the public SEO pages.
func validAlbumFilter() squirrel.Sqlizer {
	return squirrel.And{
		squirrel.Eq{"missing": false},
		squirrel.NotEq{"album.name": consts.UnknownAlbum},
		squirrel.NotEq{"album.album_artist": consts.UnknownArtist},
	}
}

type landingArtistItem struct {
	ID   string
	Name string
	URL  string
	Img  string
}

type landingAlbumItem struct {
	ID       string
	Name     string
	Artist   string
	Year     int
	URL      string
	ArtistURL string
	Cover    string
}

type landingSongItem struct {
	ID       string
	Title    string
	Artist   string
	Album    string
	Duration string
	URL      string
	Cover    string
}

type landingClipItem struct {
	ID         string
	Title      string
	Artist     string
	Thumbnail  string
	YoutubeURL string
	URL        string
}

type LandingPageData struct {
	PageKind     string // "home" | "top50" | "new" | "karaoke" | "clips"
	Title        string
	H1           string
	Intro        string
	CanonicalURL string
	MetaDesc     string
	SiteName     string
	CurrentYear  int

	// Sections (only some populated per page)
	TopArtists []landingArtistItem
	NewAlbums  []landingAlbumItem
	TopSongs   []landingSongItem
	Karaoke    []landingSongItem
	Clips      []landingClipItem
}

func (lr *LandingRouter) handleHome(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Top artists by play count
	artists, _ := lr.ds.Artist(ctx).GetAll(model.QueryOptions{
		Sort:    "global_play_count",
		Order:   "desc",
		Max:     24,
		Filters: squirrel.Eq{"missing": false},
	})
	topArtists := make([]landingArtistItem, 0, len(artists))
	for _, a := range artists {
		topArtists = append(topArtists, landingArtistItem{
			ID:   a.ID,
			Name: cleanText(a.Name),
			URL:  "/artist/" + a.ID,
			Img:  ImageURL(r, a.CoverArtID(), 300),
		})
	}

	// Recently added albums (exclude untagged/unknown placeholders)
	albums, _ := lr.ds.Album(ctx).GetAll(model.QueryOptions{
		Sort:    "recently_added",
		Order:   "desc",
		Max:     24,
		Filters: validAlbumFilter(),
	})
	newAlbums := make([]landingAlbumItem, 0, len(albums))
	for _, a := range albums {
		newAlbums = append(newAlbums, landingAlbumItem{
			ID: a.ID, Name: cleanText(a.Name), Artist: cleanText(a.AlbumArtist), Year: a.MaxYear,
			URL: "/album/" + a.ID, ArtistURL: "/artist/" + a.AlbumArtistID,
			Cover: ImageURL(r, a.CoverArtID(), 300),
		})
	}

	data := LandingPageData{
		PageKind:     "home",
		Title:        "Qirim.Online — Крупнейший архив крымскотатарской музыки | Слушать онлайн",
		H1:           "Qirim.Online — крымскотатарская музыка онлайн",
		Intro:        "Крупнейший онлайн-архив крымскотатарской музыки. Слушайте народные песни и современные хиты крымскотатарских исполнителей. Топ-50, новинки, караоке и клипы — всё в одном месте.",
		CanonicalURL: "/",
		MetaDesc:     "Qirim.Online — слушайте крымскотатарскую музыку онлайн бесплатно. Народные песни, современные хиты, караоке, клипы. Артисты, альбомы, новинки.",
		SiteName:     "Qirim.Online",
		CurrentYear:  time.Now().Year(),
		TopArtists:   topArtists,
		NewAlbums:    newAlbums,
	}
	lr.render(w, data)
}

func (lr *LandingRouter) handleTop50(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	songs, _ := lr.ds.MediaFile(ctx).GetAll(model.QueryOptions{
		Sort:    "global_play_count",
		Order:   "desc",
		Max:     50,
		Filters: squirrel.Eq{"missing": false},
	})
	items := make([]landingSongItem, 0, len(songs))
	for _, s := range songs {
		items = append(items, landingSongItem{
			ID: s.ID, Title: cleanText(s.Title), Artist: cleanText(s.Artist), Album: cleanText(s.Album),
			Duration: formatDuration(s.Duration), URL: "/song/" + s.ID,
			Cover: ImageURL(r, s.CoverArtID(), 100),
		})
	}
	data := LandingPageData{
		PageKind:     "top50",
		Title:        "Топ-50 крымскотатарских песен | Qirim.Online",
		H1:           "Топ-50 песен",
		Intro:        "Самые популярные крымскотатарские песни на Qirim.Online — обновляется в реальном времени по числу прослушиваний.",
		CanonicalURL: "/top50",
		MetaDesc:     "Топ-50 крымскотатарских песен — самые популярные треки на Qirim.Online. Слушайте онлайн бесплатно.",
		SiteName:     "Qirim.Online",
		CurrentYear:  time.Now().Year(),
		TopSongs:     items,
	}
	lr.render(w, data)
}

func (lr *LandingRouter) handleNew(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	albums, _ := lr.ds.Album(ctx).GetAll(model.QueryOptions{
		Sort:    "recently_added",
		Order:   "desc",
		Max:     60,
		Filters: validAlbumFilter(),
	})
	items := make([]landingAlbumItem, 0, len(albums))
	for _, a := range albums {
		items = append(items, landingAlbumItem{
			ID: a.ID, Name: cleanText(a.Name), Artist: cleanText(a.AlbumArtist), Year: a.MaxYear,
			URL: "/album/" + a.ID, ArtistURL: "/artist/" + a.AlbumArtistID,
			Cover: ImageURL(r, a.CoverArtID(), 300),
		})
	}
	data := LandingPageData{
		PageKind:     "new",
		Title:        "Новинки крымскотатарской музыки | Qirim.Online",
		H1:           "Новинки",
		Intro:        "Свежие альбомы и релизы крымскотатарских исполнителей — последние добавления в архив Qirim.Online.",
		CanonicalURL: "/new",
		MetaDesc:     "Новинки крымскотатарской музыки на Qirim.Online — свежие альбомы и релизы. Слушайте бесплатно онлайн.",
		SiteName:     "Qirim.Online",
		CurrentYear:  time.Now().Year(),
		NewAlbums:    items,
	}
	lr.render(w, data)
}

func (lr *LandingRouter) handleKaraoke(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	// Use approved crowdsource lyrics as the karaoke list (songs that definitely have synced lyrics)
	approved, _ := lr.ds.LyricsCrowdsource(ctx).GetAllApproved(200, 0)
	items := make([]landingSongItem, 0, len(approved))
	for _, l := range approved {
		mf, err := lr.ds.MediaFile(ctx).Get(l.MediaFileID)
		if err != nil {
			continue
		}
		items = append(items, landingSongItem{
			ID: mf.ID, Title: cleanText(mf.Title), Artist: cleanText(mf.Artist), Album: cleanText(mf.Album),
			Duration: formatDuration(mf.Duration), URL: "/song/" + mf.ID,
			Cover: ImageURL(r, mf.CoverArtID(), 100),
		})
		if len(items) >= 100 {
			break
		}
	}
	data := LandingPageData{
		PageKind:     "karaoke",
		Title:        "Караоке — крымскотатарские песни с текстом | Qirim.Online",
		H1:           "Караоке",
		Intro:        fmt.Sprintf("Крымскотатарские песни с синхронизированными текстами для караоке — %d песен. Пойте вместе со своими любимыми исполнителями.", len(items)),
		CanonicalURL: "/karaoke",
		MetaDesc:     "Караоке крымскотатарских песен — пойте онлайн вместе с любимыми исполнителями. Синхронизированные тексты на Qirim.Online.",
		SiteName:     "Qirim.Online",
		CurrentYear:  time.Now().Year(),
		Karaoke:      items,
	}
	lr.render(w, data)
}

func (lr *LandingRouter) handleClips(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	clips, _ := lr.ds.VideoClip(ctx).GetAll(model.QueryOptions{
		Sort:  "published_at",
		Order: "desc",
		Max:   60,
	})
	items := make([]landingClipItem, 0, len(clips))
	for _, c := range clips {
		yt := c.ThumbnailURL
		if yt == "" && c.YoutubeID != "" {
			yt = "https://i.ytimg.com/vi/" + c.YoutubeID + "/hqdefault.jpg"
		}
		items = append(items, landingClipItem{
			ID: c.ID, Title: cleanText(c.Title), Artist: cleanText(c.Artist),
			Thumbnail:  yt,
			YoutubeURL: "https://www.youtube.com/watch?v=" + c.YoutubeID,
			URL:        "/app/#/video/" + c.ID,
		})
	}
	data := LandingPageData{
		PageKind:     "clips",
		Title:        "Клипы крымскотатарских исполнителей | Qirim.Online",
		H1:           "Музыкальные клипы",
		Intro:        "Видеоклипы крымскотатарских исполнителей — смотрите бесплатно онлайн на Qirim.Online.",
		CanonicalURL: "/clips",
		MetaDesc:     "Музыкальные клипы крымскотатарских исполнителей — смотрите видео онлайн на Qirim.Online.",
		SiteName:     "Qirim.Online",
		CurrentYear:  time.Now().Year(),
		Clips:        items,
	}
	lr.render(w, data)
}

func (lr *LandingRouter) render(w http.ResponseWriter, data LandingPageData) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=1800")
	if err := landingPageTemplate.Execute(w, data); err != nil {
		http.Error(w, "Error rendering page", http.StatusInternalServerError)
	}
}

var landingPageTemplate = template.Must(template.New("landing").Funcs(template.FuncMap{
	"add1": func(i int) int { return i + 1 },
}).Parse(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{.Title}}</title>
    <meta name="description" content="{{.MetaDesc}}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://qirim.online{{.CanonicalURL}}">
    <link rel="alternate" hreflang="ru" href="https://qirim.online{{.CanonicalURL}}">
    <link rel="alternate" hreflang="crh" href="https://qirim.online{{.CanonicalURL}}">
    <link rel="alternate" hreflang="x-default" href="https://qirim.online{{.CanonicalURL}}">
    <link rel="icon" href="/app/favicon.ico" type="image/x-icon">

    <meta property="og:type" content="website">
    <meta property="og:title" content="{{.Title}}">
    <meta property="og:description" content="{{.MetaDesc}}">
    <meta property="og:url" content="https://qirim.online{{.CanonicalURL}}">
    <meta property="og:site_name" content="{{.SiteName}}">
    <meta property="og:image" content="https://qirim.online/qo-logo.png">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{.Title}}">
    <meta name="twitter:description" content="{{.MetaDesc}}">

    {{if eq .PageKind "home"}}
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Qirim.Online",
        "alternateName": ["Къырым.Онлайн", "Qırım Online"],
        "url": "https://qirim.online",
        "description": "{{.MetaDesc}}",
        "inLanguage": ["ru", "crh", "en"]
    }
    </script>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Qirim.Online",
        "alternateName": ["Къырым.Онлайн", "Qırım Online"],
        "url": "https://qirim.online",
        "logo": "https://qirim.online/android-chrome-512x512.png",
        "description": "Цифровая сокровищница крымскотатарской музыки — народные песни, классика эстрады, современные релизы.",
        "foundingDate": "2025",
        "contactPoint": {
            "@type": "ContactPoint",
            "email": "contact@qirim.online",
            "contactType": "customer support",
            "availableLanguage": ["Russian", "Crimean Tatar", "English"]
        },
        "sameAs": [
            "https://www.youtube.com/@AnaUrtcom",
            "https://t.me/ana_yurt_dev",
            "https://www.facebook.com/qirimonline",
            "https://ru.wikipedia.org/wiki/Крымскотатарская_музыка"
        ]
    }
    </script>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Qirim.Online — Архив крымскотатарской музыки",
        "url": "https://qirim.online",
        "inLanguage": ["ru", "crh", "en"],
        "about": {
            "@type": "Thing",
            "name": "Крымскотатарская музыка",
            "sameAs": "https://ru.wikipedia.org/wiki/Крымскотатарская_музыка"
        }
    }
    </script>
    {{end}}

    {{if .TopSongs}}
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "{{.H1}}",
        "url": "https://qirim.online{{.CanonicalURL}}",
        "numberOfItems": {{len .TopSongs}},
        "itemListElement": [{{range $i, $s := .TopSongs}}{{if $i}},{{end}}{
            "@type": "ListItem",
            "position": {{add1 $i}},
            "item": {
                "@type": "MusicRecording",
                "name": {{$s.Title | printf "%q"}},
                "byArtist": {{$s.Artist | printf "%q"}},
                "url": "https://qirim.online{{$s.URL}}"
            }
        }{{end}}]
    }
    </script>
    {{end}}

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet">

    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Rajdhani', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #202021; color: #D8DEE9; min-height: 100vh; line-height: 1.6; }
        .navbar { background-color: #202021; border-bottom: 1px solid #2E3440; box-shadow: rgba(0,0,0,0.4) 0px 4px 6px; padding: 0 16px; height: 64px; display: flex; align-items: center; position: sticky; top: 0; z-index: 100; }
        .navbar-content { max-width: 1200px; margin: 0 auto; width: 100%; display: flex; align-items: center; justify-content: space-between; }
        .logo { display: flex; align-items: center; gap: 12px; text-decoration: none; color: #fff; }
        .logo img { height: 40px; width: auto; }
        .logo-text { font-size: 1.25rem; font-weight: 700; color: #E5E9F0; }
        .nav-links { display: flex; gap: 8px; }
        .nav-link { color: #D8DEE9; text-decoration: none; padding: 8px 16px; border-radius: 500px; font-size: 0.875rem; font-weight: 500; }
        .nav-link:hover, .nav-link.active { background-color: #5E81AC; color: #fff; }
        .container { max-width: 1200px; margin: 0 auto; padding: 32px 20px; }
        .hero { background: linear-gradient(135deg, #4C566A 0%, #5E81AC 100%); border-radius: 12px; padding: 48px 32px; margin-bottom: 32px; text-align: center; }
        .hero h1 { font-size: 2.5rem; font-weight: 700; color: #fff; margin-bottom: 16px; }
        .hero p { font-size: 1.125rem; color: #E5E9F0; max-width: 800px; margin: 0 auto 24px; }
        .cta-btn { display: inline-block; background: #fff; color: #2E3440; padding: 12px 32px; border-radius: 500px; text-decoration: none; font-weight: 700; font-size: 1rem; }
        .cta-btn:hover { background: #ECEFF4; transform: scale(1.02); }
        section { background: #2E3440; border-radius: 8px; padding: 24px; margin-bottom: 24px; }
        section h2 { font-size: 1.25rem; font-weight: 700; color: #E5E9F0; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #4C566A; text-transform: uppercase; letter-spacing: 1px; }
        .artists-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 20px; }
        .artist-card { text-decoration: none; color: inherit; text-align: center; transition: transform 0.2s; }
        .artist-card:hover { transform: translateY(-2px); }
        .artist-card img { width: 100%; aspect-ratio: 1; border-radius: 50%; object-fit: cover; background: #4C566A; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .artist-card .name { margin-top: 10px; font-weight: 600; font-size: 0.95rem; color: #E5E9F0; }
        .albums-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px; }
        .album-card { text-decoration: none; color: inherit; transition: transform 0.2s; }
        .album-card:hover { transform: translateY(-2px); }
        .album-card img { width: 100%; aspect-ratio: 1; border-radius: 8px; object-fit: cover; background: #4C566A; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .album-card .album-name { margin-top: 8px; font-weight: 600; font-size: 0.95rem; color: #E5E9F0; }
        .album-card .album-artist { color: #b3b3b3; font-size: 0.85rem; }
        .songs-list { list-style: none; }
        .songs-list li { padding: 12px; border-bottom: 1px solid #3B4252; display: flex; align-items: center; gap: 12px; }
        .songs-list li:last-child { border-bottom: none; }
        .songs-list .idx { color: #b3b3b3; font-weight: 600; min-width: 32px; }
        .songs-list .thumb { width: 44px; height: 44px; border-radius: 4px; object-fit: cover; flex-shrink: 0; background: #4C566A; }
        .songs-list .meta { flex: 1; min-width: 0; }
        .songs-list .meta a { color: #E5E9F0; text-decoration: none; font-weight: 500; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .songs-list .meta a:hover { color: #81A1C1; text-decoration: underline; }
        .songs-list .meta .sub { color: #b3b3b3; font-size: 0.875rem; }
        .songs-list .dur { color: #b3b3b3; font-size: 0.875rem; min-width: 50px; text-align: right; }
        .clips-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .clip-card { text-decoration: none; color: inherit; transition: transform 0.2s; background: #3B4252; border-radius: 8px; overflow: hidden; }
        .clip-card:hover { transform: translateY(-2px); }
        .clip-card img { width: 100%; aspect-ratio: 16/9; object-fit: cover; background: #4C566A; }
        .clip-card .info { padding: 12px; }
        .clip-card .title { font-weight: 600; color: #E5E9F0; margin-bottom: 4px; }
        .clip-card .artist { color: #b3b3b3; font-size: 0.875rem; }
        .empty { text-align: center; color: #b3b3b3; padding: 32px; font-style: italic; }
        .footer { margin-top: 48px; padding: 24px; text-align: center; color: #b3b3b3; font-size: 0.875rem; border-top: 1px solid #4C566A; }
        .footer a { color: #81A1C1; text-decoration: none; }
        @media (max-width: 640px) {
            .hero h1 { font-size: 1.75rem; }
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
                <a href="/top50" class="nav-link{{if eq .PageKind "top50"}} active{{end}}">Топ-50</a>
                <a href="/new" class="nav-link{{if eq .PageKind "new"}} active{{end}}">Новинки</a>
                <a href="/karaoke" class="nav-link{{if eq .PageKind "karaoke"}} active{{end}}">Караоке</a>
                <a href="/clips" class="nav-link{{if eq .PageKind "clips"}} active{{end}}">Клипы</a>
            </div>
        </div>
    </nav>

    <div class="container">
        <header class="hero">
            <h1>{{.H1}}</h1>
            <p>{{.Intro}}</p>
            <a class="cta-btn" href="/app/#/random">▶ Открыть плеер</a>
        </header>

        {{if .TopArtists}}
        <section>
            <h2>Популярные исполнители</h2>
            <div class="artists-grid">
                {{range .TopArtists}}
                <a class="artist-card" href="{{.URL}}">
                    <img src="{{.Img}}" alt="{{.Name}}" loading="lazy" onerror="this.onerror=null; this.src='/artist-placeholder.webp';">
                    <div class="name">{{.Name}}</div>
                </a>
                {{end}}
            </div>
        </section>
        {{end}}

        {{if .NewAlbums}}
        <section>
            <h2>{{if eq .PageKind "new"}}Все новинки{{else}}Новые альбомы{{end}}</h2>
            <div class="albums-grid">
                {{range .NewAlbums}}
                <a class="album-card" href="{{.URL}}">
                    <img src="{{.Cover}}" alt="{{.Name}} — {{.Artist}}" loading="lazy" onerror="this.onerror=null; this.src='/album-placeholder.webp';">
                    <div class="album-name">{{.Name}}</div>
                    <div class="album-artist">{{.Artist}}{{if .Year}} • {{.Year}}{{end}}</div>
                </a>
                {{end}}
            </div>
        </section>
        {{end}}

        {{if .TopSongs}}
        <section>
            <h2>{{.H1}}</h2>
            <ol class="songs-list">
                {{range $i, $s := .TopSongs}}
                <li>
                    <span class="idx">{{add1 $i}}</span>
                    <img class="thumb" src="{{$s.Cover}}" alt="" loading="lazy" onerror="this.onerror=null; this.src='/album-placeholder.webp';">
                    <div class="meta">
                        <a href="{{$s.URL}}">{{$s.Title}}</a>
                        <div class="sub">{{$s.Artist}} • {{$s.Album}}</div>
                    </div>
                    <span class="dur">{{$s.Duration}}</span>
                </li>
                {{end}}
            </ol>
        </section>
        {{end}}

        {{if .Karaoke}}
        <section>
            <h2>Песни с текстами</h2>
            <ol class="songs-list">
                {{range $i, $s := .Karaoke}}
                <li>
                    <span class="idx">{{add1 $i}}</span>
                    <img class="thumb" src="{{$s.Cover}}" alt="" loading="lazy" onerror="this.onerror=null; this.src='/album-placeholder.webp';">
                    <div class="meta">
                        <a href="{{$s.URL}}">{{$s.Title}}</a>
                        <div class="sub">{{$s.Artist}} • {{$s.Album}}</div>
                    </div>
                    <span class="dur">{{$s.Duration}}</span>
                </li>
                {{end}}
            </ol>
        </section>
        {{end}}

        {{if .Clips}}
        <section>
            <h2>Видеоклипы</h2>
            <div class="clips-grid">
                {{range .Clips}}
                <a class="clip-card" href="{{.URL}}">
                    <img src="{{.Thumbnail}}" alt="{{.Title}} — {{.Artist}}" loading="lazy">
                    <div class="info">
                        <div class="title">{{.Title}}</div>
                        <div class="artist">{{.Artist}}</div>
                    </div>
                </a>
                {{end}}
            </div>
        </section>
        {{end}}

        {{if eq .PageKind "home"}}
        <section>
            <h2>О Qirim.Online</h2>
            <p>Qirim.Online — крупнейший онлайн-архив крымскотатарской музыки. Здесь собраны старинные народные песни, классика и современные хиты крымскотатарских исполнителей. Сервис доступен бесплатно, без рекламы.</p>
            <p style="margin-top: 12px;">Что внутри:</p>
            <ul style="margin: 12px 0 0 24px; line-height: 1.8;">
                <li><a href="/top50" style="color:#81A1C1;">Топ-50 песен</a> — самые популярные треки</li>
                <li><a href="/new" style="color:#81A1C1;">Новинки</a> — последние альбомы и релизы</li>
                <li><a href="/karaoke" style="color:#81A1C1;">Караоке</a> — песни с синхронизированным текстом</li>
                <li><a href="/clips" style="color:#81A1C1;">Клипы</a> — видеоклипы исполнителей</li>
            </ul>
        </section>
        {{end}}

        <footer class="footer">
            <p>© {{.CurrentYear}} <a href="https://qirim.online">Qirim.Online</a> — Крупнейший архив крымскотатарской музыки</p>
        </footer>
    </div>
</body>
</html>
`))
