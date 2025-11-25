package nativeapi

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/navidrome/navidrome/log"
	"github.com/navidrome/navidrome/model"
	"github.com/navidrome/navidrome/model/request"
	"github.com/navidrome/navidrome/server"
)

type lyricsCrowdsourceController struct {
	ds model.DataStore
}

func newLyricsCrowdsourceController(ds model.DataStore) *lyricsCrowdsourceController {
	return &lyricsCrowdsourceController{ds: ds}
}

func (c *lyricsCrowdsourceController) Routes() http.Handler {
	r := chi.NewRouter()

	// Protected routes (require authentication)
	r.Group(func(r chi.Router) {
		r.Use(server.Authenticator(c.ds))

		// Get approved lyrics for a media file
		r.Get("/media-file/{mediaFileId}", c.getApprovedLyrics)

		// Get all versions for a media file
		r.Get("/media-file/{mediaFileId}/all", c.getAllVersions)

		// Submit new lyrics (authenticated users)
		r.Post("/", c.submitLyrics)

		// Update existing lyrics (authenticated users)
		r.Put("/{id}", c.updateLyrics)

		// Get history
		r.Get("/{id}/history", c.getHistory)
		r.Get("/media-file/{mediaFileId}/history", c.getMediaFileHistory)
	})

	// Admin-only routes
	r.Group(func(r chi.Router) {
		r.Use(server.Authenticator(c.ds))
		r.Use(adminOnlyMiddleware)

		// Moderation endpoints
		r.Get("/pending", c.getPendingLyrics)
		r.Get("/approved", c.getAllApprovedLyrics)
		r.Post("/{id}/approve", c.approveLyrics)
		r.Post("/{id}/reject", c.rejectLyrics)
		r.Delete("/{id}", c.deleteLyrics)
	})

	return r
}

