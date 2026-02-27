# Site Management Scripts

Scripts for managing nginx reverse proxy sites with automatic SSL on VPS 93.127.197.163.

## Prerequisites

- DNS A-record for your domain pointing to the server
- Backend service running (Docker container, Node app, etc.)
- Root access on the server

## Add a Site

```bash
bash /opt/navidrome/scripts/add-site.sh <domain> <backend> [options]
```

**Arguments:**
| Argument | Description | Example |
|----------|-------------|---------|
| `domain` | Domain name | `blog.qirim.online` |
| `backend` | Backend address | `localhost:3000` |

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--prefix N` | Nginx config file prefix (controls load order) | `50` |
| `--websocket` | Enable WebSocket proxy support | off |

**Examples:**
```bash
# Simple web app
bash /opt/navidrome/scripts/add-site.sh blog.qirim.online localhost:4000

# App with WebSocket (chat, terminal, live updates)
bash /opt/navidrome/scripts/add-site.sh app.qirim.online localhost:3000 --websocket

# API with custom prefix
bash /opt/navidrome/scripts/add-site.sh api.qirim.online localhost:8080 --prefix 30
```

**What it does automatically:**
1. Checks DNS A-record points to this server
2. Checks backend is reachable
3. Creates temporary HTTP nginx config
4. Obtains SSL certificate via Let's Encrypt (certbot)
5. Deploys full HTTPS reverse proxy config with shared snippets
6. Adds domain to `renew-certs.sh` for auto-renewal
7. Verifies site responds

**Generated files:**
- Nginx config: `/etc/nginx/conf.d/<prefix>-<domain>.conf`
- Access log: `/var/log/nginx/<domain>.access.log`
- Error log: `/var/log/nginx/<domain>.error.log`
- SSL cert: `/etc/letsencrypt/live/<domain>/`

## Remove a Site

```bash
bash /opt/navidrome/scripts/remove-site.sh <domain>
```

Removes nginx config, log files, and optionally the SSL certificate.

```bash
bash /opt/navidrome/scripts/remove-site.sh blog.qirim.online
```

## List All Sites

```bash
bash /opt/navidrome/scripts/list-sites.sh
```

Shows a table of all sites with domain, backend, config file, and SSL expiry days.

## Config File Prefix Convention

Existing sites on the server use numbered prefixes for nginx load order:

| Prefix | Site | Backend |
|--------|------|---------|
| `00` | Common settings (gzip, websocket map) | — |
| `05` | admin.qirim.online (Portainer) | 127.0.0.1:9000 |
| `10` | qirim.online (Navidrome) | 127.0.0.1:4533 |
| `20` | mail.qirim.online (Mailcow) | 172.22.1.10:443 |
| `40` | qirim.cloud | — |
| `50+` | New sites added via `add-site.sh` | — |

## Typical Workflow: Deploy a New Docker App

```bash
# 1. Start your app container on the server
docker run -d --name myapp --restart=always -p 127.0.0.1:3000:3000 myapp:latest

# 2. Add the site (creates nginx config + SSL)
bash /opt/navidrome/scripts/add-site.sh myapp.qirim.online localhost:3000

# 3. Verify
curl -I https://myapp.qirim.online
```

## Troubleshooting

**502 Bad Gateway** — backend is not running or wrong port:
```bash
# Check if backend is listening
ss -tlnp | grep <port>

# Check nginx error log
tail -20 /var/log/nginx/<domain>.error.log
```

**SSL certificate error** — DNS not pointing to server or certbot failed:
```bash
# Check DNS
dig +short <domain> A

# Re-run certbot manually
certbot certonly --webroot -w /var/www/certbot -d <domain>
```

**Config conflict** — another config already handles this domain:
```bash
# Find which config handles the domain
grep -r "server_name.*<domain>" /etc/nginx/conf.d/
```
