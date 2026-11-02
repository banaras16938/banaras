// ==========================================
// PUBLIC (CLIENT-FACING) SITE SWITCH
// ==========================================
//
// The public results site (live results, Jodi chart, Panel chart, disclaimer)
// has been shut down. Only the internal Staff and Admin portals stay online.
//
// None of the public site's code was deleted. It is simply no longer routed:
//   - The routes listed in PUBLIC_SITE_PATHS are rewritten by `src/middleware.ts`
//     to PUBLIC_SITE_UNAVAILABLE_ROUTE, which shows a neutral "Nothing here" page.
//   - GET /api/results no longer answers anonymous visitors; it requires a
//     signed-in, active staff/admin account.
//
// To bring the public site back, set PUBLIC_SITE_ENABLED to `true` and redeploy.
// Full details: docs/PUBLIC_SITE_SHUTDOWN.md

/** Master switch for everything served to the public (non staff/admin) audience. */
export const PUBLIC_SITE_ENABLED = false

/** Route that renders the "Nothing here" notice while the public site is disabled. */
export const PUBLIC_SITE_UNAVAILABLE_ROUTE = '/site-unavailable'

/**
 * Paths that belonged to the public results site.
 * The whole public app (Results, Past Results, Jodi Chart, Panel Chart and
 * Disclaimer views) is rendered from the root page, so `/` covers all of it.
 */
export const PUBLIC_SITE_PATHS: readonly string[] = ['/']
