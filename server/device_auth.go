package server

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/deluan/rest"
	"github.com/navidrome/navidrome/conf"
	authPkg "github.com/navidrome/navidrome/core/auth"
	"github.com/navidrome/navidrome/log"
	"github.com/navidrome/navidrome/model"
	"github.com/navidrome/navidrome/model/request"
)

const (
	deviceCodeLength = 32 // 64 hex chars
	userCodeLength   = 4  // 8 hex chars (displayed as XXXX-XXXX)
	deviceAuthExpiry = 10 * time.Minute
	pollInterval     = 3 // seconds
)

// DeviceAuthResponse is returned when a device requests authorization
type DeviceAuthResponse struct {
	DeviceCode      string `json:"device_code"`
	UserCode        string `json:"user_code"`
	VerificationURL string `json:"verification_url"`
	QRData          string `json:"qr_data"`
	ExpiresIn       int    `json:"expires_in"`
	Interval        int    `json:"interval"`
}

// DevicePollResponse is returned when a device polls for authorization status
type DevicePollResponse struct {
	Status string `json:"status"`
	// Only present when status is "granted"
	Token         string `json:"token,omitempty"`
	ID            string `json:"id,omitempty"`
	Name          string `json:"name,omitempty"`
	Username      string `json:"username,omitempty"`
	IsAdmin       bool   `json:"isAdmin,omitempty"`
	SubsonicSalt  string `json:"subsonicSalt,omitempty"`
	SubsonicToken string `json:"subsonicToken,omitempty"`
}

// generateSecureCode generates a cryptographically secure random code
func generateSecureCode(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// formatUserCode formats user code as XXXX-XXXX for display
func formatUserCode(code string) string {
	if len(code) < 8 {
		return code
	}
	return strings.ToUpper(code[:4] + "-" + code[4:8])
}

// parseUserCode removes dashes and lowercases for lookup
func parseUserCode(code string) string {
	return strings.ToLower(strings.ReplaceAll(code, "-", ""))
}

// deviceAuthStart creates a new device authorization request
func deviceAuthStart(ds model.DataStore) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		deviceCode, err := generateSecureCode(deviceCodeLength)
		if err != nil {
			log.Error(r, "Failed to generate device code", err)
			_ = rest.RespondWithError(w, http.StatusInternalServerError, "Failed to generate code")
			return
		}

		userCode, err := generateSecureCode(userCodeLength)
		if err != nil {
			log.Error(r, "Failed to generate user code", err)
			_ = rest.RespondWithError(w, http.StatusInternalServerError, "Failed to generate code")
			return
		}

		now := time.Now()
		deviceAuth := &model.DeviceAuth{
			DeviceCode: deviceCode,
			UserCode:   userCode,
			Status:     model.DeviceAuthStatusPending,
			ClientIP:   r.RemoteAddr,
			UserAgent:  r.UserAgent(),
			CreatedAt:  now,
			ExpiresAt:  now.Add(deviceAuthExpiry),
		}

		err = ds.DeviceAuth(r.Context()).Put(deviceAuth)
		if err != nil {
			log.Error(r, "Failed to save device auth", err)
			_ = rest.RespondWithError(w, http.StatusInternalServerError, "Failed to create authorization")
			return
		}

		// Build verification URL
		baseURL := conf.Server.BaseURL
		if baseURL == "" {
			scheme := "https"
			if r.TLS == nil {
				scheme = "http"
			}
			baseURL = scheme + "://" + r.Host
		}
		verificationURL := baseURL + "/app/#/device/grant"
		qrData := verificationURL + "?code=" + formatUserCode(userCode)

		response := DeviceAuthResponse{
			DeviceCode:      deviceCode,
			UserCode:        formatUserCode(userCode),
			VerificationURL: verificationURL,
			QRData:          qrData,
			ExpiresIn:       int(deviceAuthExpiry.Seconds()),
			Interval:        pollInterval,
		}

		_ = rest.RespondWithJSON(w, http.StatusOK, response)
	}
}

