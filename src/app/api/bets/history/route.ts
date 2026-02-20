import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// ==========================================
// BETS HISTORY API — Trading-Style
// Returns { positions, orders } for staff
// ==========================================

export async function GET(request: NextRequest) {
    const supabase = await createClient()

    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Profile + active check
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, is_active')
        .eq('id', user.id)
        .single()

    if (!profile || !profile.is_active) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // 3. Parse query params
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    // Default to today (IST)
    const today = dateParam || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
        return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 })
    }

    // 4. Fetch bets with game session data
    // RLS ensures staff can only see their own bets (policy: staff_id = auth.uid())
    let query = supabase
        .from('bets')
        .select(`
            id,
            category,
            target,
            selected_number,
            amount,
            status,
            winning_amount,
            created_at,
            player:player_id ( name, phone ),
            game_session:game_session_id (
                id,
                game_date,
                session_name,
                open_triple,
                open_single,
                close_triple,
                close_single,
                jodi_result
            )
        `)
        .order('created_at', { ascending: false })

    // Staff can only see their own bets (also enforced by RLS)
    if (profile.role !== 'admin') {
        query = query.eq('staff_id', profile.id)
    }

    // 5. Execute with limit
    const { data: bets, error } = await query.limit(1000)

    if (error) {
        console.error('Bets history fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch bets' }, { status: 500 })
    }

    // 6. Filter to requested date and split into positions / orders
    type BetRow = NonNullable<typeof bets>[number]

    const positions: BetRow[] = []
    const orders: BetRow[] = []

    for (const bet of (bets || [])) {
        // Type guard for game_session
        const gs = bet.game_session as { game_date?: string } | null
        if (!gs || gs.game_date !== today) continue

        if (bet.status === 'pending') {
            positions.push(bet)
        } else {
            orders.push(bet)
        }
    }

    return NextResponse.json({ positions, orders, date: today })
}
