import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { handlePublicSiteAccess } from '@/utils/public-site/middleware'

export async function middleware(request: NextRequest) {
    // Public results site is shut down: its paths now show the "Nothing here" notice.
    // Staff/Admin routes are untouched. See src/config/public-site.ts
    const publicSiteResponse = handlePublicSiteAccess(request)
    if (publicSiteResponse) {
        return publicSiteResponse
    }

    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - Public files
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
