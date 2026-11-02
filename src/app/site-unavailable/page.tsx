import type { Metadata } from 'next'
import { SearchX } from 'lucide-react'

// ==========================================
// "NOTHING HERE" NOTICE
// ==========================================
// Shown in place of the public results site, which has been shut down.
// Requests to the old public paths are rewritten here by `src/middleware.ts`.
// See `src/config/public-site.ts` and docs/PUBLIC_SITE_SHUTDOWN.md.

export const metadata: Metadata = {
    title: 'Nothing here',
    description: 'There is no content available on this website.',
    keywords: [],
    robots: {
        index: false,
        follow: false,
    },
}

export default function SiteUnavailablePage() {
    return (
        <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-gray-50 dark:bg-gray-950">
            <div className="w-full max-w-md text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800">
                    <SearchX className="h-7 w-7 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                </div>

                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                    No results found
                </p>

                <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
                    Nothing here
                </h1>

                <p className="mt-4 text-base leading-relaxed text-gray-500 dark:text-gray-400">
                    There is no content available on this website.
                </p>
            </div>
        </main>
    )
}
