# Crimea IP Block — Diagnosis & Mitigation

**Status:** active issue · mitigation in progress (reverse proxy)
**First diagnosed:** 2026-06-17

## Summary

The production server IP `93.127.197.163` (Hostinger VPS, qirim.online) is
**blocked at the network level on Crimean ISP networks**. The site is fully
reachable everywhere else in the world, but users in Crimea cannot connect.

This is a *local Crimean provider block*, not a federal Roskomnadzor (RKN)
registry block — the domain/IP are **not** in the federal RKN registry. It
matches the documented "additional Crimean blocklist" that local providers
maintain on top of the Russia-wide list.

## Evidence (collected 2026-06-17)

Tested from a Windows machine on the affected Crimean network:

| Test | Command | Result | Meaning |
|------|---------|--------|---------|
| DNS resolution | `nslookup qirim.online` (Yandex 77.88.8.8 and Google 8.8.8.8) | ✅ resolves to `93.127.197.163` | No DNS poisoning |
| ICMP reachability | `ping -n 4 93.127.197.163` | ❌ 100% packet loss | Packets to the IP are dropped |
| TCP/TLS | `curl.exe -v --connect-timeout 15 https://qirim.online/` | ❌ `Trying 93.127.197.163:443... Connection timed out` (fails **before** TLS) | TCP never establishes |

For comparison, from outside Crimea (US):
- `ping 93.127.197.163` → ✅ ~45 ms, 0% loss
- `curl https://qirim.online/` → ✅ HTTP 200

**Conclusion:** The Crimean network null-routes `93.127.197.163` entirely (both
ICMP and TCP:443 dropped, regardless of domain/SNI). This is a **block by IP**,
not DNS poisoning and not DPI/SNI domain filtering.

> Note: A separate, unrelated **HTTP 502** outage was observed globally on the
> same day (navidrome backend container was down). That was fixed by restarting
> the container and is *not* part of this issue. Don't confuse the two: 502 =
> backend down (affects everyone); this issue = IP unreachable from Crimea only.

## How to re-verify

From an affected Crimean connection:

```powershell
# Windows
nslookup qirim.online
ping -n 4 93.127.197.163
curl.exe -v --connect-timeout 15 --max-time 20 https://qirim.online/ 2>&1
```

```bash
# Linux / Termux
nslookup qirim.online
ping -c 4 93.127.197.163
curl -v --connect-timeout 15 --max-time 20 https://qirim.online/ 2>&1 | head -40
```

Interpretation:
- DNS returns a wrong/empty IP → DNS poisoning (fix: change client DNS / DoH).
- `ping` fails → block by IP (fix: new IP / reverse proxy).
- `ping` ok but TLS resets at `Client hello` → DPI/SNI block (new IP won't help).

## Why some options were rejected

- **Hostinger data-center change** (free, gives a new IP) — rejected. On
  Hostinger this is a **full reinstall that permanently deletes all data**
  (incl. backups/snapshots), moves mailcow too (new IP → PTR/SPF reset + mail
  reputation warm-up), is limited to once per 30 days, and the new IP might land
  in the same blocked Crimean range. Maximum disruption, no guarantee.
- **Cloudflare** — rejected. Cloudflare IP ranges are themselves heavily
  blocked/throttled in Russia/Crimea; would likely make access worse.

## Chosen mitigation: reverse proxy on a fresh IP

Stand up a small VPS on a **different IP range** (one reachable from Crimea) and
run an L4 TCP pass-through proxy (`nginx stream`) that forwards raw ports 80/443
to the origin `93.127.197.163`. Point `qirim.online` A record at the proxy.

Why this design:
- **Origin untouched** — navidrome, mailcow, Xray, music, DB all stay put.
- **TLS pass-through** — Let's Encrypt certs stay on the origin; HTTPS,
  streaming WebSockets, and the Xray endpoint all pass through unchanged. No
  secrets/certs on the proxy.
- **Mail unaffected** — mailcow keeps the old IP and its existing PTR.
- **Rotatable** — if the proxy IP later gets blocked, replace only the cheap
  proxy (no 30-day limit, no data migration).

### Proxy box requirements
- 1 vCPU / 1 GB RAM / 10–20 GB disk (it only forwards packets).
- Ubuntu 22.04 / 24.04.
- **Unmetered or ≥2 TB/mo traffic** — all audio streams flow through it.
- Location near Crimea (RU/EU) for latency.
- IP range reachable from Crimea (the whole point).

### Provider candidates
- **Oracle Cloud Always Free** (chosen, in setup) — free forever. Use an
  **Always Free-eligible** shape (`VM.Standard.E2.1.Micro`, AMD 1 OCPU/1 GB) so
  it stays free after the 30-day trial. The trial does **not** auto-convert to
  paid; billing starts only on an explicit "Upgrade to Pay As You Go". Includes
  public IPv4 + 10 TB/mo egress.
- Cheap RU/CIS alternatives (highest Crimea reachability): vdsina, aeza, ruvds,
  timeweb (~150–300 ₽/mo).

### Rollout steps
1. Create the VPS → get **new public IP + root**.
2. **Verify reachability from Crimea first** (`ping <new_ip>`) before any config.
3. If reachable: install `nginx stream` pass-through (80/443 → 93.127.197.163).
4. Switch `qirim.online` A record to the new IP. Leave mail (mailcow) records on
   the old IP.
5. If the new IP gets blocked later: swap in another proxy IP; origin untouched.

## Proxy deployment (2026-06-17)

- **Provider:** Oracle Cloud Always Free, region eu-amsterdam-1.
- **Shape:** VM.Standard.E2.1.Micro (Always Free), Ubuntu 24.04.
- **Proxy public IP:** `141.148.239.103` (hostname `vnic-qo`).
- **SSH:** `ssh -i ~/.ssh/qo-proxy.key ubuntu@141.148.239.103` (key generated by OCI;
  copy off the exFAT drive and `chmod 600` or SSH ignores it).
- **VCN:** `qo-vcn` + `public subnet-qo-vcn`. Needed manual fixes during setup:
  - Route table was empty → added `0.0.0.0/0 → Internet Gateway`.
  - Security List ingress for 80/443 was first entered in **Source** Port Range by
    mistake (must be **Destination** Port Range).

### nginx config — L7 TLS-terminating reverse proxy (current)
Initial version was L4 `stream` pass-through, but it was slow: the proxy↔origin
RTT is **~140 ms** (origin is far from Amsterdam), and in pass-through every TLS
handshake round-trip traverses that link → TTFB ~1.1 s. Upgraded to an L7 reverse
proxy that terminates TLS at the proxy, keeps the SPA static bundle cached in
Amsterdam, and reuses keepalive connections to the origin. TTFB dropped to ~0.67 s
and cached assets skip the origin hop entirely.

- Proxy holds its **own** Let's Encrypt cert (`certbot certonly --webroot`, DNS
  already points here; renewal via webroot + `--deploy-hook "systemctl reload nginx"`).