// getApprovedLyrics gets the current approved lyrics for a media file
func (c *lyricsCrowdsourceController) getApprovedLyrics(w http.ResponseWriter, r *http.Request) {
	mediaFileID := chi.URLParam(r, "mediaFileId")
	if mediaFileID == "" {
		http.Error(w, "Media file ID is required", http.StatusBadRequest)
		return
	}

	lyrics, err := c.ds.LyricsCrowdsource(r.Context()).GetApproved(mediaFileID)
	if err != nil {
		if err == model.ErrNotFound {
			http.Error(w, "No approved lyrics found", http.StatusNotFound)
			return
		}
		log.Error("Error getting approved lyrics", "mediaFileId", mediaFileID, "err", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(lyrics); err != nil {
		log.Error("Error encoding response", "err", err)
	}
}

// getAllVersions gets all versions (including pending) for a media file
func (c *lyricsCrowdsourceController) getAllVersions(w http.ResponseWriter, r *http.Request) {
	mediaFileID := chi.URLParam(r, "mediaFileId")
	if mediaFileID == "" {
		http.Error(w, "Media file ID is required", http.StatusBadRequest)
		return
	}

	lyrics, err := c.ds.LyricsCrowdsource(r.Context()).GetAll(mediaFileID)
	if err != nil {
		log.Error("Error getting all lyrics versions", "mediaFileId", mediaFileID, "err", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(lyrics); err != nil {
		log.Error("Error encoding response", "err", err)
	}
}

// submitLyrics creates a new pending lyrics submission
func (c *lyricsCrowdsourceController) submitLyrics(w http.ResponseWriter, r *http.Request) {
	user, ok := request.UserFrom(r.Context())
	if !ok {
		log.Error("User not found in context", "request", r.URL.Path)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		MediaFileID string `json:"mediaFileId"`
		Content     string `json:"content"`
		Language    string `json:"language"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.MediaFileID == "" || req.Content == "" {
		http.Error(w, "Media file ID and content are required", http.StatusBadRequest)
		return
	}

	if req.Language == "" {
		req.Language = model.LangCrimeanTatar // Default to Crimean Tatar
	}

	lyrics := &model.LyricsCrowdsource{
		MediaFileID: req.MediaFileID,
		Content:     req.Content,
		Language:    req.Language,
		CreatedBy:   user.ID,
	}

	if err := c.ds.LyricsCrowdsource(r.Context()).Submit(lyrics); err != nil {
		log.Error("Error submitting lyrics", "user", user.ID, "mediaFileId", req.MediaFileID, "err", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(lyrics); err != nil {
		log.Error("Error encoding response", "err", err)
	}
}

// updateLyrics creates a new version of existing lyrics
func (c *lyricsCrowdsourceController) updateLyrics(w http.ResponseWriter, r *http.Request) {
	user, ok := request.UserFrom(r.Context())
	if !ok {
		log.Error("User not found in context", "request", r.URL.Path)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	lyricsID := chi.URLParam(r, "id")
	if lyricsID == "" {
		http.Error(w, "Lyrics ID is required", http.StatusBadRequest)
		return
	}

	var req struct {
		Content    string `json:"content"`
		Language   string `json:"language"`
		ChangeNote string `json:"changeNote"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Content == "" {
		http.Error(w, "Content is required", http.StatusBadRequest)
		return
	}

	lyrics := &model.LyricsCrowdsource{
		ID:       lyricsID,
		Content:  req.Content,
		Language: req.Language,
	}

	if err := c.ds.LyricsCrowdsource(r.Context()).Update(lyrics, req.ChangeNote); err != nil {
		log.Error("Error updating lyrics", "user", user.ID, "lyricsId", lyricsID, "err", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]string{"status": "updated"}); err != nil {
		log.Error("Error encoding response", "err", err)
	}
}

// getPendingLyrics gets pending lyrics for moderation (admin only)
func (c *lyricsCrowdsourceController) getPendingLyrics(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 50
	offset := 0

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	lyrics, err := c.ds.LyricsCrowdsource(r.Context()).GetPending(limit, offset)
	if err != nil {
		log.Error("Error getting pending lyrics", "err", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	count, err := c.ds.LyricsCrowdsource(r.Context()).CountPending()
	if err != nil {
		log.Error("Error counting pending lyrics", "err", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"data":   lyrics,
		"total":  count,
		"limit":  limit,
		"offset": offset,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Error("Error encoding response", "err", err)
	}
}

// approveLyrics approves pending lyrics (admin only)
func (c *lyricsCrowdsourceController) approveLyrics(w http.ResponseWriter, r *http.Request) {
	user, ok := request.UserFrom(r.Context())
	if !ok {
		log.Error("User not found in context", "request", r.URL.Path)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	lyricsID := chi.URLParam(r, "id")
	if lyricsID == "" {
		http.Error(w, "Lyrics ID is required", http.StatusBadRequest)
		return
	}

	if err := c.ds.LyricsCrowdsource(r.Context()).Approve(lyricsID, user.ID); err != nil {
		log.Error("Error approving lyrics", "moderator", user.ID, "lyricsId", lyricsID, "err", err)
		if err == model.ErrNotAvailable {
			http.Error(w, "Lyrics is not in pending state", http.StatusBadRequest)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]string{"status": "approved"}); err != nil {
		log.Error("Error encoding response", "err", err)
	}
}

// rejectLyrics rejects pending lyrics (admin only)
func (c *lyricsCrowdsourceController) rejectLyrics(w http.ResponseWriter, r *http.Request) {
	user, ok := request.UserFrom(r.Context())
	if !ok {
		log.Error("User not found in context", "request", r.URL.Path)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	lyricsID := chi.URLParam(r, "id")
	if lyricsID == "" {
		http.Error(w, "Lyrics ID is required", http.StatusBadRequest)
		return
	}

	var req struct {
		Note string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := c.ds.LyricsCrowdsource(r.Context()).Reject(lyricsID, user.ID, req.Note); err != nil {
		log.Error("Error rejecting lyrics", "moderator", user.ID, "lyricsId", lyricsID, "err", err)
		if err == model.ErrNotAvailable {
			http.Error(w, "Lyrics is not in pending state", http.StatusBadRequest)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]string{"status": "rejected"}); err != nil {
		log.Error("Error encoding response", "err", err)
	}
}

// getHistory gets history for specific lyrics
func (c *lyricsCrowdsourceController) getHistory(w http.ResponseWriter, r *http.Request) {
	lyricsID := chi.URLParam(r, "id")
	if lyricsID == "" {
		http.Error(w, "Lyrics ID is required", http.StatusBadRequest)
		return
	}

	history, err := c.ds.LyricsCrowdsource(r.Context()).GetHistory(lyricsID)
	if err != nil {
		log.Error("Error getting lyrics history", "lyricsId", lyricsID, "err", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(history); err != nil {
		log.Error("Error encoding response", "err", err)
	}
}

// getMediaFileHistory gets history for media file
func (c *lyricsCrowdsourceController) getMediaFileHistory(w http.ResponseWriter, r *http.Request) {
	mediaFileID := chi.URLParam(r, "mediaFileId")
	if mediaFileID == "" {
		http.Error(w, "Media file ID is required", http.StatusBadRequest)
		return
	}

	history, err := c.ds.LyricsCrowdsource(r.Context()).GetMediaFileHistory(mediaFileID)
	if err != nil {
		log.Error("Error getting media file history", "mediaFileId", mediaFileID, "err", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(history); err != nil {
		log.Error("Error encoding response", "err", err)
	}
}

// getAllApprovedLyrics gets all approved lyrics for admin management
func (c *lyricsCrowdsourceController) getAllApprovedLyrics(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 50
	offset := 0

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	lyrics, err := c.ds.LyricsCrowdsource(r.Context()).GetAllApproved(limit, offset)
	if err != nil {
		log.Error("Error getting approved lyrics", "err", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	count, err := c.ds.LyricsCrowdsource(r.Context()).CountApproved()
	if err != nil {
		log.Error("Error counting approved lyrics", "err", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"data":   lyrics,
		"total":  count,
		"limit":  limit,
		"offset": offset,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Error("Error encoding response", "err", err)
	}
}

// deleteLyrics deletes lyrics (admin only)
func (c *lyricsCrowdsourceController) deleteLyrics(w http.ResponseWriter, r *http.Request) {
	user, ok := request.UserFrom(r.Context())
	if !ok {
		log.Error("User not found in context", "request", r.URL.Path)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	lyricsID := chi.URLParam(r, "id")
	if lyricsID == "" {
		http.Error(w, "Lyrics ID is required", http.StatusBadRequest)
		return
	}

	if err := c.ds.LyricsCrowdsource(r.Context()).Delete(lyricsID); err != nil {
		log.Error("Error deleting lyrics", "admin", user.ID, "lyricsId", lyricsID, "err", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]string{"status": "deleted"}); err != nil {
		log.Error("Error encoding response", "err", err)
	}
}
