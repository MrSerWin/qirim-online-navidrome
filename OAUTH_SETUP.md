# OAuth Configuration Guide

This guide explains how to enable OAuth authentication (login via social networks) in Navidrome.

## Supported Providers

- Google
- Apple
- Instagram
- Facebook

## Quick Start

### 1. Enable OAuth in Configuration

Edit your `navidrome.toml` or set environment variables:

```toml
[OAuth]
Enabled = true
AutoCreateUser = true  # Automatically create users on first login
AutoCreateUserAdmin = false  # Create new users as regular users (not admins)

[OAuth.Google]
Enabled = true
ClientID = "your-google-client-id"
ClientSecret = "your-google-client-secret"
```

### 2. Using Docker Compose

Uncomment OAuth settings in `docker-compose.yml`:

```yaml
environment:
  ND_OAUTH_ENABLED: "true"
  ND_OAUTH_AUTOCREATEUSER: "true"
  ND_OAUTH_AUTOCREATEUSERADMIN: "false"

  # Google OAuth
  ND_OAUTH_GOOGLE_ENABLED: "true"
  ND_OAUTH_GOOGLE_CLIENTID: "your-client-id"
  ND_OAUTH_GOOGLE_CLIENTSECRET: "your-client-secret"
```

### 3. Using Environment Variables

```bash
export ND_OAUTH_ENABLED=true
export ND_OAUTH_GOOGLE_ENABLED=true
export ND_OAUTH_GOOGLE_CLIENTID="your-client-id"
export ND_OAUTH_GOOGLE_CLIENTSECRET="your-client-secret"
```

## Provider Setup Instructions

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Add authorized redirect URIs:
   - `https://yourdomain.com/auth/oauth/callback/google`
   - `http://localhost:4533/auth/oauth/callback/google` (for local dev)
6. Copy `Client ID` and `Client Secret`

**Scopes required:**
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`

### Apple OAuth

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create an App ID with "Sign In with Apple" capability
3. Create a Services ID
4. Configure "Sign In with Apple":
   - Add domain: `yourdomain.com`
   - Add redirect URL: `https://yourdomain.com/auth/oauth/callback/apple`
5. Create a Key for "Sign In with Apple"
6. Copy Service ID (Client ID) and Key (Client Secret)

**Note:** Apple OAuth requires a verified domain

### Instagram OAuth

**Note:** Instagram Basic Display API is deprecated. Instagram OAuth now uses Facebook Login.

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app (choose "Consumer" type)
3. Add "Facebook Login" product
4. Configure OAuth redirect URIs:
   - `https://yourdomain.com/auth/oauth/callback/instagram`
   - `http://localhost:4533/auth/oauth/callback/instagram` (for local dev)
5. Get App ID (Client ID) and App Secret (Client Secret)
6. **Important:** Use the same Client ID and Secret as Facebook OAuth

**Scopes required:**
- `email`
- `public_profile`
- `instagram_basic` (optional, for Instagram-specific data)

**Configuration:**
- Instagram OAuth uses Facebook's endpoints
- User authentication is done via Facebook
- You can use the same credentials for both Facebook and Instagram providers

### Facebook OAuth

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app or use existing
3. Add "Facebook Login" product
4. Configure OAuth redirect URIs:
   - `https://yourdomain.com/auth/oauth/callback/facebook`
5. Get App ID (Client ID) and App Secret (Client Secret)

**Scopes required:**
- `email`
- `public_profile`

## Configuration Reference

### Main OAuth Settings

| Setting | Environment Variable | Default | Description |
|---------|---------------------|---------|-------------|
| `OAuth.Enabled` | `ND_OAUTH_ENABLED` | `false` | Enable OAuth authentication |
| `OAuth.AutoCreateUser` | `ND_OAUTH_AUTOCREATEUSER` | `true` | Automatically create users on first OAuth login |
| `OAuth.AutoCreateUserAdmin` | `ND_OAUTH_AUTOCREATEUSERADMIN` | `false` | Create new OAuth users as admins |
| `OAuth.RedirectURL` | `ND_OAUTH_REDIRECTURL` | auto-detected | Custom OAuth redirect base URL |

