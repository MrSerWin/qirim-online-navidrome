package public

import (
	"html/template"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/navidrome/navidrome/model"
	"github.com/navidrome/navidrome/server"
)

// SongRouter handles SEO-friendly song pages
type SongRouter struct {
	http.Handler
	ds model.DataStore
}

// NewSongRouter creates a new router for SEO song pages
func NewSongRouter(ds model.DataStore) *SongRouter {
	sr := &SongRouter{ds: ds}
	sr.Handler = sr.routes()
	return sr
}

func (sr *SongRouter) routes() http.Handler {
	r := chi.NewRouter()
	r.Use(server.URLParamsMiddleware)
	r.Get("/{id}", sr.handleSongPage)
	return r
}

// handleSongPage serves a static HTML page for a song with lyrics
func (sr *SongRouter) handleSongPage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Song ID is required", http.StatusBadRequest)
		return
	}

	// Try to find by ID first, then by alias
	mf, err := sr.ds.MediaFile(r.Context()).Get(id)
	if err != nil {
		// Try alias
		mf, err = sr.ds.MediaFile(r.Context()).FindByAlias(id)
		if err != nil {
			http.Error(w, "Song not found", http.StatusNotFound)
			return
		}
	}

	// Get lyrics from crowdsource (approved) first, fallback to media_file
	var lyricsText string
	crowdsourceLyrics, err := sr.ds.LyricsCrowdsource(r.Context()).GetApproved(mf.ID)
	if err == nil && crowdsourceLyrics != nil && crowdsourceLyrics.Content != "" {
		// Clean up lyrics: remove comment lines starting with #
		lines := strings.Split(crowdsourceLyrics.Content, "\n")
		var cleanLines []string
		for _, line := range lines {
			trimmed := strings.TrimSpace(line)
			if !strings.HasPrefix(trimmed, "#") {
				cleanLines = append(cleanLines, line)
			}
		}
		lyricsText = strings.TrimSpace(strings.Join(cleanLines, "\n"))
	} else {
		// Fallback to media_file lyrics
		lyricsText = extractLyricsText(mf)
	}

	// Build page data
	data := SongPageData{
		Title:        mf.Title,
		Artist:       mf.Artist,
		ArtistID:     mf.ArtistID,
		Album:        mf.Album,
		AlbumID:      mf.AlbumID,
		Year:         mf.Year,
		Duration:     formatDuration(mf.Duration),
		Lyrics:       lyricsText,
		LyricsHTML:   template.HTML(formatLyricsHTML(lyricsText)),
		ImageURL:     "/share/img/" + mf.AlbumID,
		SongURL:      "/app/#/song/" + mf.ID + "/show",
		LyricsURL:    "/app/#/song/" + mf.ID + "/lyrics",
		CanonicalURL: "/song/" + mf.ID,
		SiteName:     "Qirim.Online",
		Description:  mf.Title + " — " + mf.Artist + ". Текст песни и музыка на Qirim.Online",
		CurrentYear:  time.Now().Year(),
	}

	// Render the template
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=86400")

	if err := songPageTemplate.Execute(w, data); err != nil {
		http.Error(w, "Error rendering page", http.StatusInternalServerError)
	}
}
