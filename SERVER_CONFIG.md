# Server Configuration

All deployment scripts use the `SERVER_IP` environment variable to connect to your server.

## Setup

### Option 1: Using .env.server file (Recommended)

1. Copy the example file:
   ```bash
   cp .env.server.example .env.server
   ```

2. Edit `.env.server` and set your server IP:
   ```bash
   SERVER_IP=root@YOUR_ACTUAL_SERVER_IP
   ```

3. Source the file before running scripts:
   ```bash
   source .env.server && ./deploy-manual.sh
   ```

### Option 2: Set environment variable directly

```bash
export SERVER_IP=root@YOUR_ACTUAL_SERVER_IP
./deploy-manual.sh
```

### Option 3: Inline with command

```bash
SERVER_IP=root@YOUR_ACTUAL_SERVER_IP ./deploy-manual.sh
```

## Scripts that use SERVER_IP

- `deploy-manual.sh` - Manual deployment with password
- `deploy-full.sh` - Full automatic deployment
- `push-to-server.sh` - Push Docker image to server
- `restart-server.sh` - Restart Navidrome on server
- `check-server.sh` - Check server status
- `enable-registration.sh` - Enable user registration
- `rebuild-and-deploy.sh` - Rebuild and deploy

## Security

The `.env.server` file is excluded from git (listed in `.gitignore`) to keep your server IP private.
