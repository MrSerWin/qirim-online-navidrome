package server

import (
	"encoding/xml"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Masterminds/squirrel"
	"github.com/navidrome/navidrome/conf"
	"github.com/navidrome/navidrome/log"
	"github.com/navidrome/navidrome/model"
)

// Sitemap XML structures
type URLSet struct {
	XMLName xml.Name     `xml:"urlset"`
	XMLNS   string       `xml:"xmlns,attr"`
	URLs    []SitemapURL `xml:"url"`
}

type SitemapURL struct {
	Loc        string `xml:"loc"`
	LastMod    string `xml:"lastmod,omitempty"`
	ChangeFreq string `xml:"changefreq,omitempty"`
	Priority   string `xml:"priority,omitempty"`
}

type SitemapIndex struct {
	XMLName  xml.Name        `xml:"sitemapindex"`
	XMLNS    string          `xml:"xmlns,attr"`
	Sitemaps []SitemapIndexEntry `xml:"sitemap"`
}

type SitemapIndexEntry struct {
	Loc     string `xml:"loc"`
	LastMod string `xml:"lastmod,omitempty"`
}

func siteBaseURL() string {
	baseURL := conf.Server.BaseURL
	if baseURL == "" {
		baseURL = "https://qirim.online"
	}
	return strings.TrimRight(baseURL, "/")
}

func writeSitemap(w http.ResponseWriter, urls []SitemapURL) error {
	sitemap := URLSet{
		XMLNS: "http://www.sitemaps.org/schemas/sitemap/0.9",
		URLs:  urls,
	}
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.Write([]byte(xml.Header))
	enc := xml.NewEncoder(w)
	enc.Indent("", "  ")
	return enc.Encode(sitemap)
}

// sitemapIndexHandler returns the sitemap index file pointing to per-type sitemaps
func sitemapIndexHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		base := siteBaseURL()
		today := time.Now().Format("2006-01-02")
		idx := SitemapIndex{
			XMLNS: "http://www.sitemaps.org/schemas/sitemap/0.9",
			Sitemaps: []SitemapIndexEntry{
				{Loc: base + "/sitemap-static.xml", LastMod: today},
				{Loc: base + "/sitemap-artists.xml", LastMod: today},
				{Loc: base + "/sitemap-albums.xml", LastMod: today},
				{Loc: base + "/sitemap-playlists.xml", LastMod: today},
				{Loc: base + "/sitemap-songs.xml", LastMod: today},
				{Loc: base + "/sitemap-clips.xml", LastMod: today},
			},
		}
		w.Header().Set("Content-Type", "application/xml; charset=utf-8")
		w.Header().Set("Cache-Control", "public, max-age=3600")
		w.Write([]byte(xml.Header))
		enc := xml.NewEncoder(w)
		enc.Indent("", "  ")
		_ = enc.Encode(idx)
	}
}

// sitemapStaticHandler returns landing pages and other static URLs
func sitemapStaticHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		base := siteBaseURL()
		today := time.Now().Format("2006-01-02")
		urls := []SitemapURL{
			{Loc: base + "/", LastMod: today},
			{Loc: base + "/top50", LastMod: today},
			{Loc: base + "/new", LastMod: today},
			{Loc: base + "/karaoke", LastMod: today},
			{Loc: base + "/clips", LastMod: today},
			{Loc: base + "/privacy.html", LastMod: today},
		}
		_ = writeSitemap(w, urls)
	}
}

func sitemapArtistsHandler(ds model.DataStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		base := siteBaseURL()
		artists, err := ds.Artist(r.Context()).GetAll(model.QueryOptions{
			Filters: squirrel.Eq{"missing": false},
		})
		if err != nil {
			log.Error(r.Context(), "Error getting artists for sitemap", err)
			http.Error(w, "Error", http.StatusInternalServerError)
			return
		}
		urls := make([]SitemapURL, 0, len(artists))
		for _, a := range artists {
			loc := fmt.Sprintf("%s/artist/%s", base, a.ID)
			lastmod := ""
			if a.UpdatedAt != nil && !a.UpdatedAt.IsZero() {
				lastmod = a.UpdatedAt.Format("2006-01-02")
			}
			urls = append(urls, SitemapURL{Loc: loc, LastMod: lastmod})
		}
		_ = writeSitemap(w, urls)
	}
}