- Config in `/etc/nginx/sites-available/qo.conf` (symlinked into `sites-enabled`):
  - `proxy_cache_path` keys_zone `qo_static`; `location /app/assets/` cached 30d
    (Vite build → content-hashed filenames; **note: assets live under `/app/assets/`,
    NOT `/app/static/`**).
  - `upstream qo_origin { server 93.127.197.163:443; keepalive 32; }`, talked to
    over TLS with SNI (`proxy_ssl_server_name on; proxy_ssl_name qirim.online;`).
  - `map $http_upgrade $connection_upgrade { default upgrade; '' ''; }` so both
    upstream keepalive AND WebSocket upgrade work.
  - `location /video_bridge_42` passes the Xray WS tunnel through (no cache, 1h
    timeouts).
  - `listen 443 ssl http2;` (Ubuntu 24.04 ships nginx 1.24 — use the `listen`
    form, not `http2 on;`).
- The old `stream {}` block was removed from `/etc/nginx/nginx.conf`
  (`sed -i '/^stream {/,/^}/d'`). Also `rm /etc/nginx/sites-enabled/default`.
- Package: `nginx libnginx-mod-stream` (stream no longer used, harmless), `certbot`.

### Firewall (TWO layers — both required on Oracle)
1. Ubuntu iptables (Oracle image rejects all but 22 by default):
   ```
   sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```
   ACCEPT rules must sit ABOVE the trailing `REJECT` rule (`-I` inserts at top).
2. OCI Security List ingress: `0.0.0.0/0` TCP **Destination** port 80 and 443.

### Verified working (2026-06-17, before DNS cutover)
- From Crimea: `Test-NetConnection 141.148.239.103 -Port 22` → True (IP reachable).
- Via proxy: `curl --resolve qirim.online:443:141.148.239.103 https://qirim.online/` → 200.
- `/app/` → 200; TLS pass-through serves origin cert (CN=qirim.online, valid to 2026-09-06).

## Volumetric throttle of the Oracle (foreign) IP — 2026-06-17

After the L7 cutover, the site loaded but the SPA never booted in-browser:
`/app/` HTML loads, but `/app/assets/*.js` bundles fail with
`ERR_CONNECTION_RESET`. Diagnosis from Crimea (curl):

- Small responses (<~16 KB) complete; large transfers **stall at ~16 KB**
  (one initial TCP window) then hang.
- A 1 MB file served **locally by the proxy** stalls at ~16 KB too — so origin
  and the proxy↔origin leg are NOT involved.
- **Same ~16 KB stall with a neutral SNI to the same IP** → NOT domain/SNI-based.
- MTU lowered 9000→1500→1400 and an MSS clamp to 1240 made **no difference** →
  NOT an MTU/MSS path issue (the first full-size window passes fine).

