# Public Site Shutdown: Change Record

| | |
|---|---|
| **Date** | 2 Nov 2026 |
| **Branch** | `claude/peaceful-gates-ndrvhl` |
| **Change type** | Routing and access control. No code was removed. |
| **Affected audience** | Public visitors only |
| **Staff / Admin impact** | None. All features work as before. |
| **Reversible** | Yes. Change one constant (see [§8](#8-how-to-re-enable-the-public-site)). |

---

## 1. Summary

The client-facing results website (live Morning/Night results, Jodi Chart, Panel Chart and Disclaimer) has been **taken offline**. Anyone who opens the public site now sees a neutral **"Nothing here / No results found"** page. Results are no longer available to anonymous visitors through the API either.

The **Staff portal** (`/staff/...`) and the **Admin portal** (`/admin/...`) are unchanged and remain fully operational for internal use.

**No existing line of code was deleted or modified.** The public site's code is still in the repository. It is no longer routed. Every change to an existing file only adds lines (`git diff` shows **30 insertions, 0 deletions** across existing files).

---

## 2. Objectives and constraints

| Requirement | How it was met |
|---|---|
| Shut down everything that shows results to the public | `/` is rewritten to a "Nothing here" page, and `GET /api/results` now requires a signed-in staff/admin account. |
| Visitors should see that there is nothing on the website | New neutral notice page with no branding, no links and no results. |
| Do not delete a single line of code | Only additive edits. The public page (`src/app/page.tsx`, 514 lines) and the results components are untouched. |
| Do not change any Staff/Admin feature | Staff/admin routes, pages, APIs and auth flow are untouched. They were verified after the change (see [§9](#9-verification-performed)). |
| Professional and reversible | One feature flag (`PUBLIC_SITE_ENABLED`) controls the shutdown. Turning the site back on means changing that one value. |

---

## 3. What a visitor sees now

![Nothing here notice](assets/site-unavailable.png)

- Title in the browser tab: **"Nothing here"**
- Message: **"No results found / Nothing here / There is no content available on this website."**
- Follows the visitor's light/dark system preference and works on mobile.
- No logo, no navigation and no links to the staff/admin login pages, so the internal portals are not advertised.
- Tells search engines to remove the page from their index (`<meta name="robots" content="noindex, nofollow">` and `X-Robots-Tag: noindex, nofollow` header).

---

## 4. Behaviour before vs. after

| Request | Before | After |
|---|---|---|
| `GET /` (public homepage, all tabs) | Live results, Jodi/Panel charts, disclaimer | **"Nothing here" notice** (200, `noindex`) |
| `GET /?anything` | Public results app | **"Nothing here" notice** |
| Client-side navigation to `/` (e.g. "Go to Homepage" on the 404 page) | Public results app | **"Nothing here" notice.** No result or Supabase calls are made. |
| `GET /site-unavailable` | n/a (did not exist) | "Nothing here" notice |
| `GET /api/results` (anonymous) | **Full results history (public)** | **401 Unauthorized** |
| `GET /api/results` (signed-in, active staff/admin) | Results | Results (**unchanged**) |
| `GET /api/results` (signed-in but deactivated account) | Results | 403 Access denied |
| Unknown paths, e.g. `/xyz` | 404 page | 404 page (unchanged) |
| `/admin` (not signed in as admin) | 404 page (hidden) | 404 page (unchanged) |
| `/admin/JaiGjmmjmcjmbjmk0021` (admin login) | Login page | Login page (unchanged) |
| `/staff` (not signed in) | Redirect to `/staff/login` | Redirect to `/staff/login` (unchanged) |
| `/staff/...` and `/admin/...` (signed in) | Dashboards | Dashboards (unchanged) |
| All other `/api/...` endpoints | Auth-protected | Unchanged |

---

## 5. Files changed

### 5.1 New files

| File | Purpose |
|---|---|
| `src/config/public-site.ts` | Single source of truth: `PUBLIC_SITE_ENABLED = false`, the list of public paths (`['/']`) and the notice route (`/site-unavailable`). |
| `src/utils/public-site/middleware.ts` | `handlePublicSiteAccess()`: while the public site is disabled, it rewrites public paths to the notice route and adds the `X-Robots-Tag: noindex, nofollow` header. Returns `null` for every other path so the existing middleware runs unchanged. |
| `src/app/site-unavailable/page.tsx` | The "Nothing here" notice page. It is a static server component with `noindex` metadata, and it overrides the public title, description and keywords. |
| `docs/PUBLIC_SITE_SHUTDOWN.md` | This document. |
| `docs/assets/site-unavailable.png` | Screenshot of the notice used in this document. |

### 5.2 Existing files (lines added only, none removed)

**`src/middleware.ts`** (+8 lines)

The public-site check now runs before the existing Supabase session handling. The original `return await updateSession(request)` line is still there, unchanged.

```ts
import { handlePublicSiteAccess } from '@/utils/public-site/middleware'

export async function middleware(request: NextRequest) {
    // Public results site is shut down: its paths now show the "Nothing here" notice.
    // Staff/Admin routes are untouched. See src/config/public-site.ts
    const publicSiteResponse = handlePublicSiteAccess(request)
    if (publicSiteResponse) {
        return publicSiteResponse
    }

    return await updateSession(request)   // ← original line, unchanged
}
```

**`src/app/api/results/route.ts`** (+22 lines, `GET` handler only)

A guard runs at the top of `GET`. It uses the same pattern as the other protected API routes (`createClient()` → `auth.getUser()` → `profiles` lookup), so results are only returned to a signed-in **active** staff/admin account. The rest of `GET` and the whole `POST` handler (declare result) are unchanged.

```ts
if (!PUBLIC_SITE_ENABLED) {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await authClient.from('profiles').select('is_active').eq('id', user.id).single()
    if (!profile || !profile.is_active) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
}
```

> The "active account" rule matches what `src/utils/supabase/middleware.ts` already enforces for `/staff` pages. A deactivated user could not reach the staff dashboard before this change either.

---

## 6. Code intentionally kept (not deleted, now unrouted or unused by the public)

| File | Status |
|---|---|
| `src/app/page.tsx` (514 lines) | The complete public results app. **Byte-for-byte unchanged.** It is still compiled, but no request can reach it while the flag is off. |
| `src/components/results/*` (`CurrentResult`, `JodiChart`, `PanelChart`, `GameTimeline`, `ResultHistory`) | Unchanged. `CurrentResult`, `JodiChart` and `PanelChart` are still used by the Staff dashboard and Staff charts. |
| `src/app/globals.css` (public-site styles) | Unchanged. |
| `src/app/layout.tsx` (default metadata) | Unchanged. The notice page overrides the title, description, keywords and robots tags for itself. |
| `src/app/not-found.tsx` | Unchanged. This page is deliberately left alone: the middleware also shows it to anyone who is not an admin and opens `/admin`. If unknown paths showed the notice while `/admin` showed the 404 page, outsiders could tell that `/admin` exists. |
| `src/lib/results.ts` | Unchanged (it was not used by any route before this change either). |
| Supabase schema, migrations, RLS policies, cron jobs | Unchanged. See [§10](#10-recommended-follow-ups-not-applied) for optional hardening. |

---

## 7. How it works

```
Request ──► src/middleware.ts
              │
              ├─ handlePublicSiteAccess(request)          (new)
              │     PUBLIC_SITE_ENABLED === false  AND  path ∈ PUBLIC_SITE_PATHS ('/')
              │        └─► rewrite to /site-unavailable  +  X-Robots-Tag: noindex, nofollow
              │
              └─ updateSession(request)                    (existing, unchanged)
                    ├─ /staff/**  → requires active profile, else redirect /staff/login
                    ├─ /admin/**  → requires active admin, else 404
                    └─ everything else → pass through

GET /api/results ──► guard (new): signed-in + active profile required ──► existing query logic
```

The URL in the visitor's address bar stays `/`. The response is the notice page, so no old URL leaks or redirects anywhere.

---

## 8. How to re-enable the public site

1. Open `src/config/public-site.ts`.
2. Change:
   ```ts
   export const PUBLIC_SITE_ENABLED = false
   ```
   to:
   ```ts
   export const PUBLIC_SITE_ENABLED = true
   ```
3. Build and deploy.

With the flag on, the middleware hook and the API guard both step aside, and the original public site and public results API behave exactly as they did before this change. Reverting the commit also restores the original state completely.

---

## 9. Verification performed

All checks ran against a **production build** (`next build` + `next start`). A local mock of the Supabase auth/database endpoints stood in for the real backend so that anonymous visitors, an active staff session and a deactivated account could all be tested.

| Check | Result |
|---|---|
| `GET /` as a visitor | 200, "Nothing here" notice, `X-Robots-Tag: noindex, nofollow`. No "Banaras Morning" or "Jodi Chart" content in the response. |
| `GET /?tab=past` | Notice (`<title>Nothing here</title>`) |
| `GET /` as a client-side (RSC) navigation | Notice payload |
| Browser: open a 404 page → click "Go to Homepage" | Lands on the notice; **0** calls to `/api/results` or Supabase |
| `GET /index`, `GET /some/random/page` | 404 (unchanged) |
| `GET /admin` as a visitor | 404 (unchanged) |
| `GET /admin/JaiGjmmjmcjmbjmk0021` | 200 admin login (unchanged) |
| `GET /staff` as a visitor | 307 → `/staff/login` (unchanged) |
| `GET /staff/login` | 200 (unchanged) |
| `GET /staff`, `GET /staff/charts` with an active staff session | 200 (unchanged) |
| `GET /api/results` as a visitor | **401** `{"error":"Unauthorized"}` |
| `GET /api/results` with an active staff session | **200**, results returned (unchanged) |
| `GET /api/results` with a deactivated account | 403 `{"error":"Access denied"}` |
| `POST /api/results` as a visitor | 401 (unchanged) |
| `GET /api/game-schedules` as a visitor | 401 (unchanged) |
| Notice page: light mode, dark mode, 390 px mobile | Renders correctly |
| `tsc --noEmit` | Passes |
| `eslint src` | 67 problems before and 67 after. No new issues; all reported issues are pre-existing. |
| `next build` | Succeeds. `/site-unavailable` is prerendered as static. |
| `git diff` on existing files | **30 insertions, 0 deletions** |

**Recommended before go-live:** a short smoke test on staging with a real staff login and a real admin login (dashboard results, charts, declare result, cross-checking).

---

## 10. Recommended follow-ups (not applied)

These are outside the "remove the public paths" scope, or they need a database or infrastructure decision. They are listed so the shutdown can be completed to whatever level the team decides.

1. **Supabase direct access (database level).**
   The Supabase publishable (anon) key is public by design: it is shipped in the browser bundle for the staff/admin pages. The current RLS policies still allow the `anon` role to `SELECT` from `game_sessions`, `game_schedules`, `game_config`, `holidays` and `patti_master` (see `supabase/schema.sql` lines 470–473 and the `patti_master` migrations). That means someone who extracts the key could still query results **directly from Supabase**, bypassing this website.
   To close this completely:
   - First change `GET /api/results` to read with the authenticated server client (`createClient()`) instead of `createPublicClient()`. **This must come first.** The route currently reads results as `anon`, so removing anon access before this change would break results on the Staff and Admin dashboards.
   - Then restrict the `"Read game sessions"` policy (and optionally the other read policies) to `TO authenticated`.
   - Review Realtime publication settings for `game_sessions`.
2. **Search engines.** The site now sends `noindex`. To speed up removal, submit the homepage for removal in Google Search Console / Bing Webmaster Tools. Do **not** add a `robots.txt` `Disallow: /` until the pages have dropped out of the index, because crawlers have to be able to fetch the page to see the `noindex`.
3. **CDN / hosting cache.** If a CDN in front of the site caches HTML, purge `/` after deploying.
4. **Default site title.** Staff/admin pages still inherit the root layout title "Game Results | Live Results & History". Only internal users see it, so it was left as is.
5. **Next.js 16 note (pre-existing, unrelated).** Next.js 16 deprecates `middleware.ts` in favour of `proxy.ts`. The project already used `middleware.ts`, and it still works. Migrating it is a separate task.

---

## 11. Rollback

Either of these restores the original public site exactly:

- set `PUBLIC_SITE_ENABLED = true` in `src/config/public-site.ts` and redeploy, **or**
- revert the commit that introduced this change.
