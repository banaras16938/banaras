import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// ==========================================
// LOGIN RATE LIMITING
// ==========================================

// In-memory store for failed login attempts
// In production, use Redis or database for distributed systems
const loginAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>()

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes
const ATTEMPT_WINDOW = 30 * 60 * 1000 // 30 minutes - attempts reset after this

/**
 * Get client IP from request headers
 */
function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    return forwarded?.split(',')[0]?.trim() || realIP || 'unknown'
}

/**
 * Check if an email/IP combination is rate limited
 */
function isRateLimited(key: string): { limited: boolean; remainingTime?: number; attempts?: number } {
    const now = Date.now()
    const record = loginAttempts.get(key)

    if (!record) {
        return { limited: false }
    }

    // Check if locked out
    if (record.lockedUntil && now < record.lockedUntil) {
        const remainingTime = Math.ceil((record.lockedUntil - now) / 1000)
        return { limited: true, remainingTime, attempts: record.count }
    }

    // Clear old attempts
    if (now - record.lastAttempt > ATTEMPT_WINDOW) {
        loginAttempts.delete(key)
        return { limited: false }
    }

    // Check if max attempts reached
    if (record.count >= MAX_ATTEMPTS) {
        // Set lockout
        record.lockedUntil = now + LOCKOUT_DURATION
        const remainingTime = Math.ceil(LOCKOUT_DURATION / 1000)
        return { limited: true, remainingTime, attempts: record.count }
    }

    return { limited: false, attempts: record.count }
}

/**
 * Record a failed login attempt
 */
function recordFailedAttempt(key: string): number {
    const now = Date.now()
    const record = loginAttempts.get(key)

    if (record) {
        // Reset if outside window
        if (now - record.lastAttempt > ATTEMPT_WINDOW) {
            loginAttempts.set(key, { count: 1, lastAttempt: now })
            return 1
        }
        record.count++
        record.lastAttempt = now

        // Set lockout if max reached
        if (record.count >= MAX_ATTEMPTS) {
            record.lockedUntil = now + LOCKOUT_DURATION
        }
        return record.count
    }

    loginAttempts.set(key, { count: 1, lastAttempt: now })
    return 1
}

/**
 * Clear login attempts on successful login
 */
function clearAttempts(key: string): void {
    loginAttempts.delete(key)
}

// ==========================================
// LOGIN API ROUTE
// ==========================================

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, password, role } = body

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
        }

        // Validate role
        if (role && !['admin', 'staff'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }

        // Create rate limit key using email + IP
        const clientIP = getClientIP(request)
        const rateLimitKey = `${email.toLowerCase()}:${clientIP}`

        // Check rate limiting
        const rateCheck = isRateLimited(rateLimitKey)
        if (rateCheck.limited) {
            const minutes = Math.ceil((rateCheck.remainingTime || 0) / 60)
            return NextResponse.json({
                error: `Too many failed attempts. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`,
                locked: true,
                remainingTime: rateCheck.remainingTime
            }, { status: 429 })
        }

        // Attempt login
        const supabase = await createClient()

        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (signInError) {
            const attempts = recordFailedAttempt(rateLimitKey)
            const remaining = MAX_ATTEMPTS - attempts

            return NextResponse.json({
                error: signInError.message,
                attemptsRemaining: remaining > 0 ? remaining : 0,
                locked: remaining <= 0
            }, { status: 401 })
        }

        if (!authData.user) {
            const attempts = recordFailedAttempt(rateLimitKey)
            return NextResponse.json({
                error: 'Authentication failed',
                attemptsRemaining: MAX_ATTEMPTS - attempts
            }, { status: 401 })
        }

        // Get profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, role, is_active, name')
            .eq('id', authData.user.id)
            .single()

        if (profileError || !profile) {
            await supabase.auth.signOut()
            recordFailedAttempt(rateLimitKey)
            return NextResponse.json({
                error: 'No profile found for this account'
            }, { status: 401 })
        }

        // Check if account is active
        if (!profile.is_active) {
            await supabase.auth.signOut()
            return NextResponse.json({
                error: 'Your account has been disabled'
            }, { status: 403 })
        }

        // Check role if specified
        if (role === 'admin' && profile.role !== 'admin') {
            await supabase.auth.signOut()
            return NextResponse.json({
                error: 'Access denied. Admin privileges required.'
            }, { status: 403 })
        }

        // Update last login
        await supabase
            .from('profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', authData.user.id)

        // Clear failed attempts on successful login
        clearAttempts(rateLimitKey)

        return NextResponse.json({
            success: true,
            user: {
                id: authData.user.id,
                email: authData.user.email,
                role: profile.role,
                name: profile.name
            },
            redirect: profile.role === 'admin' ? '/admin' : '/staff'
        })

    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
    }
}

// GET: Check rate limit status for an email
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
        return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const clientIP = getClientIP(request)
    const rateLimitKey = `${email.toLowerCase()}:${clientIP}`
    const rateCheck = isRateLimited(rateLimitKey)

    return NextResponse.json({
        locked: rateCheck.limited,
        remainingTime: rateCheck.remainingTime,
        attemptsUsed: rateCheck.attempts || 0,
        maxAttempts: MAX_ATTEMPTS
    })
}
