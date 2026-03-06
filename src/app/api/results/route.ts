import { createClient } from '@/utils/supabase/server'
import { createPublicClient } from '@/utils/supabase/public'
import { NextRequest, NextResponse } from 'next/server'
import { SessionType, BetTarget, sessionToResult, ALL_VALID_PATTIS } from '@/types/types'

// ==========================================
// RESULTS (GAME SESSIONS) API ROUTE
// ==========================================

// GET: Get game results (public)
export async function GET(request: NextRequest) {
    const supabase = createPublicClient()

    const { searchParams } = new URL(request.url)
    const gameDate = searchParams.get('date')
    const sessionName = searchParams.get('session') as SessionType | null
    const limitParam = searchParams.get('limit')
    const limit = limitParam === 'all' ? 100000 : parseInt(limitParam || '30')

    let query = supabase
        .from('game_sessions')
        .select('*')
        .order('game_date', { ascending: false })
        .order('session_name', { ascending: false })

    if (gameDate) query = query.eq('game_date', gameDate)
    if (sessionName) query = query.eq('session_name', sessionName)

    if (limit !== null) {
        query = query.limit(limit)
        const { data: sessions, error } = await query

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const results = sessions?.map(sessionToResult) || []
        return NextResponse.json({ results })
    } else {
        // Fetch all data using pagination to bypass 1000 row limit
        let allSessions: any[] = []
        let hasMore = true
        let page = 0
        const pageSize = 1000

        while (hasMore) {
            const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1)

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 })
            }

            if (data && data.length > 0) {
                allSessions = [...allSessions, ...data]
                if (data.length < pageSize) {
                    hasMore = false
                } else {
                    page++
                }
            } else {
                hasMore = false
            }
        }

        const results = allSessions.map(sessionToResult)
        return NextResponse.json({ results })
    }
}

// POST: Declare result (admin only)
export async function POST(request: NextRequest) {
    const supabase = await createClient()

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, is_active')
        .eq('id', user.id)
        .single()

    if (!profile || !profile.is_active || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { gameDate, sessionName, target, triple } = body

    // Validate inputs
    if (!gameDate || !sessionName || !target || !triple) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!/^[0-9]{3}$/.test(triple)) {
        return NextResponse.json({ error: 'Triple must be 3 digits (000-999)' }, { status: 400 })
    }

    // Validate triple is a valid patti from the 220-number universe
    if (!ALL_VALID_PATTIS.has(triple)) {
        return NextResponse.json({ error: `Invalid patti number: ${triple}. Must be from the valid 220-patti universe.` }, { status: 400 })
    }

    if (!['open', 'close'].includes(target)) {
        return NextResponse.json({ error: 'Target must be open or close' }, { status: 400 })
    }

    // Get or create game session
    let { data: session } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('game_date', gameDate)
        .eq('session_name', sessionName)
        .single()

    if (!session) {
        const { data: newSession, error: createError } = await supabase
            .from('game_sessions')
            .insert({ game_date: gameDate, session_name: sessionName })
            .select('*')
            .single()

        if (createError) {
            return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
        }
        session = newSession
    }

    // Validate result declaration order
    if (target === 'close' && !session.open_triple) {
        return NextResponse.json({ error: 'Open result must be declared first' }, { status: 400 })
    }

    // Update session with result (trigger will calculate single and jodi)
    const updateData = target === 'open'
        ? { open_triple: triple }
        : { close_triple: triple }

    const { data: updatedSession, error: updateError } = await supabase
        .from('game_sessions')
        .update(updateData)
        .eq('id', session.id)
        .select('*')
        .single()

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Process winners using the database function
    const { data: winnerResult, error: winnerError } = await supabase
        .rpc('process_winners', {
            p_session_id: session.id,
            p_target: target as BetTarget
        })

    if (winnerError) {
        console.error('Winner processing error:', winnerError)
        // Don't fail the operation, just log - winners can be reprocessed
    }

    return NextResponse.json({
        result: sessionToResult(updatedSession),
        winners: winnerResult
    })
}
