package server

import (
	"encoding/xml"
	"fmt"
	"net/http"
	"time"

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

func sitemapHandler(ds model.DataStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		baseURL := conf.Server.BaseURL
		if baseURL == "" {
			baseURL = "https://qirim.online"
		}

		today := time.Now().Format("2006-01-02")

		urls := []SitemapURL{
			// Static pages
			{Loc: baseURL + "/", LastMod: today, ChangeFreq: "daily", Priority: "1.0"},
			{Loc: baseURL + "/app/", LastMod: today, ChangeFreq: "daily", Priority: "0.9"},
			{Loc: baseURL + "/app/album", LastMod: today, ChangeFreq: "daily", Priority: "0.9"},
			{Loc: baseURL + "/app/artist", LastMod: today, ChangeFreq: "daily", Priority: "0.9"},
			{Loc: baseURL + "/app/song", LastMod: today, ChangeFreq: "daily", Priority: "0.8"},
			{Loc: baseURL + "/app/playlist", LastMod: today, ChangeFreq: "weekly", Priority: "0.8"},
			{Loc: baseURL + "/app/radio", LastMod: today, ChangeFreq: "weekly", Priority: "0.7"},
			{Loc: baseURL + "/privacy.html", LastMod: today, ChangeFreq: "monthly", Priority: "0.3"},
		}

		// Get all artists
		artists, err := ds.Artist(ctx).GetAll()
		if err != nil {
			log.Error(ctx, "Error getting artists for sitemap", err)
		} else {
			for _, artist := range artists {
				artistURL := SitemapURL{
					Loc:        fmt.Sprintf("%s/app/artist/%s/show", baseURL, artist.ID),
					ChangeFreq: "weekly",
					Priority:   "0.7",
				}
				urls = append(urls, artistURL)
			}
		}

		// Get all albums
		albums, err := ds.Album(ctx).GetAll()
		if err != nil {
			log.Error(ctx, "Error getting albums for sitemap", err)
		} else {
			for _, album := range albums {
				albumURL := SitemapURL{
					Loc:        fmt.Sprintf("%s/app/album/%s/show", baseURL, album.ID),
					ChangeFreq: "weekly",
					Priority:   "0.6",
				}
				urls = append(urls, albumURL)
			}
		}

		// Get all songs with lyrics for SEO pages
		songs, err := ds.MediaFile(ctx).GetAll()
		if err != nil {
			log.Error(ctx, "Error getting songs for sitemap", err)
		} else {
			for _, song := range songs {
				// Only include songs that have lyrics
				if song.Lyrics != "" {
					songURL := SitemapURL{
						Loc:        fmt.Sprintf("%s/song/%s", baseURL, song.ID),
						ChangeFreq: "monthly",
						Priority:   "0.5",
					}
					urls = append(urls, songURL)
				}
			}
		}

		sitemap := URLSet{
			XMLNS: "http://www.sitemaps.org/schemas/sitemap/0.9",
			URLs:  urls,
		}

		w.Header().Set("Content-Type", "application/xml; charset=utf-8")
		w.Header().Set("Cache-Control", "public, max-age=3600") // Cache for 1 hour

		w.Write([]byte(xml.Header))
		encoder := xml.NewEncoder(w)
		encoder.Indent("", "  ")
		if err := encoder.Encode(sitemap); err != nil {
			log.Error(ctx, "Error encoding sitemap", err)
			http.Error(w, "Error generating sitemap", http.StatusInternalServerError)
			return
		}
	}
}
