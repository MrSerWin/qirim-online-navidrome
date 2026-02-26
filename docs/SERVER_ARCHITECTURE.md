# Server Architecture

## Overview

All services run on a single server `93.127.197.163`. Nginx runs **on the host** (not in Docker) and proxies to Docker containers via modular per-site configs.

## Network Architecture

```
Internet
  │
  ├── :80  → Nginx (host) → redirect to HTTPS / ACME challenges
  ├── :443 → Nginx (host) → proxy to services below
  │
  ├── qirim.online         → 127.0.0.1:4533  (Navidrome)
  ├── mail.qirim.online    → 172.22.1.10:443  (Mailcow nginx container)
  ├── sevil.chat            → 127.0.0.1:8000  (Django) + 127.0.0.1:3000 (Next.js)
  ├── ana-yurt.dev          → /opt/share-app/website/ (static landing page)
  ├── shareapp.ana-yurt.dev → 127.0.0.1:3001  (Share App Next.js)
  └── qirim.cloud           → placeholder (503 Coming soon)
```

## Critical: Nginx runs on HOST, not in Docker

**This is the most important thing to remember.**

- Nginx is installed via apt on the host: `systemctl status nginx`
- Config structure: modular `conf.d/*.conf` files (not one monolithic file)
- **You CANNOT use Docker container names** (like `navidrome`, `sevil-backend`) in nginx config — they won't resolve
- Always use `127.0.0.1:<port>` for containers with exposed ports, or Docker IP for others

### Nginx config protection

The nginx package is held from apt upgrades to prevent config overwrite:

```bash
echo "nginx hold" | dpkg --set-selections
```

To check: `dpkg --get-selections | grep nginx`

## Modular Nginx Configuration

```
/etc/nginx/
├── nginx.conf                  ← minimal (~25 lines): events + http + include conf.d/*.conf
├── snippets/
│   ├── ssl-params.conf         ← shared SSL settings (TLSv1.2+1.3, ciphers, session)
│   ├── security-headers.conf   ← shared headers (HSTS, X-Frame, nosniff)
│   └── proxy-params.conf       ← shared proxy headers (Host, X-Real-IP, X-Forwarded-*)
└── conf.d/
    ├── 00-common.conf          ← gzip, websocket map, map_hash_bucket_size, client_max_body_size
    ├── 10-qirim-online.conf    ← Navidrome + URL redirect map (~440 lines)
    ├── 20-mail-qirim.conf      ← Mailcow mail server
    ├── 30-sevil-chat.conf      ← Sevil AI Hub (Django + Next.js)
    ├── 40-qirim-cloud.conf     ← Placeholder (HTTP only until cert obtained)
    ├── 50-ana-yurt-dev.conf    ← Static landing page
    └── 60-shareapp.conf        ← Share App API + dashboard
```

### File Ownership by Repo

