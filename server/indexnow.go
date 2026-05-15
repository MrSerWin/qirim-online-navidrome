package server

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/navidrome/navidrome/conf"
	"github.com/navidrome/navidrome/log"
)

// indexNowKeyHandler serves the IndexNow ownership-verification key file at /{key}.txt.
// Search engines (Bing, Yandex, Seznam) fetch this URL to confirm we own the host before
// accepting URL submissions.
func indexNowKeyHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := conf.Server.IndexNowKey
		if key == "" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Header().Set("Cache-Control", "public, max-age=86400")
		_, _ = w.Write([]byte(key))
	}
}

// indexNowEndpoint returns the on-disk path the IndexNow key file is exposed at.
// Defaults to /{key}.txt at the site root, but the location can be customized via
// ND_INDEXNOWKEYLOCATION (e.g. /indexnow-key.txt) to keep the URL out of the key.
func indexNowKeyPath() string {
	if loc := conf.Server.IndexNowKeyLocation; loc != "" {
		if !strings.HasPrefix(loc, "/") {
			loc = "/" + loc
		}
		return loc
	}
	if k := conf.Server.IndexNowKey; k != "" {
		return "/" + k + ".txt"
	}
	return ""
}

// PingIndexNow submits up to 10000 URLs to the IndexNow protocol. Bing, Yandex,
// Seznam and others share the same endpoint. Returns nil on 200/202.
func PingIndexNow(ctx context.Context, urls []string) error {
	key := conf.Server.IndexNowKey
	if key == "" {
		return fmt.Errorf("IndexNow key not configured (ND_INDEXNOWKEY)")
	}
	if len(urls) == 0 {
		return nil
	}

	host := siteHost()
	if host == "" {
		return fmt.Errorf("cannot derive host from BaseURL")
	}

	keyLocation := ""
	if loc := indexNowKeyPath(); loc != "" {
		keyLocation = "https://" + host + loc
	}

	payload := map[string]any{
		"host":        host,
		"key":         key,
		"keyLocation": keyLocation,
		"urlList":     urls,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.indexnow.org/IndexNow", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json; charset=utf-8")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("indexnow returned %d: %s", resp.StatusCode, string(b))
	}
	log.Info(ctx, "IndexNow submission accepted", "urls", len(urls), "host", host)
	return nil
}

func siteHost() string {
	base := conf.Server.BaseURL
	if base == "" {
		base = "https://qirim.online"
	}
	u, err := url.Parse(base)
	if err != nil {
		return ""
	}
	return u.Host
}
