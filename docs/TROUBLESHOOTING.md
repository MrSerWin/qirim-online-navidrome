# Troubleshooting Guide

## Common Issues and Solutions

### Database "read-only" Error (SQLite)

**Symptoms:**
- Container crashes with: `Error applying PRAGMA optimize" error="attempt to write a readonly database"`
- Navidrome fails to start in restart loop
- 502 Bad Gateway error on website

**Root Cause:**
The Navidrome process inside the Docker container runs as a non-root user, but the mounted volume `/opt/navidrome/data` has restrictive permissions that prevent writing to the SQLite database.

**Solution:**
1. Add `user: "0:0"` to the navidrome service in docker-compose.qirim-online.yml:
   ```yaml
   navidrome:
     container_name: navidrome-qo-prod
     platform: linux/amd64
     user: "0:0"  # Run as root inside container
     restart: unless-stopped
   ```

2. Set proper permissions on the data directory:
   ```bash
   chmod -R 755 /opt/navidrome/data
   chmod 644 /opt/navidrome/data/navidrome.db*
   ```

3. Restart the container:
   ```bash
   cd /opt/navidrome
   docker compose -f docker-compose.qirim-online.yml down
   docker compose -f docker-compose.qirim-online.yml up -d
   ```

**Prevention:**
- Always include `user: "0:0"` in docker-compose for services that need to write to mounted volumes
- Never use `chmod 777` - use 755 for directories and 644 for files
- Regularly backup the database before major changes

---

### Nginx Cannot Connect to Mailcow

**Symptoms:**
- Nginx container in restart loop
- Error: `host not found in upstream "mailcowdockerized-nginx-mailcow-1"`

**Root Cause:**
Nginx container is not connected to the mailcow Docker network, so it cannot resolve mailcow container names.

**Solution:**
Add mailcow network to docker-compose.qirim-online.yml:

```yaml
networks:
  navidrome-net:
    driver: bridge
  mailcow-network:
    external: true
    name: mailcowdockerized_mailcow-network

services:
  nginx:
    networks:
      - navidrome-net
      - mailcow-network
```

**Prevention:**
- Document all network dependencies
- Use health checks to verify cross-container connectivity

---

### File System Read-Only After Server Issues

**Symptoms:**
- `mkdir: read-only file system`
- File system unexpectedly mounted as read-only

**Root Cause:**
Kernel automatically remounts filesystem as read-only when it detects disk errors or filesystem corruption.

**Solution:**
```bash
# Remount as read-write
mount -o remount,rw /

# Check filesystem errors
dmesg | tail -50

# Check disk health
df -h
```

**Prevention:**
- Monitor disk health regularly
- Set up proper monitoring/alerting
- Keep backups of critical data

---

## Quick Recovery Checklist

When deployment fails:

1. **Check container status:**
   ```bash
   cd /opt/navidrome
   docker compose -f docker-compose.qirim-online.yml ps
   ```

2. **Check logs:**
   ```bash
   docker compose -f docker-compose.qirim-online.yml logs navidrome
   docker compose -f docker-compose.qirim-online.yml logs nginx
   ```

3. **Verify filesystem:**
   ```bash
   mount | grep /opt
   df -h
   ```

4. **Check permissions:**
   ```bash
   ls -la /opt/navidrome/data/
   ```

5. **Verify network connectivity:**
   ```bash
   docker network ls
   docker ps | grep mailcow
   ```

6. **Test local connectivity:**
   ```bash
   curl -I http://localhost:4533/ping
   ```

---

## Backup and Restore

### Database Backup
```bash
# Backup database
cp /opt/navidrome/data/navidrome.db /opt/navidrome/data/backups/navidrome-$(date +%Y%m%d-%H%M%S).db

# Automated backup (add to cron)
0 2 * * * cp /opt/navidrome/data/navidrome.db /opt/navidrome/data/backups/navidrome-$(date +\%Y\%m\%d).db && find /opt/navidrome/data/backups -name "navidrome-*.db" -mtime +7 -delete
```

### Full Data Backup
```bash
# Backup entire data directory
tar -czf /backup/navidrome-data-$(date +%Y%m%d).tar.gz /opt/navidrome/data/
```

### Restore
```bash
# Stop container
docker compose -f docker-compose.qirim-online.yml down

# Restore database
cp /opt/navidrome/data/backups/navidrome-YYYYMMDD.db /opt/navidrome/data/navidrome.db

# Fix permissions
chmod 644 /opt/navidrome/data/navidrome.db

# Start container
docker compose -f docker-compose.qirim-online.yml up -d
```
