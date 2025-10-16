package server

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/deluan/rest"
	"github.com/navidrome/navidrome/conf"
	"github.com/navidrome/navidrome/core/auth"
	"github.com/navidrome/navidrome/log"
	"github.com/navidrome/navidrome/model"
	"github.com/navidrome/navidrome/model/id"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/facebook"
	"golang.org/x/oauth2/google"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

// OAuth provider configurations
var (
	googleEndpoint = google.Endpoint
	facebookEndpoint = facebook.Endpoint
	appleEndpoint = oauth2.Endpoint{
		AuthURL:  "https://appleid.apple.com/auth/authorize",
		TokenURL: "https://appleid.apple.com/auth/token",
	}
	instagramEndpoint = oauth2.Endpoint{
		AuthURL:  "https://api.instagram.com/oauth/authorize",
		TokenURL: "https://api.instagram.com/oauth/access_token",
	}
)

// OAuth provider user info URLs
const (
	googleUserInfoURL    = "https://www.googleapis.com/oauth2/v2/userinfo"
	facebookUserInfoURL  = "https://graph.facebook.com/me?fields=id,name,email"
	instagramUserInfoURL = "https://graph.instagram.com/me?fields=id,username"
)

type oauthUserInfo struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Username string `json:"username"`
}

func getOAuthConfig(provider string) (*oauth2.Config, error) {
	if !conf.Server.OAuth.Enabled {
		return nil, errors.New("OAuth is disabled")
	}

	var clientID, clientSecret string
	var endpoint oauth2.Endpoint
	var scopes []string
	var enabled bool

	switch provider {
	case "google":
		clientID = conf.Server.OAuth.Google.ClientID
		clientSecret = conf.Server.OAuth.Google.ClientSecret
		endpoint = googleEndpoint
		scopes = []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"}
		enabled = conf.Server.OAuth.Google.Enabled
	case "apple":
		clientID = conf.Server.OAuth.Apple.ClientID
		clientSecret = conf.Server.OAuth.Apple.ClientSecret
		endpoint = appleEndpoint
		scopes = []string{"name", "email"}
		enabled = conf.Server.OAuth.Apple.Enabled
	case "instagram":
		clientID = conf.Server.OAuth.Instagram.ClientID
		clientSecret = conf.Server.OAuth.Instagram.ClientSecret
		// Instagram now uses Facebook's OAuth endpoint
		endpoint = facebookEndpoint
		scopes = []string{"email", "public_profile", "instagram_basic"}
		enabled = conf.Server.OAuth.Instagram.Enabled
	case "facebook":
		clientID = conf.Server.OAuth.Facebook.ClientID
		clientSecret = conf.Server.OAuth.Facebook.ClientSecret
		endpoint = facebookEndpoint
		scopes = []string{"email", "public_profile"}
		enabled = conf.Server.OAuth.Facebook.Enabled
	default:
		return nil, fmt.Errorf("unknown OAuth provider: %s", provider)
	}

	if !enabled {
		return nil, fmt.Errorf("OAuth provider %s is not enabled", provider)
	}

	if clientID == "" || clientSecret == "" {
		return nil, fmt.Errorf("OAuth provider %s is not configured", provider)
	}

	redirectURL := conf.Server.OAuth.RedirectURL
	if redirectURL == "" {
		redirectURL = fmt.Sprintf("%s://%s%s/auth/oauth/callback/%s",
			conf.Server.BaseScheme, conf.Server.BaseHost, conf.Server.BasePath, provider)
	} else {
		redirectURL = fmt.Sprintf("%s/%s", redirectURL, provider)
	}

	return &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       scopes,
		Endpoint:     endpoint,
	}, nil
}

func generateStateToken() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

// Handler for initiating OAuth flow
func oauthLogin(provider string) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		oauthConfig, err := getOAuthConfig(provider)
		if err != nil {
			log.Error(r, "OAuth configuration error", "provider", provider, err)
			_ = rest.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}

		state, err := generateStateToken()
		if err != nil {
			log.Error(r, "Failed to generate state token", err)
			_ = rest.RespondWithError(w, http.StatusInternalServerError, "Failed to initiate OAuth")
			return
		}

		// Store state in cookie for verification
		http.SetCookie(w, &http.Cookie{
			Name:     fmt.Sprintf("oauth_state_%s", provider),
			Value:    state,
			Path:     "/",
			HttpOnly: true,
			Secure:   conf.Server.BaseScheme == "https",
			SameSite: http.SameSiteLaxMode,
			MaxAge:   600, // 10 minutes
		})

		url := oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
		http.Redirect(w, r, url, http.StatusTemporaryRedirect)
	}
}

