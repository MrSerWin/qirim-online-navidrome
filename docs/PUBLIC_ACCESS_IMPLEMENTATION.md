# Public Access Implementation

## Overview
This document describes the implementation of public (unauthenticated) access to Navidrome QO, allowing all visitors to browse and play music without requiring registration, while preserving full functionality for authenticated users.

## Problem Statement
The previous approach using `ND_DEVAUTOLOGINUSERNAME` had a critical flaw: it forced ALL users (including those with their own accounts) to be logged in as the guest user, preventing them from managing their own profiles and playlists.

## Solution
Implemented a proper multi-tier access system:
- **Guest users** (unauthenticated): Read-only access to all content
- **Regular users** (authenticated): Full read/write access to their own data
- **Admin users** (authenticated): Full admin capabilities

## Technical Implementation

### Backend Changes

#### 1. New Middleware: OptionalAuthenticator
**File**: `server/auth.go`

Added a new middleware that allows both authenticated and unauthenticated requests:

```go
func OptionalAuthenticator(ds model.DataStore) func(next http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            ctx, err := authenticateRequest(ds, r, UsernameFromConfig, UsernameFromToken, UsernameFromReverseProxyHeader)
            if err != nil {
                // Authentication failed, but allow request to proceed without user context
                next.ServeHTTP(w, r)
                return
            }
            // Authentication succeeded, proceed with user context
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}
```

**Key behavior**:
- If authentication succeeds → request proceeds WITH user context
- If authentication fails → request proceeds WITHOUT user context (but is not rejected)

#### 2. Route Restructuring
**File**: `server/nativeapi/native_api.go`

Split routes into two groups:

**Public Read-Only Group** (uses `OptionalAuthenticator`):
- `/song` - View and play songs
- `/album` - Browse albums
- `/artist` - Browse artists
- `/genre` - Browse genres
- `/karaoke` - View karaoke songs
- `/playlist` - View playlists (GET only)
- `/playlist/{playlistId}/tracks` - View playlist tracks (GET only)

**Authenticated Only Group** (uses `Authenticator`):
- `/user` - User management
- `/player` - Player state management
- `/radio` - Radio stations (create/edit/delete)
- `/karaoke` - Karaoke management (create/edit/delete)
- `/tag` - Tag management
- `/share` - Sharing functionality
- `/queue` - Queue management
- `/playlist` - Playlist modifications (POST/PUT/DELETE)
- Admin-only routes (library, transcoding, etc.)

#### 3. New Playlist Route Functions
**File**: `server/nativeapi/native_api.go`

Created separate functions for public and authenticated access:

- `addPublicPlaylistRoute()` - GET endpoints only for viewing playlists
- `addAuthenticatedPlaylistRoute()` - POST/PUT/DELETE endpoints for modifying playlists
- `addPublicPlaylistTrackRoute()` - GET endpoints only for viewing playlist tracks
- `addAuthenticatedPlaylistTrackRoute()` - POST/PUT/DELETE endpoints for modifying tracks

### Frontend Changes

#### 1. Authentication Provider Updates
**File**: `ui/src/authProvider.js`

**`checkAuth()` modification**:
```javascript
checkAuth: () => {
    // Allow unauthenticated access for public content
    if (localStorage.getItem('is-authenticated')) {
        return Promise.resolve()
    }
    // Don't reject - allow access but with 'guest' permissions
    return Promise.resolve()
}
```

**`getPermissions()` modification**:
```javascript
getPermissions: () => {
    const role = localStorage.getItem('role')
    // Return 'guest' for unauthenticated users instead of rejecting
    return Promise.resolve(role || 'guest')
}
```

**Key changes**:
- Never reject unauthenticated requests
- Return 'guest' permission level for unauthenticated users
- Authenticated users still get their proper roles ('regular' or 'admin')

#### 2. User Menu Hidden for Guests
**File**: `ui/src/App.jsx`

```javascript
// Hide User menu for guest (unauthenticated) users
permissions !== 'guest' ? (
    <Resource name="user" {...user} options={{ subMenu: 'settings' }} />
) : null,
```

#### 3. Guest User Menu
**File**: `ui/src/layout/AppBar.jsx`

Added a new `GuestUserMenu` component that shows a "Sign In" button:

```javascript
const GuestUserMenu = () => {
    const translate = useTranslate()
    const classes = useStyles()

    return (
        <MenuItem
            className={classes.root}
            onClick={() => {
                window.location.hash = '#/login'
            }}
        >
            <ListItemIcon className={classes.icon}>
                <MdPerson size={24} />
            </ListItemIcon>
            {translate('ra.auth.sign_in', { _: 'Sign In' })}
        </MenuItem>
    )
}
```

Modified `CustomUserMenu` to detect guest users:
```javascript
if (permissions === 'guest') {
    return <GuestUserMenu />
}
```

#### 4. Hide "Add to Playlist" Button for Guests
**File**: `ui/src/common/AddToPlaylistButton.jsx`

Added permission check to hide button for guests:

```javascript
export const AddToPlaylistButton = ({ resource, selectedIds, className }) => {
  const { permissions } = usePermissions()

  // Hide button for guest users
  if (permissions === 'guest') {
    return null
  }
  // ... rest of component
}
```

This button is used in:
- Album lists
- Artist tables
- Song tables

#### 5. Hide "Create" Button on Playlist Page
**File**: `ui/src/playlist/PlaylistListActions.jsx`

Added permission check to hide Create button:

