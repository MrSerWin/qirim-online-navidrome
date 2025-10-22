package nativeapi

import (
	"context"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
)

// URLAliasMiddleware resolves URL aliases to actual IDs
func (n *Router) URLAliasMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Process URL path parameters
		id := chi.URLParam(r, "id")
		if id != "" {
			// Get the resource type from the URL path
			path := r.URL.Path
			var resourceType string
			if strings.Contains(path, "/song/") {
				resourceType = "song"
			} else if strings.Contains(path, "/album/") {
				resourceType = "album"
			} else if strings.Contains(path, "/artist/") {
				resourceType = "artist"
			} else {
				// If no recognized resource type, continue
				next.ServeHTTP(w, r)
				return
			}

			// If ID looks like a UUID, it's already a real ID
			if len(id) == 36 && strings.Contains(id, "-") {
				// Process query parameters for non-UUID IDs
				n.processQueryParams(r)
				next.ServeHTTP(w, r)
				return
			}

			// Try to resolve alias to real ID
			realID, err := n.resolveAliasToID(r.Context(), id, resourceType)
			if err != nil {
				// If alias resolution fails, continue with original ID
				// This allows both alias and ID-based URLs to work
				next.ServeHTTP(w, r)
				return
			}

			// Replace the alias ID with the real ID in the URL
			chiCtx := chi.RouteContext(r.Context())
			if chiCtx != nil {
				for i, param := range chiCtx.URLParams.Keys {
					if param == "id" {
						chiCtx.URLParams.Values[i] = realID
						break
					}
				}
			}
		}

		// Process query parameters for aliases
		n.processQueryParams(r)

		next.ServeHTTP(w, r)
	})
}

// processQueryParams resolves aliases in query parameters
func (n *Router) processQueryParams(r *http.Request) {
	query := r.URL.Query()
	modified := false

	// Process album_id parameter
	if albumID := query.Get("album_id"); albumID != "" && !isUUID(albumID) {
		realID, err := n.resolveAliasToID(r.Context(), albumID, "album")
		if err == nil {
			query.Set("album_id", realID)
			modified = true
		}
	}

	// Process artist_id parameter
	if artistID := query.Get("artist_id"); artistID != "" && !isUUID(artistID) {
		realID, err := n.resolveAliasToID(r.Context(), artistID, "artist")
		if err == nil {
			query.Set("artist_id", realID)
			modified = true
		}
	}

	// Process song_id parameter
	if songID := query.Get("song_id"); songID != "" && !isUUID(songID) {
		realID, err := n.resolveAliasToID(r.Context(), songID, "song")
		if err == nil {
			query.Set("song_id", realID)
			modified = true
		}
	}

	// Update URL if modifications were made
	if modified {
		r.URL.RawQuery = query.Encode()
	}
}

// isUUID checks if a string looks like a UUID
func isUUID(s string) bool {
	return len(s) == 36 && strings.Contains(s, "-")
}

// resolveAliasToID resolves an alias to the actual ID
func (n *Router) resolveAliasToID(ctx context.Context, alias, resourceType string) (string, error) {
	switch resourceType {
	case "song":
		mediaFileRepo := n.ds.MediaFile(ctx)
		mediaFile, err := mediaFileRepo.FindByAlias(alias)
		if err != nil {
			return "", err
		}
		return mediaFile.ID, nil
	case "album":
		albumRepo := n.ds.Album(ctx)
		album, err := albumRepo.FindByAlias(alias)
		if err != nil {
			return "", err
		}
		return album.ID, nil
	case "artist":
		artistRepo := n.ds.Artist(ctx)
		artist, err := artistRepo.FindByAlias(alias)
		if err != nil {
			return "", err
		}
		return artist.ID, nil
	default:
		return "", nil
	}
}