Conclusion: the Crimean DPI **volumetrically throttles sustained TLS transfers to
this specific foreign IP** (`141.148.239.103`, Oracle Amsterdam), cutting each
flow after ~16 KB. It is keyed on the **IP**, not the domain. A different
**foreign** IP (e.g., another Oracle region) is likely throttled the same way.

**Decision:** move the proxy to a **Russian/CIS VPS** (vdsina / aeza / ruvds,
~150–300 ₽/mo, Moscow/SPb). A domestic IP is not treated as foreign transit and
should not hit this throttle, plus much lower latency to Crimea. Same nginx L7
config; only the A record changes. Validate early: before full setup, host a
1 MB test file on the new VPS and confirm Crimea can pull the **full** file.
Bulletproof long-term fallback for power users / the Android app: the existing
Xray tunnel (encrypted, no throttleable plaintext SNI/IP signature).

## RU proxy migration (2026-06-18) — SOLVED the throttle

Confirmed the throttle was on the **foreign IP**: from Crimea, a 1 MB file from the
RU VPS downloaded **in full (1048576 b, ~0.7 s)** while the same test on the Oracle
Amsterdam IP stalled at ~16 KB. Russian IPs are not treated as foreign transit by
the Crimean DPI → no volumetric throttle.

**Current production proxy:**
- **Provider:** RuVDS, **Moscow**, Ubuntu 24.04. **IP: `193.108.113.141`**.
- **SSH:** `ssh -i ~/.ssh/qo-ruvds -o IdentitiesOnly=yes root@193.108.113.141`
  (dedicated ed25519 key, separate from other hosts since the box is untrusted —
  use `IdentitiesOnly=yes` or ssh offers too many keys and the server drops it).
- Same L7 nginx config as the Oracle one (cache `/app/assets/`, keepalive to
  origin, Xray `/video_bridge_42` passthrough, HTTP/2).
- **Its own** Let's Encrypt cert issued on the box via `certbot --webroot`
  (`/var/www/certbot`), renew + `--deploy-hook "systemctl reload nginx"`. The
  production private key was deliberately NOT copied here (untrusted host) — a
  short-lived self-signed cert covered the pre-cutover throttle test only.
- Note: RU→origin RTT is ~177 ms (origin is far from Moscow too), so dynamic/audio
  still pays that; static is served from the Moscow cache.
- `@` A record → `193.108.113.141` (TTL 60). `www` is CNAME → qirim.online.
  `mail`/`admin`/`test` stay on origin `93.127.197.163` (mail must; admin/test are
  not in the proxy's `server_name`, would break if pointed at it).

## Status: RESOLVED (2026-06-18)

- ✅ **Crimea** — confirmed working in-browser: SPA/player loads, music plays
  (previously `ERR_CONNECTION_RESET` on the JS bundles).
- ✅ **Cross-region reachability** (check-host.net HTTP check): HTTP 200 from
  Ukraine (ua2), Russia, Poland, Germany, Netherlands, Lithuania, Moldova,
  Turkey, Kazakhstan, US. The feared "Ukraine blocks the RU IP" did **not**
  materialize from datacenter nodes. Caveat: check-host UA nodes are datacenters;
  Ukrainian **residential** ISPs may treat RU ranges differently — confirm with a
  real Ukrainian home user if that audience matters. Quick recheck:
  `https://check-host.net/check-http?host=https://qirim.online`.

### If Ukraine (or anywhere) later starts blocking the RU IP
Don't pick "Crimea OR Ukraine" — use **GeoDNS**: serve `193.108.113.141` (RU) to
Russian/Crimean resolvers and a neutral IP (origin or the Oracle box) to everyone
else. Not needed as of 2026-06-18 (works everywhere).

## Open items
- [ ] Decommission the Oracle proxy (`141.148.239.103`) once you're satisfied RU
      is stable (kept running for now as a spare/fallback).
- [ ] (optional) If `admin.qirim.online` must work from Crimea, add it as a
      `server_name` on the RU proxy + extend the cert for it.
- [ ] (optional) Uptime monitoring on `https://qirim.online` to catch outages
      (like the earlier 502) before users report them.
- [x] Switch `qirim.online` (and `www`) A record → `141.148.239.103` (done
      2026-06-17, TTL 60). Mail (`MX → mail.qirim.online`) left on `93.127.197.163`.
      DNS managed at Hostinger (ns1/ns2.dns-parking.com). Live site confirmed
      routing through proxy (HTTP 200, remote_ip=141.148.239.103).
- [ ] Verify from inside Crimea that the site loads after propagation.
- [ ] Confirm Let's Encrypt renewal still works through the proxy (http-01 on :80
      is forwarded to origin; next renewal due before 2026-09-06).
- [ ] If the proxy IP later gets blocked: rebuild proxy on a new IP, repeat.