// deviceAuthPoll checks the status of a device authorization request
func deviceAuthPoll(ds model.DataStore) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		deviceCode := r.URL.Query().Get("device_code")
		if deviceCode == "" {
			_ = rest.RespondWithError(w, http.StatusBadRequest, "device_code is required")
			return
		}

		deviceAuth, err := ds.DeviceAuth(r.Context()).GetByDeviceCode(deviceCode)
		if err != nil {
			_ = rest.RespondWithError(w, http.StatusNotFound, "Device code not found")
			return
		}

		// Check if expired
		if deviceAuth.IsExpired() {
			response := DevicePollResponse{Status: string(model.DeviceAuthStatusExpired)}
			_ = rest.RespondWithJSON(w, http.StatusOK, response)
			return
		}

		// Check status
		switch deviceAuth.Status {
		case model.DeviceAuthStatusPending:
			response := DevicePollResponse{Status: string(model.DeviceAuthStatusPending)}
			_ = rest.RespondWithJSON(w, http.StatusOK, response)
			return

		case model.DeviceAuthStatusDenied:
			response := DevicePollResponse{Status: string(model.DeviceAuthStatusDenied)}
			_ = rest.RespondWithJSON(w, http.StatusOK, response)
			return

		case model.DeviceAuthStatusGranted:
			// Get user with password (needed for subsonic token generation)
			user, err := ds.User(r.Context()).GetWithPassword(deviceAuth.UserID)
			if err != nil {
				log.Error(r, "Failed to get user for device auth", err)
				_ = rest.RespondWithError(w, http.StatusInternalServerError, "Failed to get user")
				return
			}

			tokenString, err := authPkg.CreateToken(user)
			if err != nil {
				log.Error(r, "Failed to create token for device auth", err)
				_ = rest.RespondWithError(w, http.StatusInternalServerError, "Failed to create token")
				return
			}

			payload := buildAuthPayload(user)
			response := DevicePollResponse{
				Status:   string(model.DeviceAuthStatusGranted),
				Token:    tokenString,
				ID:       user.ID,
				Name:     user.Name,
				Username: user.UserName,
				IsAdmin:  user.IsAdmin,
			}
			if salt, ok := payload["subsonicSalt"].(string); ok {
				response.SubsonicSalt = salt
			} else {
				log.Warn(r, "subsonicSalt not found in payload")
			}
			if token, ok := payload["subsonicToken"].(string); ok {
				response.SubsonicToken = token
			} else {
				log.Warn(r, "subsonicToken not found in payload")
			}
			log.Info(r, "Device auth granted", "user", user.UserName, "hasSalt", response.SubsonicSalt != "", "hasToken", response.SubsonicToken != "")

			// Clean up the device auth entry
			_ = ds.DeviceAuth(r.Context()).Cleanup()

			_ = rest.RespondWithJSON(w, http.StatusOK, response)
			return
		}

		// Unknown status
		response := DevicePollResponse{Status: string(deviceAuth.Status)}
		_ = rest.RespondWithJSON(w, http.StatusOK, response)
	}
}

// deviceAuthGrant allows a logged-in user to grant or deny device authorization
func deviceAuthGrant(ds model.DataStore) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get logged-in user from context
		user, ok := request.UserFrom(r.Context())
		if !ok {
			_ = rest.RespondWithError(w, http.StatusUnauthorized, "Not authenticated")
			return
		}

		// Parse request body
		var req struct {
			UserCode string `json:"user_code"`
			Action   string `json:"action"` // "grant" or "deny"
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			_ = rest.RespondWithError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		if req.UserCode == "" {
			_ = rest.RespondWithError(w, http.StatusBadRequest, "user_code is required")
			return
		}

		if req.Action != "grant" && req.Action != "deny" {
			_ = rest.RespondWithError(w, http.StatusBadRequest, "action must be 'grant' or 'deny'")
			return
		}

		// Find the device auth by user code
		userCode := parseUserCode(req.UserCode)
		deviceAuth, err := ds.DeviceAuth(r.Context()).GetByUserCode(userCode)
		if err != nil {
			_ = rest.RespondWithError(w, http.StatusNotFound, "Device code not found or expired")
			return
		}

		// Check if expired
		if deviceAuth.IsExpired() {
			_ = rest.RespondWithError(w, http.StatusGone, "Device code has expired")
			return
		}

		// Check if already processed
		if deviceAuth.Status != model.DeviceAuthStatusPending {
			_ = rest.RespondWithError(w, http.StatusConflict, "Device code has already been processed")
			return
		}

		// Update status
		var newStatus model.DeviceAuthStatus
		var userID string
		if req.Action == "grant" {
			newStatus = model.DeviceAuthStatusGranted
			userID = user.ID
		} else {
			newStatus = model.DeviceAuthStatusDenied
		}

		err = ds.DeviceAuth(r.Context()).UpdateStatus(deviceAuth.DeviceCode, newStatus, userID)
		if err != nil {
			log.Error(r, "Failed to update device auth status", err)
			_ = rest.RespondWithError(w, http.StatusInternalServerError, "Failed to update authorization")
			return
		}

		log.Info(r, "Device authorization updated", "action", req.Action, "user", user.UserName, "clientIP", deviceAuth.ClientIP)

		_ = rest.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// deviceAuthInfo gets info about a device auth request (for mobile to show confirmation page)
func deviceAuthInfo(ds model.DataStore) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		userCode := r.URL.Query().Get("code")
		if userCode == "" {
			_ = rest.RespondWithError(w, http.StatusBadRequest, "code is required")
			return
		}

		// Find the device auth by user code
		code := parseUserCode(userCode)
		deviceAuth, err := ds.DeviceAuth(r.Context()).GetByUserCode(code)
		if err != nil {
			_ = rest.RespondWithError(w, http.StatusNotFound, "Device code not found")
			return
		}

		// Check if expired
		if deviceAuth.IsExpired() {
			_ = rest.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
				"valid":   false,
				"reason":  "expired",
				"message": "This code has expired",
			})
			return
		}

		// Check if already processed
		if deviceAuth.Status != model.DeviceAuthStatusPending {
			_ = rest.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
				"valid":   false,
				"reason":  string(deviceAuth.Status),
				"message": "This code has already been used",
			})
			return
		}

		// Return info about the request
		_ = rest.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
			"valid":      true,
			"user_code":  formatUserCode(deviceAuth.UserCode),
			"client_ip":  deviceAuth.ClientIP,
			"user_agent": deviceAuth.UserAgent,
			"created_at": deviceAuth.CreatedAt,
			"expires_at": deviceAuth.ExpiresAt,
		})
	}
}