| Repo | Files it manages |
|------|-----------------|
| navidrome | nginx.conf, snippets/*, 00-common.conf, 10-qirim-online.conf, 20-mail-qirim.conf, 40-qirim-cloud.conf |
| sevil-ai-hub | 30-sevil-chat.conf |
| share-app | 50-ana-yurt-dev.conf, 60-shareapp.conf |

### If nginx config gets corrupted

```bash
# Copy all configs from repo
cp /opt/navidrome/nginx/nginx.conf /etc/nginx/nginx.conf
cp /opt/navidrome/nginx/snippets/* /etc/nginx/snippets/
cp /opt/navidrome/nginx/conf.d/* /etc/nginx/conf.d/
cp /opt/sevil-ai-hub/nginx/conf.d/* /etc/nginx/conf.d/
cp /opt/share-app/nginx/conf.d/* /etc/nginx/conf.d/
nginx -t && systemctl restart nginx
```

## Services and Their Addresses

### 1. Navidrome (qirim.online)

| Property | Value |
|----------|-------|
| Docker compose | `/opt/navidrome/docker-compose.qirim-online.yml` |
| Container name | `navidrome-qo-prod` |
| Host port | `127.0.0.1:4533 → 4533` |
| Nginx config | `10-qirim-online.conf` |
| Nginx proxy_pass | `http://127.0.0.1:4533` |
| Data volume | `/opt/navidrome/data` |
| DB path | `/opt/navidrome/data/navidrome.db` |

### 2. Mailcow (mail.qirim.online)

| Property | Value |
|----------|-------|
| Docker compose | `/opt/mailcow-dockerized/docker-compose.yml` |
| Container name | `mailcowdockerized-nginx-mailcow-1` |
| **Fixed Docker IP** | `172.22.1.10` (via docker-compose.override.yml) |
| Nginx config | `20-mail-qirim.conf` |
| Nginx proxy_pass | `https://172.22.1.10:443` |
| Network | `mailcow-network` (subnet 172.22.1.0/24) |

**Why Docker IP instead of 127.0.0.1?**
Docker-proxy for Mailcow ports (8443, 8080) doesn't work correctly — `curl https://127.0.0.1:8443` returns 000.
The IP is fixed via `/opt/mailcow-dockerized/docker-compose.override.yml`:

```yaml
services:
  nginx-mailcow:
    networks:
      mailcow-network:
        ipv4_address: 172.22.1.10
```

### 3. Sevil AI Hub (sevil.chat)

| Property | Value |
|----------|-------|
| Docker compose | `/opt/sevil-ai-hub/docker/docker-compose.sevil.chat.yml` |
| Backend container | `sevil-backend` |
| Frontend container | `sevil-frontend` |
| Backend host port | `127.0.0.1:8000 → 8000` (Django) |
| Frontend host port | `127.0.0.1:3000 → 3000` (Next.js) |
| Nginx config | `30-sevil-chat.conf` |
| Nginx proxy_pass | `/api/` → `http://127.0.0.1:8000`, `/` → `http://127.0.0.1:3000` |

### 4. Share App (ana-yurt.dev + shareapp.ana-yurt.dev)

| Property | Value |
|----------|-------|
| Docker compose | `/opt/share-app/docker-compose.yml` |
| Server container | `share-app-server` |
| Server host port | `127.0.0.1:3001 → 3001` (Next.js) |
| Landing page | Static files at `/opt/share-app/website/` |
| Nginx configs | `50-ana-yurt-dev.conf` + `60-shareapp.conf` |
| **Status** | HTTPS blocks commented out until DNS set and certs obtained |

### 5. qirim.cloud (placeholder)

| Property | Value |
|----------|-------|
| Nginx config | `40-qirim-cloud.conf` |
| **Status** | HTTP only (ACME challenge ready), HTTPS commented out until cert obtained |

### Removed

- **ana-yurt.com** — completely removed (was proxy to hostiq.ua)
- **Xray VPN** — removed from nginx and docker-compose

## SSL Certificates

### Current certificates

| Domain | Status | Notes |
|--------|--------|-------|
| qirim.online | Active | Auto-renewed |
| mail.qirim.online | Active | Auto-renewed |
| sevil.chat | Active | Auto-renewed |
| ana-yurt.dev | Pending | Obtain after DNS points to 93.127.197.163 |
| shareapp.ana-yurt.dev | Pending | Obtain after DNS points to 93.127.197.163 |
| qirim.cloud | Pending | Obtain after DNS points to 93.127.197.163 |

### Check certificate expiry
```bash
for domain in qirim.online mail.qirim.online sevil.chat; do
  expiry=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$domain/cert.pem" 2>/dev/null | cut -d= -f2)
  echo "$domain: $expiry"
done
```

### Obtaining new certificates
```bash
# Example for ana-yurt.dev (HTTP server block must be active first)
certbot certonly --webroot -w /var/www/certbot -d ana-yurt.dev -d www.ana-yurt.dev
# Then uncomment HTTPS block in 50-ana-yurt-dev.conf and reload nginx
```

### Auto-renewal

Certificates are renewed automatically via cron:
```
0 3 * * * /opt/navidrome/scripts/renew-certs.sh >> /var/log/ssl-renew.log 2>&1
```

The script (`/opt/navidrome/scripts/renew-certs.sh`):
1. Runs `certbot renew`
2. Runs `nginx -t && systemctl reload nginx` (on **host**, not in Docker)
3. Logs certificate expiry dates

## Disaster Recovery

### Site is down — quick checklist

1. **Check nginx:**
   ```bash
   systemctl status nginx
   nginx -t
   ```

2. **If nginx config is broken/default:**
   ```bash
   # Restore all from repos
   cp /opt/navidrome/nginx/nginx.conf /etc/nginx/nginx.conf
   cp /opt/navidrome/nginx/snippets/* /etc/nginx/snippets/
   cp /opt/navidrome/nginx/conf.d/* /etc/nginx/conf.d/
   cp /opt/sevil-ai-hub/nginx/conf.d/* /etc/nginx/conf.d/
   cp /opt/share-app/nginx/conf.d/* /etc/nginx/conf.d/
   nginx -t && systemctl restart nginx
   ```

3. **Check containers:**
   ```bash
   cd /opt/navidrome && docker compose -f docker-compose.qirim-online.yml ps
   cd /opt/sevil-ai-hub/docker && docker compose -f docker-compose.sevil.chat.yml ps
   cd /opt/mailcow-dockerized && docker compose ps
   cd /opt/share-app && docker compose ps
   ```

4. **Check if ports are accessible:**
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4533    # Navidrome
   curl -sk -o /dev/null -w "%{http_code}" https://172.22.1.10:443  # Mailcow
   curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000     # Sevil backend
   curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000     # Sevil frontend
   curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001     # Share App
   ```

5. **Check HTTPS from outside:**
   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://qirim.online
   curl -s -o /dev/null -w "%{http_code}" https://mail.qirim.online
   curl -s -o /dev/null -w "%{http_code}" https://sevil.chat
   ```

### Common issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| HTTPS returns 000 | Nginx not listening on 443 | Restore nginx config (see above) |
| 502 Bad Gateway | Backend container down or wrong proxy_pass | Check container, check proxy_pass address |
| Nginx won't start: "host not found in upstream" | Docker container name in config | Replace with 127.0.0.1:port or Docker IP |
| Nginx won't start: "cannot load certificate" | Missing SSL cert for a domain | Comment out that server block or run certbot |
| Mailcow 502 | Docker IP changed | Check IP: `docker inspect mailcowdockerized-nginx-mailcow-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'` |

## Important file locations

| File | Purpose |
|------|---------|
| `/etc/nginx/nginx.conf` | Base nginx config (minimal, includes conf.d/) |
| `/etc/nginx/snippets/` | Shared SSL, security headers, proxy params |
| `/etc/nginx/conf.d/` | Per-site configs (numbered for load order) |
| `/opt/mailcow-dockerized/docker-compose.override.yml` | Fixed IP for Mailcow nginx |
| `/opt/navidrome/scripts/renew-certs.sh` | SSL certificate renewal + nginx reload |
| `/var/log/ssl-renew.log` | Certificate renewal log |
| `/opt/navidrome/data/navidrome.db` | Navidrome SQLite database |

## After any nginx config change

Always:
1. Test: `nginx -t`
2. Reload: `systemctl reload nginx`

## Deployment to Server

Each project copies its nginx configs independently:

```bash
# Navidrome (base + qirim.online + mail + qirim.cloud)
scp nginx/nginx.conf root@93.127.197.163:/etc/nginx/nginx.conf
scp nginx/snippets/* root@93.127.197.163:/etc/nginx/snippets/
scp nginx/conf.d/* root@93.127.197.163:/etc/nginx/conf.d/

# Sevil AI Hub
scp nginx/conf.d/30-sevil-chat.conf root@93.127.197.163:/etc/nginx/conf.d/

# Share App
scp nginx/conf.d/50-ana-yurt-dev.conf nginx/conf.d/60-shareapp.conf root@93.127.197.163:/etc/nginx/conf.d/
```

Then on server: `nginx -t && systemctl reload nginx`