### Provider Settings

Each provider has the same structure:

| Setting | Environment Variable | Description |
|---------|---------------------|-------------|
| `OAuth.<Provider>.Enabled` | `ND_OAUTH_<PROVIDER>_ENABLED` | Enable this provider |
| `OAuth.<Provider>.ClientID` | `ND_OAUTH_<PROVIDER>_CLIENTID` | OAuth Client ID |
| `OAuth.<Provider>.ClientSecret` | `ND_OAUTH_<PROVIDER>_CLIENTSECRET` | OAuth Client Secret |

Replace `<Provider>` with: `Google`, `Apple`, `Instagram`, or `Facebook`
Replace `<PROVIDER>` with: `GOOGLE`, `APPLE`, `INSTAGRAM`, or `FACEBOOK` (for env vars)

## How It Works

1. User clicks "Sign in with [Provider]" on login page
2. User is redirected to provider's OAuth page
3. After authorization, provider redirects back with authorization code
4. Navidrome exchanges code for access token
5. Navidrome fetches user info from provider
6. If user exists (matched by OAuth ID or email), they are logged in
7. If user doesn't exist and `AutoCreateUser=true`, a new account is created

## Security Features

- **State Token**: CSRF protection using random state tokens
- **Secure Cookies**: HttpOnly, Secure, SameSite cookies
- **Email Linking**: OAuth accounts can be linked to existing users via email
- **No Password Required**: OAuth users don't need passwords

## Troubleshooting

### "OAuth is disabled" error
- Check that `ND_OAUTH_ENABLED=true` is set
- Verify the provider is enabled: `ND_OAUTH_GOOGLE_ENABLED=true`

### "OAuth configuration error"
- Verify Client ID and Client Secret are correct
- Check that credentials are not empty

### "Invalid OAuth state" error
- This is a security feature - make sure cookies are enabled
- Check that your domain is correctly configured

### Redirect URI mismatch
- Verify redirect URIs in provider console match exactly:
  - Protocol (http vs https)
  - Domain
  - Path `/auth/oauth/callback/<provider>`

### User not found and auto-create disabled
- Set `ND_OAUTH_AUTOCREATEUSER=true` to allow new user creation
- Or manually create user account first, then link OAuth

## Production Deployment

1. **Always use HTTPS in production**
   - OAuth providers require HTTPS redirect URIs
   - Configure SSL/TLS certificates

2. **Secure your secrets**
   - Use environment variables or secret management
   - Never commit secrets to version control
   - Use `.env` files (add to `.gitignore`)

3. **Configure redirect URLs**
   - Update OAuth provider settings with production domain
   - Ensure `ND_BASEURL` or `ND_OAUTH_REDIRECTURL` is set correctly

4. **Test thoroughly**
   - Test each provider separately
   - Verify new user creation
   - Test existing user login
   - Test email linking

## Example Configurations

### Development (local)

```toml
[OAuth]
Enabled = true
AutoCreateUser = true

[OAuth.Google]
Enabled = true
ClientID = "dev-client-id.apps.googleusercontent.com"
ClientSecret = "dev-client-secret"
```

### Production

```bash
# docker-compose.yml or .env
ND_OAUTH_ENABLED=true
ND_OAUTH_REDIRECTURL=https://music.example.com
ND_OAUTH_GOOGLE_ENABLED=true
ND_OAUTH_GOOGLE_CLIENTID=${GOOGLE_CLIENT_ID}
ND_OAUTH_GOOGLE_CLIENTSECRET=${GOOGLE_CLIENT_SECRET}
```

## Support

For issues or questions:
1. Check the [troubleshooting](#troubleshooting) section
2. Review provider-specific documentation
3. Open an issue on GitHub
