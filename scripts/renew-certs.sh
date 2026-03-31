#!/bin/bash
# ============================================================
# SSL Certificate Renewal for all domains on VPS 93.127.197.163
# Runs via cron, uses host nginx (not Docker)
#
# Crontab:
#   0 3 * * * /opt/navidrome/scripts/renew-certs.sh >> /var/log/ssl-renew.log 2>&1
#
# Replaces: ssl-auto-renew.sh, sync-ssl-certs.sh
# ============================================================

set -euo pipefail

LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

# All domains managed on this server
DOMAINS=(
    "qirim.online"
    "mail.qirim.online"
    "sevil.chat"
    "admin.qirim.online"
    "ana-yurt.dev"
    "shareapp.ana-yurt.dev"
    "qirim.cloud"
    "fileflip.ana-yurt.dev"
    "toponims.ana-yurt.com"
)

echo "$LOG_PREFIX Starting certificate renewal check..."

# Renew all certs (certbot only renews those expiring within 30 days)
certbot renew --quiet --deploy-hook "nginx -t && systemctl reload nginx"
RENEW_STATUS=$?

if [ $RENEW_STATUS -eq 0 ]; then
    echo "$LOG_PREFIX Certbot renew completed successfully"
else
    echo "$LOG_PREFIX ERROR: certbot renew failed with status $RENEW_STATUS"
fi

# Check certificate expiry dates
echo "$LOG_PREFIX Certificate expiry check:"
for domain in "${DOMAINS[@]}"; do
    CERT_FILE="/etc/letsencrypt/live/$domain/fullchain.pem"
    if [ -f "$CERT_FILE" ]; then
        EXPIRY=$(openssl x509 -noout -enddate -in "$CERT_FILE" 2>/dev/null | cut -d= -f2)
        DAYS_LEFT=$(( ($(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s 2>/dev/null) - $(date +%s)) / 86400 ))
        if [ "$DAYS_LEFT" -lt 14 ]; then
            echo "$LOG_PREFIX  WARNING: $domain expires in ${DAYS_LEFT} days ($EXPIRY)"
        else
            echo "$LOG_PREFIX  OK: $domain expires in ${DAYS_LEFT} days ($EXPIRY)"
        fi
    else
        echo "$LOG_PREFIX  SKIP: $domain - no certificate found"
    fi
done

# Sync certbot certs to Mailcow (IMAP/SMTP use Mailcow's own cert path)
MAILCOW_SSL="/opt/mailcow-dockerized/data/assets/ssl"
CERTBOT_MAIL="/etc/letsencrypt/live/mail.qirim.online"
if [ -f "$CERTBOT_MAIL/fullchain.pem" ] && [ -f "$CERTBOT_MAIL/privkey.pem" ]; then
    # Check if certbot cert is newer than Mailcow cert
    if [ "$CERTBOT_MAIL/fullchain.pem" -nt "$MAILCOW_SSL/cert.pem" ] 2>/dev/null; then
        cp "$CERTBOT_MAIL/fullchain.pem" "$MAILCOW_SSL/cert.pem"
        cp "$CERTBOT_MAIL/privkey.pem" "$MAILCOW_SSL/key.pem"
        cp "$CERTBOT_MAIL/fullchain.pem" "$MAILCOW_SSL/mail.qirim.online/cert.pem"
        cp "$CERTBOT_MAIL/privkey.pem" "$MAILCOW_SSL/mail.qirim.online/key.pem"
        cd /opt/mailcow-dockerized && docker compose restart dovecot-mailcow postfix-mailcow
        echo "$LOG_PREFIX Synced certbot cert to Mailcow and restarted IMAP/SMTP"
    else
        echo "$LOG_PREFIX Mailcow cert is up to date"
    fi
else
    echo "$LOG_PREFIX WARNING: certbot cert for mail.qirim.online not found"
fi

echo "$LOG_PREFIX Done."
