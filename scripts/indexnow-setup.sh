#!/usr/bin/env bash
# IndexNow setup — generate key, add to .env, restart Navidrome, verify key endpoint,
# then ping all sub-sitemaps to seed Bing/Yandex/Seznam with the entire catalogue.
#
# Run on the server (where docker-compose lives), or change ENV_FILE/COMPOSE_CMD.
#
# Usage:
#   bash scripts/indexnow-setup.sh                    # full setup
#   bash scripts/indexnow-setup.sh --ping-only         # skip key generation, ping sitemaps

set -euo pipefail

ENV_FILE="${ENV_FILE:-/opt/navidrome/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-/opt/navidrome/docker-compose.qirim-online.yml}"
HOST="${HOST:-qirim.online}"
SITEMAPS=(
    "https://$HOST/sitemap-artists.xml"
    "https://$HOST/sitemap-albums.xml"
    "https://$HOST/sitemap-playlists.xml"
    "https://$HOST/sitemap-songs.xml"
    "https://$HOST/sitemap-clips.xml"
)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PING_SCRIPT="$SCRIPT_DIR/indexnow-ping.sh"

PING_ONLY=0
if [[ "${1:-}" == "--ping-only" ]]; then
    PING_ONLY=1
fi

if [[ $PING_ONLY -eq 0 ]]; then
    if [[ ! -f "$ENV_FILE" ]]; then
        echo "ERROR: $ENV_FILE not found. Set ENV_FILE=/path/to/.env" >&2
        exit 1
    fi

    if grep -q "^ND_INDEXNOWKEY=" "$ENV_FILE"; then
        existing=$(grep "^ND_INDEXNOWKEY=" "$ENV_FILE" | cut -d= -f2)
        echo "Key already present in $ENV_FILE: $existing"
        echo "Skipping generation. Use --ping-only to skip this step entirely."
        KEY="$existing"
    else
        KEY=$(openssl rand -hex 16)
        echo "Generated key: $KEY"
        echo "ND_INDEXNOWKEY=$KEY" >> "$ENV_FILE"
        echo "Appended ND_INDEXNOWKEY to $ENV_FILE"

        echo "Restarting Navidrome container so it picks up the key..."
        docker compose -f "$COMPOSE_FILE" restart navidrome
        echo "Waiting 10s for Navidrome to come up..."
        sleep 10
    fi

    echo "Verifying key-file is reachable at https://$HOST/$KEY.txt ..."
    served=$(curl -fsSL "https://$HOST/$KEY.txt" || true)
    if [[ "$served" == "$KEY" ]]; then
        echo "OK — IndexNow key-file is live"
    else
        echo "ERROR — key file at https://$HOST/$KEY.txt did not return the expected key" >&2
        echo "Got: '$served'" >&2
        exit 1
    fi
fi

# Load key for --ping-only mode
if [[ -z "${KEY:-}" ]]; then
    if [[ -f "$ENV_FILE" ]] && grep -q "^ND_INDEXNOWKEY=" "$ENV_FILE"; then
        KEY=$(grep "^ND_INDEXNOWKEY=" "$ENV_FILE" | cut -d= -f2)
    else
        echo "ERROR: ND_INDEXNOWKEY not set and not in $ENV_FILE" >&2
        exit 1
    fi
fi

export INDEXNOW_KEY="$KEY"
export INDEXNOW_HOST="$HOST"

for sm in "${SITEMAPS[@]}"; do
    echo ""
    echo "==> Pinging URLs from $sm"
    if ! bash "$PING_SCRIPT" --from-sitemap "$sm"; then
        echo "WARN: ping failed for $sm (continuing)"
    fi
    # Stay friendly — IndexNow doesn't rate-limit hard but spacing is polite
    sleep 2
done

echo ""
echo "All done. Bing/Yandex/Seznam now know about every URL in your sitemaps."
echo "Re-run with --ping-only after publishing new content to push updates."
