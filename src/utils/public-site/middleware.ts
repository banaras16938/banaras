import { type NextRequest, NextResponse } from 'next/server'
import {
    PUBLIC_SITE_ENABLED,
    PUBLIC_SITE_PATHS,
    PUBLIC_SITE_UNAVAILABLE_ROUTE,
} from '@/config/public-site'

/**
 * Serves the "Nothing here" notice in place of the public results site.
 *
 * Returns a rewrite response when the request targets a public-site path while
 * the public site is disabled, otherwise `null` so the regular middleware
 * (Supabase session handling + staff/admin protection) runs unchanged.
 */
export const handlePublicSiteAccess = (request: NextRequest): NextResponse | null => {
    if (PUBLIC_SITE_ENABLED) {
        return null
    }

    const path = request.nextUrl.pathname
    if (!PUBLIC_SITE_PATHS.includes(path)) {
        return null
    }

    const url = request.nextUrl.clone()
    url.pathname = PUBLIC_SITE_UNAVAILABLE_ROUTE

    const response = NextResponse.rewrite(url)
    // Ask search engines to drop the old public pages from their index.
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return response
}