func sitemapAlbumsHandler(ds model.DataStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		base := siteBaseURL()
		albums, err := ds.Album(r.Context()).GetAll(model.QueryOptions{
			Filters: squirrel.Eq{"missing": false},
		})
		if err != nil {
			log.Error(r.Context(), "Error getting albums for sitemap", err)
			http.Error(w, "Error", http.StatusInternalServerError)
			return
		}
		urls := make([]SitemapURL, 0, len(albums))
		for _, a := range albums {
			loc := fmt.Sprintf("%s/album/%s", base, a.ID)
			lastmod := ""
			if !a.UpdatedAt.IsZero() {
				lastmod = a.UpdatedAt.Format("2006-01-02")
			}
			urls = append(urls, SitemapURL{Loc: loc, LastMod: lastmod})
		}
		_ = writeSitemap(w, urls)
	}
}

func sitemapPlaylistsHandler(ds model.DataStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		base := siteBaseURL()
		playlists, err := ds.Playlist(r.Context()).GetAll(model.QueryOptions{
			Filters: squirrel.Eq{"public": true},
			Max:     10000,
		})
		if err != nil {
			log.Error(r.Context(), "Error getting playlists for sitemap", err)
			http.Error(w, "Error", http.StatusInternalServerError)
			return
		}
		urls := make([]SitemapURL, 0, len(playlists))
		for _, p := range playlists {
			lastmod := ""
			if !p.UpdatedAt.IsZero() {
				lastmod = p.UpdatedAt.Format("2006-01-02")
			}
			urls = append(urls, SitemapURL{
				Loc:     fmt.Sprintf("%s/playlist/%s", base, p.ID),
				LastMod: lastmod,
			})
		}
		_ = writeSitemap(w, urls)
	}
}

func sitemapSongsHandler(ds model.DataStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		base := siteBaseURL()
		// Cap at 45k to stay safely under the 50k per-sitemap limit
		songs, err := ds.MediaFile(r.Context()).GetAll(model.QueryOptions{
			Filters: squirrel.Eq{"missing": false},
			Sort:    "global_play_count",
			Order:   "desc",
			Max:     45000,
		})
		if err != nil {
			log.Error(r.Context(), "Error getting songs for sitemap", err)
			http.Error(w, "Error", http.StatusInternalServerError)
			return
		}
		urls := make([]SitemapURL, 0, len(songs))
		for _, s := range songs {
			loc := fmt.Sprintf("%s/song/%s", base, s.ID)
			lastmod := ""
			if !s.UpdatedAt.IsZero() {
				lastmod = s.UpdatedAt.Format("2006-01-02")
			}
			urls = append(urls, SitemapURL{Loc: loc, LastMod: lastmod})
		}
		_ = writeSitemap(w, urls)
	}
}

func sitemapClipsHandler(ds model.DataStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		base := siteBaseURL()
		clips, err := ds.VideoClip(r.Context()).GetAll(model.QueryOptions{Max: 10000})
		if err != nil {
			log.Error(r.Context(), "Error getting clips for sitemap", err)
			http.Error(w, "Error", http.StatusInternalServerError)
			return
		}
		urls := make([]SitemapURL, 0, len(clips)+1)
		urls = append(urls, SitemapURL{Loc: base + "/clips"})
		for _, c := range clips {
			// Clips live inside the SPA — only the /clips landing is canonical.
			// We still expose individual clip URLs so search engines know about them.
			loc := fmt.Sprintf("%s/app/#/video/%s", base, c.ID)
			lastmod := ""
			if !c.UpdatedAt.IsZero() {
				lastmod = c.UpdatedAt.Format("2006-01-02")
			}
			urls = append(urls, SitemapURL{Loc: loc, LastMod: lastmod})
		}
		_ = writeSitemap(w, urls)
	}
}