// Handler for OAuth callback
func oauthCallback(ds model.DataStore, provider string) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		// Verify state
		stateCookie, err := r.Cookie(fmt.Sprintf("oauth_state_%s", provider))
		if err != nil {
			log.Error(r, "State cookie not found", err)
			_ = rest.RespondWithError(w, http.StatusBadRequest, "Invalid OAuth state")
			return
		}

		state := r.URL.Query().Get("state")
		if state != stateCookie.Value {
			log.Error(r, "State mismatch", "expected", stateCookie.Value, "got", state)
			_ = rest.RespondWithError(w, http.StatusBadRequest, "Invalid OAuth state")
			return
		}

		// Clear state cookie
		http.SetCookie(w, &http.Cookie{
			Name:     fmt.Sprintf("oauth_state_%s", provider),
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
		})

		code := r.URL.Query().Get("code")
		if code == "" {
			log.Error(r, "No code in callback")
			_ = rest.RespondWithError(w, http.StatusBadRequest, "No authorization code provided")
			return
		}

		oauthConfig, err := getOAuthConfig(provider)
		if err != nil {
			log.Error(r, "OAuth configuration error", "provider", provider, err)
			_ = rest.RespondWithError(w, http.StatusInternalServerError, "OAuth configuration error")
			return
		}

		// Exchange code for token
		token, err := oauthConfig.Exchange(context.Background(), code)
		if err != nil {
			log.Error(r, "Failed to exchange code for token", err)
			_ = rest.RespondWithError(w, http.StatusInternalServerError, "Failed to authenticate with OAuth provider")
			return
		}

		// Get user info
		userInfo, err := getOAuthUserInfo(r.Context(), provider, token)
		if err != nil {
			log.Error(r, "Failed to get user info", err)
			_ = rest.RespondWithError(w, http.StatusInternalServerError, "Failed to get user information")
			return
		}

		// Find or create user
		user, err := findOrCreateOAuthUser(ds, r.Context(), provider, userInfo)
		if err != nil {
			log.Error(r, "Failed to find or create user", err)
			_ = rest.RespondWithError(w, http.StatusInternalServerError, "Failed to create user account")
			return
		}

		log.Info(r, "OAuth user authenticated", "userId", user.ID, "username", user.UserName, "provider", provider, "isAdmin", user.IsAdmin)

		// Create JWT token
		tokenString, err := auth.CreateToken(user)
		if err != nil {
			log.Error(r, "Failed to create token", err)
			_ = rest.RespondWithError(w, http.StatusInternalServerError, "Failed to create session")
			return
		}

		log.Debug(r, "OAuth JWT token created", "userId", user.ID, "tokenLength", len(tokenString))

		payload := buildAuthPayload(user)
		payload["token"] = tokenString

		// Encode payload as JSON for the HTML template
		payloadJSON, err := json.Marshal(payload)
		if err != nil {
			log.Error(r, "Failed to marshal payload", err)
			_ = rest.RespondWithError(w, http.StatusInternalServerError, "Failed to create session")
			return
		}

		// Return HTML that will save the token and redirect to the app
		redirectHTML := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
    <title>Sign in successful</title>
    <script>
        (function() {
            try {
                var authInfo = %s;

                // Store auth data in localStorage (same as authProvider.js)
                if (authInfo.token) {
                    localStorage.setItem('token', authInfo.token);
                }
                localStorage.setItem('userId', authInfo.id);
                localStorage.setItem('name', authInfo.name);
                localStorage.setItem('username', authInfo.username);
                if (authInfo.avatar) {
                    localStorage.setItem('avatar', authInfo.avatar);
                }
                localStorage.setItem('role', authInfo.isAdmin ? 'admin' : 'regular');
                localStorage.setItem('subsonic-salt', authInfo.subsonicSalt);
                localStorage.setItem('subsonic-token', authInfo.subsonicToken);
                localStorage.setItem('is-authenticated', 'true');

                // Redirect to home page
                window.location.href = '/';
            } catch (error) {
                console.error('OAuth callback error:', error);
                alert('Authentication failed: ' + error.message);
                window.location.href = '/login';
            }
        })();
    </script>
</head>
<body>
    <p>Signing you in...</p>
