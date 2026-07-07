const OAUTH_PENDING_KEY = 'depthly:oauth-pending'

/**
 * Marks an OAuth redirect as in-flight, right before the browser leaves for
 * the provider. sessionStorage (not router state) is the only thing that
 * survives the hard navigation back — Supabase may land the browser on
 * "/" or directly on "/dashboard" depending on its redirect-URL allowlist.
 */
export function markOAuthPending() {
  sessionStorage.setItem(OAUTH_PENDING_KEY, '1')
}

export function isOAuthPending() {
  return sessionStorage.getItem(OAUTH_PENDING_KEY) === '1'
}

export function clearOAuthPending() {
  sessionStorage.removeItem(OAUTH_PENDING_KEY)
}
