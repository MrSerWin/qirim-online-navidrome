#!/usr/bin/env bash
# IndexNow ping — submits URLs to Bing/Yandex/Seznam in one call.
#
# Usage:
#   INDEXNOW_KEY=xxxxx ./scripts/indexnow-ping.sh https://qirim.online/song/abc https://qirim.online/album/def
#   ./scripts/indexnow-ping.sh --from-sitemap https://qirim.online/sitemap-songs.xml
#
# The same key must also be reachable at https://qirim.online/${INDEXNOW_KEY}.txt
# (handled automatically by Navidrome if ND_INDEXNOWKEY is set on the server).

set -euo pipefail

KEY="${INDEXNOW_KEY:-${ND_INDEXNOWKEY:-}}"
HOST="${INDEXNOW_HOST:-qirim.online}"
ENDPOINT="https://api.indexnow.org/IndexNow"

if [[ -z "$KEY" ]]; then
    echo "ERROR: set INDEXNOW_KEY env var" >&2
    exit 1
fi

URLS=()
if [[ "${1:-}" == "--from-sitemap" ]]; then
    SITEMAP_URL="${2:?Usage: --from-sitemap <sitemap-url>}"
    echo "Fetching URLs from $SITEMAP_URL..."
    # naive XML extraction — grep <loc>...</loc>
    while IFS= read -r url; do
        URLS+=("$url")
    done < <(curl -fsSL "$SITEMAP_URL" | grep -oE '<loc>[^<]+</loc>' | sed -E 's|</?loc>||g')
else
    URLS=("$@")
fi

if [[ ${#URLS[@]} -eq 0 ]]; then
    echo "ERROR: no URLs to submit" >&2
    exit 1
fi

# IndexNow allows max 10000 URLs per request
if [[ ${#URLS[@]} -gt 10000 ]]; then
    echo "WARN: capping at 10000 URLs (had ${#URLS[@]})"
    URLS=("${URLS[@]:0:10000}")
fi

# Build JSON array of URLs
URL_JSON=$(printf '"%s",' "${URLS[@]}" | sed 's/,$//')

PAYLOAD=$(cat <<EOF
{
  "host": "$HOST",
  "key": "$KEY",
  "keyLocation": "https://$HOST/$KEY.txt",
  "urlList": [$URL_JSON]
}
EOF
)

echo "Submitting ${#URLS[@]} URLs to IndexNow..."
HTTP_CODE=$(curl -sS -o /tmp/indexnow-resp.txt -w "%{http_code}" \
    -X POST "$ENDPOINT" \
    -H "Content-Type: application/json; charset=utf-8" \
    -d "$PAYLOAD")

echo "HTTP $HTTP_CODE"
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "202" ]]; then
    echo "OK"
else
    echo "FAIL response:"
    cat /tmp/indexnow-resp.txt
    exit 1
fi
