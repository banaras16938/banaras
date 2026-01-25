import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { BetCategory, BetTarget, SessionType } from '@/types/types'

// ==========================================
// BETS API ROUTE
// ==========================================

// GET: Get bets
export async function GET(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, is_active')
        .eq('id', user.id)
        .single()

    if (!profile || !profile.is_active) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const gameDate = searchParams.get('date')
    const sessionName = searchParams.get('session')
    const staffId = searchParams.get('staffId')

    // First, get the game session if date is provided
    let gameSessionId: string | null = null
    if (gameDate && sessionName) {
        const { data: session } = await supabase
            .from('game_sessions')
            .select('id')
            .eq('game_date', gameDate)
            .eq('session_name', sessionName)
            .single()
        gameSessionId = session?.id || null
    }

    let query = supabase
        .from('bets')
        .select(`
            *,
            player:player_id (name, phone),
            staff:staff_id (email),
            game_session:game_session_id (game_date, session_name)
        `)
        .order('created_at', { ascending: false })

    // Staff can only see their own bets
    if (profile.role !== 'admin') {
        query = query.eq('staff_id', profile.id)
    } else if (staffId) {
        query = query.eq('staff_id', staffId)
    }

    if (gameSessionId) {
        query = query.eq('game_session_id', gameSessionId)
    }

    const { data: bets, error } = await query.limit(500)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ bets })
}

// POST: Place a bet
export async function POST(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, is_active')
        .eq('id', user.id)
        .single()

    if (!profile || !profile.is_active) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const {
        gameDate,
        sessionName,
        category,
        target,
        selectedNumber,
        amount,
        playerName,
        playerPhone,
        playerId: existingPlayerId
    } = body

    // Validate required fields
    if (!gameDate || !sessionName || !category || !target || !selectedNumber || !amount) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate category
    if (!['single', 'jodi', 'triple'].includes(category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    // Validate target
    if (!['open', 'close', 'jodi_full'].includes(target)) {
        return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
    }

    // Validate number format
    const expectedLength = category === 'single' ? 1 : category === 'jodi' ? 2 : 3
    if (selectedNumber.length !== expectedLength || !/^[0-9]+$/.test(selectedNumber)) {
        return NextResponse.json({
            error: `${category} must be ${expectedLength} digit(s) (0-9)`
        }, { status: 400 })
    }

    // Validate amount - minimum 10, must be multiple of 10
    const numericAmount = Number(amount)
    if (isNaN(numericAmount) || numericAmount < 10) {
        return NextResponse.json({ error: 'Minimum bet amount is 10 points' }, { status: 400 })
    }
    if (numericAmount % 10 !== 0) {
        return NextResponse.json({ error: 'Bet amount must be a multiple of 10' }, { status: 400 })
    }

    // Validate category/target combination
    if (category === 'jodi' && target !== 'jodi_full') {
        return NextResponse.json({ error: 'Jodi bets must use jodi_full target' }, { status: 400 })
    }
    if (category !== 'jodi' && target === 'jodi_full') {
        return NextResponse.json({ error: 'Only jodi bets can use jodi_full target' }, { status: 400 })
    }

    // Get or create game session using RPC function (bypasses RLS)
    const { data: gameSessionId, error: sessionError } = await supabase
        .rpc('get_or_create_session', {
            p_date: gameDate,
            p_session: sessionName
        })

    if (sessionError || !gameSessionId) {
        console.error('Session error:', sessionError)
        return NextResponse.json({ error: 'Failed to create game session' }, { status: 500 })
    }

    // Get or create player
    let playerId = existingPlayerId

    if (!playerId && playerName) {
        // Check if player already exists for this staff
        if (playerPhone) {
            const { data: existingPlayer } = await supabase
                .from('players')
                .select('id')
                .eq('phone', playerPhone)
                .eq('created_by', profile.id)
                .single()

            if (existingPlayer) {
                playerId = existingPlayer.id
            }
        }

        // Create new player if not found
        if (!playerId) {
            const { data: newPlayer, error: playerError } = await supabase
                .from('players')
                .insert({
                    name: playerName,
                    phone: playerPhone || null,
                    created_by: profile.id
                })
                .select('id')
                .single()

            if (playerError) {
                return NextResponse.json({ error: 'Failed to create player' }, { status: 500 })
            }
            playerId = newPlayer.id
        }
    }

    if (!playerId) {
        return NextResponse.json({ error: 'Player information required' }, { status: 400 })
    }

    // Insert bet - the database trigger will validate timing and other rules
    const { data: bet, error: betError } = await supabase
        .from('bets')
        .insert({
            game_session_id: gameSessionId,
            player_id: playerId,
            staff_id: profile.id,
            category: category as BetCategory,
            target: target as BetTarget,
            selected_number: selectedNumber,
            amount: amount
        })
        .select()
        .single()

    if (betError) {
        // The trigger will raise detailed exceptions for validation failures
        return NextResponse.json({ error: betError.message }, { status: 400 })
    }

    return NextResponse.json({ bet }, { status: 201 })
}
