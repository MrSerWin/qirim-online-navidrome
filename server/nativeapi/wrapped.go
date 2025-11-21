package nativeapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/navidrome/navidrome/log"
	"github.com/navidrome/navidrome/model"
	"github.com/navidrome/navidrome/model/request"
	"github.com/navidrome/navidrome/server"
)

type wrappedController struct {
	ds model.DataStore
}

func newWrappedController(ds model.DataStore) *wrappedController {
	return &wrappedController{ds: ds}
}

func (c *wrappedController) Routes() http.Handler {
	r := chi.NewRouter()

	// Protected routes (require authentication)
	r.Group(func(r chi.Router) {
		r.Use(server.Authenticator(c.ds))
		r.Get("/available-years", c.getAvailableYears)
		r.Get("/{year}", c.getWrapped)
		r.Post("/{year}/share", c.createShare)
	})

	// Public routes (no authentication required)
	r.Get("/share/{shareId}", c.getPublicShare)

	return r
}

// getAvailableYears returns years for which wrapped data can be generated
func (c *wrappedController) getAvailableYears(w http.ResponseWriter, r *http.Request) {
	user, ok := request.UserFrom(r.Context())
	if !ok {
		log.Error("User not found in context", "request", r.URL.Path)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	years, err := c.ds.Wrapped(r.Context()).GetAvailableYears(user.ID)
	if err != nil {
		log.Error("Error getting available years", "user", user.ID, "err", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"years": years,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Error("Error encoding response", "err", err)
	}
}

// getWrapped returns wrapped statistics for a specific year
func (c *wrappedController) getWrapped(w http.ResponseWriter, r *http.Request) {
	user, ok := request.UserFrom(r.Context())
	if !ok {
		log.Error("User not found in context", "request", r.URL.Path)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	yearStr := chi.URLParam(r, "year")
	year, err := strconv.Atoi(yearStr)
	if err != nil || year < 2000 || year > time.Now().Year() {
		http.Error(w, "Invalid year", http.StatusBadRequest)
		return
	}

	period := r.URL.Query().Get("period")
	if period == "" {
		period = "year"
	}

	stats, err := c.ds.Wrapped(r.Context()).GenerateWrapped(user.ID, year, period)
	if err != nil {
		log.Error("Error generating wrapped", "user", user.ID, "year", year, "period", period, "err", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(stats); err != nil {
		log.Error("Error encoding response", "err", err)
	}
}

// createShare creates a public share link for wrapped statistics
func (c *wrappedController) createShare(w http.ResponseWriter, r *http.Request) {
	user, ok := request.UserFrom(r.Context())
	if !ok {
		log.Error("User not found in context", "request", r.URL.Path)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	yearStr := chi.URLParam(r, "year")
	year, err := strconv.Atoi(yearStr)
	if err != nil || year < 2000 || year > time.Now().Year() {
		http.Error(w, "Invalid year", http.StatusBadRequest)
		return
	}

	var req struct {
		Period    string     `json:"period"`
		ExpiresAt *time.Time `json:"expiresAt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Period == "" {
		req.Period = "year"
	}

	// Generate wrapped stats first
	stats, err := c.ds.Wrapped(r.Context()).GenerateWrapped(user.ID, year, req.Period)
	if err != nil {
		log.Error("Error generating wrapped for share", "user", user.ID, "year", year, "err", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Create public share
	shareID, err := c.ds.Wrapped(r.Context()).CreatePublicShare(stats, req.ExpiresAt)
	if err != nil {
		log.Error("Error creating share", "user", user.ID, "year", year, "err", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"shareId":  shareID,
		"shareUrl": "/app/wrapped/share/" + shareID,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Error("Error encoding response", "err", err)
	}
}

// getPublicShare returns publicly shared wrapped statistics (no auth required)
func (c *wrappedController) getPublicShare(w http.ResponseWriter, r *http.Request) {
	shareID := chi.URLParam(r, "shareId")
	if shareID == "" {
		http.Error(w, "Share ID is required", http.StatusBadRequest)
		return
	}

	stats, err := c.ds.Wrapped(r.Context()).GetPublicShare(shareID)
	if err != nil {
		log.Error("Error getting public share", "shareId", shareID, "err", err)
		http.Error(w, "Share not found or expired", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(stats); err != nil {
		log.Error("Error encoding response", "err", err)
	}
}