```javascript
const PlaylistListActions = ({ className, ...rest }) => {
  const { permissions } = usePermissions()

  return (
    <TopToolbar className={className} {...sanitizeListRestProps(rest)}>
      {cloneElement(rest.filters, { context: 'button' })}
      {permissions !== 'guest' && (
        <CreateButton basePath="/playlist">
          {translate('ra.action.create')}
        </CreateButton>
      )}
      {isNotSmall && <ToggleFieldsMenu resource="playlist" />}
    </TopToolbar>
  )
}
```

#### 6. Block Access to /playlist/create
**File**: `ui/src/playlist/PlaylistCreate.jsx`

Added redirect for guest users:

```javascript
const PlaylistCreate = (props) => {
  const { permissions } = usePermissions()

  // Redirect guests to playlist list
  useEffect(() => {
    if (permissions === 'guest') {
      notify('ra.notification.logged_out', 'warning')
      redirect('/playlist')
    }
  }, [permissions, notify, redirect])
  // ... rest of component
}
```

#### 7. Docker Compose Configuration
**File**: `docker-compose.qirim-online.yml`

**Removed**: `ND_DEVAUTOLOGINUSERNAME: "qirim-guest"`

This feature is no longer needed since we implemented proper public access at the application level.

## Features

### For Unauthenticated Users (Guests)
✅ Browse all albums (all, random, top)
✅ Browse all artists
✅ Browse all songs
✅ Browse all karaoke songs
✅ View public playlists
✅ Play any track
✅ View track details
✅ See "Sign In" button in header
❌ **Cannot access /user endpoint** (403 Permission denied)
❌ **Cannot see "Add to Playlist" buttons** (hidden in UI)
❌ **Cannot see "Create" button** on /playlist page (hidden in UI)
❌ **Cannot access /playlist/create** (redirected to /playlist)
❌ Cannot create playlists (backend: 401)
❌ Cannot edit playlists (backend: 401)
❌ Cannot create karaoke (backend: 401)
❌ Cannot access user management
❌ Cannot save playback queue
❌ Cannot use radio stations

### For Authenticated Users
✅ All guest features
✅ Create and manage playlists
✅ Create and manage karaoke
✅ Save playback queue
✅ Manage radio stations (if admin)
✅ User profile management
✅ Personal settings

### For Admin Users
✅ All authenticated user features
✅ User management
✅ Library management
✅ Transcoding configuration
✅ System settings

## Testing Checklist

### Guest Access
- [ ] Open incognito browser
- [ ] Navigate to https://qirim.online
- [ ] Should see content WITHOUT login
- [ ] Click on album → should play
- [ ] Click on artist → should show details
- [ ] Click on playlist → should show songs
- [ ] Try to create playlist → should not see button
- [ ] See "Sign In" button in top right

### Authenticated Access
- [ ] Click "Sign In" button
- [ ] Login with regular user account
- [ ] Should see full menu with playlists
- [ ] Should see User menu item
- [ ] Create playlist → should work
- [ ] Edit playlist → should work
- [ ] Logout → should return to guest view

### Admin Access
- [ ] Login with admin account
- [ ] Should see all features
- [ ] Should see Library, Transcoding, Users menus

## Deployment

Run the deployment script:
```bash
./rebuild-and-deploy-qirim-online.sh
```

This will:
1. Build AMD64 Docker image
2. Save image to tar file
3. Transfer to server
4. Load and restart containers
5. Show logs and status

## Files Modified

### Backend
- `server/auth.go` - Added OptionalAuthenticator middleware
- `server/nativeapi/native_api.go` - Restructured routes, added public/authenticated split, added requireAuthMiddleware, addUserRoute, addKaraokeRoute

### Frontend
- `ui/src/authProvider.js` - Modified checkAuth and getPermissions to allow guest access
- `ui/src/App.jsx` - Hide User resource for guests
- `ui/src/layout/AppBar.jsx` - Added GuestUserMenu component
- `ui/src/common/AddToPlaylistButton.jsx` - Hide button for guests
- `ui/src/playlist/PlaylistListActions.jsx` - Hide Create button for guests
- `ui/src/playlist/PlaylistCreate.jsx` - Redirect guests to playlist list

### Configuration
- `docker-compose.qirim-online.yml` - Removed ND_DEVAUTOLOGINUSERNAME

## Security Considerations

1. **Read-only enforcement**: All write operations (POST/PUT/DELETE) require authentication at the routing level
2. **No data leakage**: Unauthenticated users can only access public data
3. **User context isolation**: Authenticated users' data remains private
4. **Admin-only routes**: Sensitive admin operations remain protected

## Future Enhancements

Potential improvements for the future:

1. **Private playlists**: Add visibility flag to playlists (public vs private)
2. **Rate limiting**: Add rate limiting for unauthenticated requests
3. **Analytics**: Track guest vs authenticated usage patterns
4. **Guest limitations**: Consider limiting number of plays per day for guests
5. **Social features**: Allow guests to see "most played" or "trending" content

## Troubleshooting

### Issue: Users still forced to login
**Solution**: Clear browser cache and localStorage

### Issue: Guest users see edit buttons
**Solution**: Check that permissions are properly propagating to UI components

### Issue: Authenticated users can't edit
**Solution**: Verify authentication token in localStorage and check server logs

## References

- Original issue: Guest mode forcing all users to be guests
- Solution: Multi-tier access with OptionalAuthenticator middleware
- Implementation date: 2025-10-17
