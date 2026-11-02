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

/**
 * Search-engine visibility for the WHOLE website (public notice, staff, admin,
 * 404 page, images, static files and API responses).
 *
 * While `false`:
 *   - every page renders `<meta name="robots" content="noindex, nofollow">`
 *     (root layout metadata, `src/app/layout.tsx`)
 *   - every response carries the `X-Robots-Tag: noindex, nofollow` header
 *     (`next.config.ts`), which also covers images and other non-HTML files
 *
 * This is independent of PUBLIC_SITE_ENABLED: re-enabling the public site does
 * not make the website indexable again unless this is also set to `true`.
 */
export const SEARCH_ENGINE_INDEXING_ENABLED = false
