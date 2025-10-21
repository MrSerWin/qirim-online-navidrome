#!/bin/bash

# Navidrome Health Check Script
# Usage: ./health-check.sh

set -e

COMPOSE_FILE="/opt/navidrome/docker-compose.qirim-online.yml"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== Navidrome Health Check ==="
echo ""

# 1. Check if containers are running
echo "1. Checking container status..."
CONTAINERS=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null || echo "[]")

if echo "$CONTAINERS" | grep -q "navidrome-qo-prod"; then
    STATUS=$(docker compose -f "$COMPOSE_FILE" ps | grep navidrome-qo-prod | awk '{print $6}')
    if [[ "$STATUS" == "Up" ]] || [[ "$STATUS" == "healthy" ]]; then
        echo -e "${GREEN}✓${NC} Navidrome container is running"
    else
        echo -e "${RED}✗${NC} Navidrome container status: $STATUS"
    fi
else
    echo -e "${RED}✗${NC} Navidrome container is not running"
fi

# 2. Check filesystem
echo ""
echo "2. Checking filesystem..."
if mount | grep -q "/ .*rw"; then
    echo -e "${GREEN}✓${NC} Filesystem is read-write"
else
    echo -e "${RED}✗${NC} Filesystem might be read-only!"
    mount | grep " / "
fi

# 3. Check disk space
echo ""
echo "3. Checking disk space..."
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✓${NC} Disk usage: $DISK_USAGE%"
elif [ "$DISK_USAGE" -lt 90 ]; then
    echo -e "${YELLOW}!${NC} Disk usage: $DISK_USAGE% (warning)"
else
    echo -e "${RED}✗${NC} Disk usage: $DISK_USAGE% (critical)"
fi

# 4. Check data directory permissions
echo ""
echo "4. Checking data directory permissions..."
DATA_PERMS=$(stat -c "%a" /opt/navidrome/data 2>/dev/null || stat -f "%Lp" /opt/navidrome/data)
if [ "$DATA_PERMS" == "755" ] || [ "$DATA_PERMS" == "777" ]; then
    echo -e "${GREEN}✓${NC} Data directory permissions: $DATA_PERMS"
else
    echo -e "${YELLOW}!${NC} Data directory permissions: $DATA_PERMS (expected 755)"
fi

# 5. Check database file
echo ""
echo "5. Checking database..."
if [ -f /opt/navidrome/data/navidrome.db ]; then
    DB_SIZE=$(du -h /opt/navidrome/data/navidrome.db | cut -f1)
    echo -e "${GREEN}✓${NC} Database exists: $DB_SIZE"

    # Check if database is writable
    if [ -w /opt/navidrome/data/navidrome.db ]; then
        echo -e "${GREEN}✓${NC} Database is writable"
    else
        echo -e "${RED}✗${NC} Database is not writable!"
    fi
else
    echo -e "${RED}✗${NC} Database file not found"
fi

# 6. Check HTTP endpoint
echo ""
echo "6. Checking HTTP endpoint..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:4533/ping | grep -q "200"; then
    echo -e "${GREEN}✓${NC} Navidrome HTTP endpoint is responding"
else
    echo -e "${RED}✗${NC} Navidrome HTTP endpoint is not responding"
fi

# 7. Check HTTPS endpoint
echo ""
echo "7. Checking HTTPS endpoint..."
if curl -s -k -o /dev/null -w "%{http_code}" https://qirim.online | grep -q "200"; then
    echo -e "${GREEN}✓${NC} HTTPS endpoint is responding"
else
    echo -e "${RED}✗${NC} HTTPS endpoint is not responding"
fi

# 8. Check mailcow connectivity
echo ""
echo "8. Checking mailcow connectivity..."
if docker ps | grep -q "mailcowdockerized-nginx-mailcow-1"; then
    echo -e "${GREEN}✓${NC} Mailcow is running"

    # Check if nginx can reach mailcow
    if docker network inspect mailcowdockerized_mailcow-network | grep -q "navidrome-nginx-prod"; then
        echo -e "${GREEN}✓${NC} Nginx is connected to mailcow network"
    else
        echo -e "${YELLOW}!${NC} Nginx might not be connected to mailcow network"
    fi
else
    echo -e "${YELLOW}!${NC} Mailcow is not running"
fi

# 9. Check recent logs for errors
echo ""
echo "9. Checking recent logs for errors..."
ERROR_COUNT=$(docker compose -f "$COMPOSE_FILE" logs --tail=100 navidrome 2>/dev/null | grep -i "error\|panic\|fatal" | wc -l | tr -d ' ')
if [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No errors in recent logs"
else
    echo -e "${YELLOW}!${NC} Found $ERROR_COUNT error(s) in recent logs"
    docker compose -f "$COMPOSE_FILE" logs --tail=100 navidrome 2>/dev/null | grep -i "error\|panic\|fatal" | tail -3
fi

echo ""
echo "=== Health Check Complete ==="
