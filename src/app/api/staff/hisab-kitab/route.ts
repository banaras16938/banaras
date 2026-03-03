import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
    const supabase = await createClient()

    // Auth check — must be staff
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, name')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'staff') {
        return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const staffId = profile.id
    const today = new Date().toISOString().split('T')[0]

    // Get game sessions for today
    const { data: sessions } = await supabase
        .from('game_sessions')
        .select('id, session_name')
        .eq('game_date', today)

    const sessionList = sessions || []
    const sessionIds = sessionList.map(s => s.id)
    const sessionNameMap = new Map(sessionList.map(s => [s.id, s.session_name]))

    // Fetch only this staff's bets
    let allBets: any[] = []
    if (sessionIds.length > 0) {
        const { data: betsData } = await supabase
            .from('bets')
            .select('id, amount, category, target, selected_number, status, winning_amount, created_at, game_session_id')
            .eq('staff_id', staffId)
            .in('game_session_id', sessionIds)
            .order('created_at', { ascending: false })

        allBets = betsData || []
    }

    // Build session breakdown
    interface TargetData {
        collection: number
        payout: number
        betCount: number
        wonCount: number
        lostCount: number
        pendingCount: number
        categories: Record<string, { collection: number; payout: number; betCount: number }>
    }

    interface SessionData {
        open: TargetData
        close: TargetData
        jodi: TargetData
        collection: number
        payout: number
        profit: number
    }

    const emptyCats = () => ({
        single: { collection: 0, payout: 0, betCount: 0 },
        single_patti: { collection: 0, payout: 0, betCount: 0 },
        double_patti: { collection: 0, payout: 0, betCount: 0 },
        triple_patti: { collection: 0, payout: 0, betCount: 0 },
        jodi: { collection: 0, payout: 0, betCount: 0 },
    })

    const emptyTarget = (): TargetData => ({
        collection: 0, payout: 0, betCount: 0, wonCount: 0, lostCount: 0, pendingCount: 0,
        categories: emptyCats(),
    })

    const emptySession = (): SessionData => ({
        open: emptyTarget(), close: emptyTarget(), jodi: emptyTarget(),
        collection: 0, payout: 0, profit: 0,
    })

    const morning: SessionData = emptySession()
    const night: SessionData = emptySession()

    for (const bet of allBets) {
        const sessionName = sessionNameMap.get(bet.game_session_id) || 'morning'
        const session = sessionName === 'morning' ? morning : night
        const amt = Number(bet.amount)
        const winAmt = Number(bet.winning_amount || 0)

        // Determine target bucket
        let bucket: TargetData
        if (bet.target === 'open') bucket = session.open
        else if (bet.target === 'close') bucket = session.close
        else bucket = session.jodi

        bucket.collection += amt
        bucket.payout += winAmt
        bucket.betCount++
        if (bet.status === 'won') bucket.wonCount++
        else if (bet.status === 'lost') bucket.lostCount++
        else bucket.pendingCount++

        // Category breakdown
        const catKey = bet.category as string
        const cat = (bucket.categories as Record<string, any>)[catKey]
        if (cat) {
            cat.collection += amt
            cat.payout += winAmt
            cat.betCount++
        }

        // Update session totals
        session.collection = session.open.collection + session.close.collection + session.jodi.collection
        session.payout = session.open.payout + session.close.payout + session.jodi.payout
        session.profit = session.collection - session.payout
    }

    const totalCollection = morning.collection + night.collection
    const totalPayout = morning.payout + night.payout
    const totalProfit = totalCollection - totalPayout

    // Settlement: positive profit means staff owes admin, negative means admin owes staff
    return NextResponse.json({
        date: today,
        staffName: profile.name || 'Staff',
        morning,
        night,
        totalCollection,
        totalPayout,
        totalProfit,
        totalBets: allBets.length,
        totalPending: allBets.filter(b => b.status === 'pending').length,
        totalWon: allBets.filter(b => b.status === 'won').length,
        totalLost: allBets.filter(b => b.status === 'lost').length,
    })
}
