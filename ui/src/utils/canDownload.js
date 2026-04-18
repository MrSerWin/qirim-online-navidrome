// Subsonic /rest/download requires u+t+s params. Guest/auto-login users don't
// have these in localStorage (only set by /auth/login via storeAuthenticationInfo),
// so hide any download UI for them to avoid "missing parameter: 'u'" errors.
export const canDownload = () =>
  !!(
    localStorage.getItem('username') &&
    localStorage.getItem('subsonic-token') &&
    localStorage.getItem('subsonic-salt')
  )
