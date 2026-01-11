import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// ==========================================
// STAFF STATS API ROUTE
// ==========================================

// GET: Get staff performance statistics
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
    const staffId = searchParams.get('staffId')

    // Staff can only see their own stats, admin can view any staff
    const targetStaffId = profile.role === 'admin' && staffId ? staffId : profile.id

    // Get today's date in IST
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const istNow = new Date(now.getTime() + istOffset)
    const today = istNow.toISOString().split('T')[0]

    // Calculate date ranges
    const weekAgo = new Date(istNow)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoStr = weekAgo.toISOString().split('T')[0]

    const monthAgo = new Date(istNow)
    monthAgo.setDate(monthAgo.getDate() - 30)
    const monthAgoStr = monthAgo.toISOString().split('T')[0]

    // Get bets with game session info for statistics
    const { data: allBets, error: betsError } = await supabase
        .from('bets')
        .select(`
            id,
            amount,
            status,
            winning_amount,
            created_at,
            game_session:game_session_id (game_date, session_name)
        `)
        .eq('staff_id', targetStaffId)
        .gte('created_at', monthAgoStr)
        .order('created_at', { ascending: false })

    if (betsError) {
        return NextResponse.json({ error: betsError.message }, { status: 500 })
    }

    // Calculate statistics
    const calculateStats = (bets: typeof allBets) => {
        if (!bets || bets.length === 0) {
            return {
                totalBets: 0,
                totalCollection: 0,
                totalPayout: 0,
                profit: 0,
                profitPercent: 0,
                pendingBets: 0,
                wonBets: 0,
                lostBets: 0
            }
        }

        const totalBets = bets.length
        const totalCollection = bets.reduce((sum, bet) => sum + Number(bet.amount), 0)
        const totalPayout = bets
            .filter(bet => bet.status === 'won')
            .reduce((sum, bet) => sum + Number(bet.winning_amount), 0)
        const profit = totalCollection - totalPayout
        const profitPercent = totalCollection > 0 ? (profit / totalCollection) * 100 : 0
        const pendingBets = bets.filter(bet => bet.status === 'pending').length
        const wonBets = bets.filter(bet => bet.status === 'won').length
        const lostBets = bets.filter(bet => bet.status === 'lost').length

        return {
            totalBets,
            totalCollection,
            totalPayout,
            profit,
            profitPercent: Math.round(profitPercent * 10) / 10,
            pendingBets,
            wonBets,
            lostBets
        }
    }

    // Filter bets by date range
    type GameSessionRelation = { game_date: string; session_name: string } | null

    const todayBets = allBets?.filter(bet => {
        const gameSession = bet.game_session as unknown as GameSessionRelation
        return gameSession?.game_date === today
    }) || []

    const weekBets = allBets?.filter(bet => {
        const gameSession = bet.game_session as unknown as GameSessionRelation
        return gameSession?.game_date && gameSession.game_date >= weekAgoStr
    }) || []

    const monthBets = allBets || []

    // Calculate daily breakdown for the last 7 days
    const dailyBreakdown: Array<{
        date: string
        bets: number
        collection: number
        payout: number
        profit: number
        winners: number
    }> = []

    for (let i = 0; i < 7; i++) {
        const date = new Date(istNow)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]

        const dayBets = allBets?.filter(bet => {
            const gameSession = bet.game_session as unknown as GameSessionRelation
            return gameSession?.game_date === dateStr
        }) || []

        const stats = calculateStats(dayBets)
        dailyBreakdown.push({
            date: dateStr,
            bets: stats.totalBets,
            collection: stats.totalCollection,
            payout: stats.totalPayout,
            profit: stats.profit,
            winners: stats.wonBets
        })
    }

    // Get recent bets for dashboard (last 10)
    const recentBets = allBets?.slice(0, 10).map(bet => ({
        id: bet.id,
        amount: bet.amount,
        status: bet.status,
        winning_amount: bet.winning_amount,
        created_at: bet.created_at,
        game_session: bet.game_session
    })) || []

    return NextResponse.json({
        today: calculateStats(todayBets),
        week: calculateStats(weekBets),
        month: calculateStats(monthBets),
        dailyBreakdown,
        recentBets
    })
}