</body>
</html>`, string(payloadJSON))

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(redirectHTML))
	}
}

func getOAuthUserInfo(ctx context.Context, provider string, token *oauth2.Token) (*oauthUserInfo, error) {
	client := oauth2.NewClient(ctx, oauth2.StaticTokenSource(token))

	var userInfoURL string
	switch provider {
	case "google":
		userInfoURL = googleUserInfoURL
	case "facebook":
		userInfoURL = facebookUserInfoURL
	case "instagram":
		// Instagram now uses Facebook Graph API
		userInfoURL = facebookUserInfoURL
	case "apple":
		// Apple ID token is a JWT, need to decode it
		// For simplicity, we'll parse the id_token from the token response
		return parseAppleIDToken(token)
	default:
		return nil, fmt.Errorf("unknown provider: %s", provider)
	}

	resp, err := client.Get(userInfoURL)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get user info: status %d", resp.StatusCode)
	}

	var userInfo oauthUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed to decode user info: %w", err)
	}

	return &userInfo, nil
}

func parseAppleIDToken(token *oauth2.Token) (*oauthUserInfo, error) {
	// Apple returns user info in the id_token JWT
	// For a complete implementation, you should decode and verify the JWT
	// For now, we'll extract the "sub" (subject) claim which is the user ID
	idToken := token.Extra("id_token")
	if idToken == nil {
		return nil, errors.New("no id_token in Apple response")
	}

	// This is a simplified implementation
	// In production, you should properly decode and verify the JWT
	return &oauthUserInfo{
		ID:   fmt.Sprintf("%v", idToken),
		Name: "Apple User",
	}, nil
}

func findOrCreateOAuthUser(ds model.DataStore, ctx context.Context, provider string, userInfo *oauthUserInfo) (*model.User, error) {
	userRepo := ds.User(ctx)

	// Try to find existing user by OAuth ID
	var user *model.User
	var err error

	switch provider {
	case "google":
		user, err = userRepo.FindByGoogleID(userInfo.ID)
	case "apple":
		user, err = userRepo.FindByAppleID(userInfo.ID)
	case "instagram":
		user, err = userRepo.FindByInstagramID(userInfo.ID)
	case "facebook":
		user, err = userRepo.FindByFacebookID(userInfo.ID)
	default:
		return nil, fmt.Errorf("unknown provider: %s", provider)
	}

	if err == nil && user != nil {
		// User found, update last login
		_ = userRepo.UpdateLastLoginAt(user.ID)
		return user, nil
	}

	// User not found by OAuth ID, try to find by email
	if userInfo.Email != "" {
		user, err = userRepo.FindByUsername(userInfo.Email)
		if err == nil && user != nil {
			// User found by email, link OAuth ID
			switch provider {
			case "google":
				user.GoogleID = userInfo.ID
			case "apple":
				user.AppleID = userInfo.ID
			case "instagram":
				user.InstagramID = userInfo.ID
			case "facebook":
				user.FacebookID = userInfo.ID
			}
			_ = userRepo.Put(user)
			_ = userRepo.UpdateLastLoginAt(user.ID)
			return user, nil
		}
	}

	// User not found, create new user if auto-create is enabled
	if !conf.Server.OAuth.AutoCreateUser {
		return nil, errors.New("user not found and auto-create is disabled")
	}

	now := time.Now()
	caser := cases.Title(language.Und)

	// Generate username from email or name
	username := userInfo.Email
	if username == "" {
		username = userInfo.Username
	}
	if username == "" {
		username = userInfo.Name
	}
	if username == "" {
		username = fmt.Sprintf("%s_user_%s", provider, userInfo.ID)
	}

	newUser := model.User{
		ID:          id.NewRandom(),
		UserName:    username,
		Name:        caser.String(userInfo.Name),
		Email:       userInfo.Email,
		NewPassword: "", // No password for OAuth users
		IsAdmin:     conf.Server.OAuth.AutoCreateUserAdmin,
		LastLoginAt: &now,
	}

	// Set OAuth ID
	switch provider {
	case "google":
		newUser.GoogleID = userInfo.ID
	case "apple":
		newUser.AppleID = userInfo.ID
	case "instagram":
		newUser.InstagramID = userInfo.ID
	case "facebook":
		newUser.FacebookID = userInfo.ID
	}

	err = userRepo.Put(&newUser)
	if err != nil {
		log.Error(ctx, "Could not create OAuth user", "user", newUser, err)
		return nil, err
	}

	log.Info(ctx, "New OAuth user created", "username", username, "provider", provider)
	return &newUser, nil
}
