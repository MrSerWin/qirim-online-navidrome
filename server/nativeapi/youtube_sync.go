package nativeapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/navidrome/navidrome/log"
	"github.com/navidrome/navidrome/model"
	"github.com/navidrome/navidrome/server"
)

// addYouTubeSyncRoute exposes upsert-by-youtube_id endpoints used by the
// external youtube-sync script so it doesn't need direct DB access.
//
// Auth: all endpoints require admin (parent group attaches OptionalAuthenticator;
// adminOnlyMiddleware enforces the role here).
func (n *Router) addYouTubeSyncRoute(r chi.Router) {
	r.Route("/youtube-sync", func(r chi.Router) {
		// Bypass DevAutoLoginUsername (guest auto-login) so the script's Bearer
		// token actually identifies the caller; then enforce admin.
		r.Use(server.TokenOnlyAuthenticator(n.ds))
		r.Use(adminOnlyMiddleware)

		r.Get("/clip/by-youtube-id/{ytid}", n.ytSyncGetClipByYoutubeID)
		r.Post("/clip", n.ytSyncUpsertClip)

		r.Get("/playlist/by-youtube-id/{ytid}", n.ytSyncGetPlaylistByYoutubeID)
		r.Post("/playlist", n.ytSyncUpsertPlaylist)
		r.Post("/playlist/{id}/clip", n.ytSyncLinkClip)
	})
}

type ytClipPayload struct {
	YoutubeID    string `json:"youtubeId"`
	Title        string `json:"title"`
	Artist       string `json:"artist"`
	ChannelID    string `json:"channelId"`
	ChannelName  string `json:"channelName"`
	Description  string `json:"description"`
	Duration     int    `json:"duration"`
	ThumbnailURL string `json:"thumbnailUrl"`
	ViewCount    int64  `json:"viewCount"`
	PublishedAt  string `json:"publishedAt"` // RFC3339 or empty
}

type ytPlaylistPayload struct {
	YoutubeID       string `json:"youtubeId"`
	Title           string `json:"title"`
	Description     string `json:"description"`
	ThumbnailURL    string `json:"thumbnailUrl"`
	ChannelID       string `json:"channelId"`
	ChannelName     string `json:"channelName"`
	VideoCount      int    `json:"videoCount"`
	IsChannelVideos bool   `json:"isChannelVideos"`
}

type ytLinkPayload struct {
	ClipID   string `json:"clipId"`
	Position int    `json:"position"`
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func (n *Router) ytSyncGetClipByYoutubeID(w http.ResponseWriter, r *http.Request) {
	ytid := chi.URLParam(r, "ytid")
	if ytid == "" {
		http.Error(w, "youtube id required", http.StatusBadRequest)
		return
	}
	clip, err := n.ds.VideoClip(r.Context()).GetByYoutubeID(ytid)
	if errors.Is(err, model.ErrNotFound) {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Error(r.Context(), "yt-sync: get clip by youtube id", "ytid", ytid, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, clip)
}

func (n *Router) ytSyncUpsertClip(w http.ResponseWriter, r *http.Request) {
	var p ytClipPayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if p.YoutubeID == "" {
		http.Error(w, "youtubeId required", http.StatusBadRequest)
		return
	}

	repo := n.ds.VideoClip(r.Context())

	existing, err := repo.GetByYoutubeID(p.YoutubeID)
	if err != nil && !errors.Is(err, model.ErrNotFound) {
		log.Error(r.Context(), "yt-sync: lookup clip", "ytid", p.YoutubeID, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	clip := &model.VideoClip{}
	created := false
	if existing != nil && existing.ID != "" {
		clip = existing
	} else {
		created = true
	}

	clip.YoutubeID = p.YoutubeID
	clip.Title = p.Title
	clip.Artist = p.Artist
	clip.ChannelID = p.ChannelID
	clip.ChannelName = p.ChannelName
	clip.Description = p.Description
	clip.Duration = p.Duration
	clip.ThumbnailURL = p.ThumbnailURL
	clip.ViewCount = p.ViewCount
	if p.PublishedAt != "" {
		if t, err := time.Parse(time.RFC3339, p.PublishedAt); err == nil {
			clip.PublishedAt = t
		}
	}

	if err := repo.Put(clip); err != nil {
		log.Error(r.Context(), "yt-sync: put clip", "ytid", p.YoutubeID, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}
	writeJSON(w, status, clip)
}

func (n *Router) ytSyncGetPlaylistByYoutubeID(w http.ResponseWriter, r *http.Request) {
	ytid := chi.URLParam(r, "ytid")
	if ytid == "" {
		http.Error(w, "youtube id required", http.StatusBadRequest)
		return
	}
	pl, err := n.ds.VideoPlaylist(r.Context()).GetByYoutubeID(ytid)
	if errors.Is(err, model.ErrNotFound) {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Error(r.Context(), "yt-sync: get playlist by youtube id", "ytid", ytid, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, pl)
}

func (n *Router) ytSyncUpsertPlaylist(w http.ResponseWriter, r *http.Request) {
	var p ytPlaylistPayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if p.YoutubeID == "" {
		http.Error(w, "youtubeId required", http.StatusBadRequest)
		return
	}

	repo := n.ds.VideoPlaylist(r.Context())

	existing, err := repo.GetByYoutubeID(p.YoutubeID)
	if err != nil && !errors.Is(err, model.ErrNotFound) {
		log.Error(r.Context(), "yt-sync: lookup playlist", "ytid", p.YoutubeID, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	pl := &model.VideoPlaylist{}
	created := false
	if existing != nil && existing.ID != "" {
		pl = existing
	} else {
		created = true
	}

	pl.YoutubeID = p.YoutubeID
	pl.Title = p.Title
	pl.Description = p.Description
	pl.ThumbnailURL = p.ThumbnailURL
	pl.ChannelID = p.ChannelID
	pl.ChannelName = p.ChannelName
	pl.VideoCount = p.VideoCount
	pl.IsChannelVideos = p.IsChannelVideos

	if err := repo.Put(pl); err != nil {
		log.Error(r.Context(), "yt-sync: put playlist", "ytid", p.YoutubeID, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}
	writeJSON(w, status, pl)
}

// ytSyncLinkClip is idempotent: re-linking the same (playlist, clip) is a no-op.
func (n *Router) ytSyncLinkClip(w http.ResponseWriter, r *http.Request) {
	playlistID := chi.URLParam(r, "id")
	if playlistID == "" {
		http.Error(w, "playlist id required", http.StatusBadRequest)
		return
	}
	var p ytLinkPayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if p.ClipID == "" {
		http.Error(w, "clipId required", http.StatusBadRequest)
		return
	}

	repo := n.ds.VideoPlaylist(r.Context())

	// Idempotency: bail out if the clip is already linked. AddClip would
	// otherwise fail on the (playlist_id, clip_id) primary key.
	clips, err := repo.GetClips(playlistID)
	if err != nil {
		log.Error(r.Context(), "yt-sync: list playlist clips", "playlistId", playlistID, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	for _, c := range clips {
		if c.ID == p.ClipID {
			writeJSON(w, http.StatusOK, map[string]any{"status": "exists"})
			return
		}
	}

	if err := repo.AddClip(playlistID, p.ClipID, p.Position); err != nil {
		log.Error(r.Context(), "yt-sync: link clip", "playlistId", playlistID, "clipId", p.ClipID, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"status": "ok"})
}
