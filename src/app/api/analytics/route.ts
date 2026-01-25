import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SessionType, BetTarget, PAYOUT_MULTIPLIERS } from '@/types/types'

// ==========================================
// ANALYTICS API ROUTE
// ==========================================

// Helper: Calculate single from triple
function calculateSingle(triple: string): number {
    if (!triple || triple.length !== 3) return 0
    const sum = triple.split('').reduce((acc, digit) => acc + parseInt(digit), 0)
    return sum % 10
}

// GET: Get analytics data
export async function GET(request: NextRequest) {
    const supabase = await createClient()

    // Verify staff or admin
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
    const type = searchParams.get('type') // 'summary', 'recommendations', 'liability', 'staff'
    const gameDate = searchParams.get('date')
    const sessionName = searchParams.get('session') as SessionType | null

    // ==========================================
    // TYPE: SUMMARY (Daily profit/loss summary)
    // ==========================================
    if (type === 'summary' || !type) {
        const { data: performanceData, error } = await supabase
            .from('view_staff_performance')
            .select('*')
            .order('game_date', { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Filter by staff if not admin
        let data = performanceData || []
        if (profile.role !== 'admin') {
            data = data.filter(d => d.staff_id === profile.id)
        }

        // Aggregate by date if needed
        if (gameDate) {
            data = data.filter(d => d.game_date === gameDate)
        }

        return NextResponse.json({ analytics: data })
    }

    // ==========================================
    // TYPE: LIABILITY (For admin result selection)
    // ==========================================
    if (type === 'liability') {
        if (profile.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        if (!gameDate || !sessionName) {
            return NextResponse.json({ error: 'Date and session required' }, { status: 400 })
        }

        const target = searchParams.get('target') as BetTarget || 'open'

        const { data: liabilityData, error } = await supabase
            .from('view_liability_report')
            .select('*')
            .eq('game_date', gameDate)
            .eq('session_name', sessionName)
            .eq('target', target)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ liability: liabilityData || [] })
    }

    // ==========================================
    // TYPE: RECOMMENDATIONS (4 Lists for Admin)
    // ==========================================
    if (type === 'recommendations') {
        if (profile.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        if (!gameDate || !sessionName) {
            return NextResponse.json({ error: 'Date and session required' }, { status: 400 })
        }

        const target = searchParams.get('target') as BetTarget || 'open'
        const targetPayout = parseFloat(searchParams.get('targetPayout') || '15')

        // Get game session
        const { data: session } = await supabase
            .from('game_sessions')
            .select('*')
            .eq('game_date', gameDate)
            .eq('session_name', sessionName)
            .single()

        // Get liability data
        const { data: liabilityData } = await supabase
            .from('view_liability_report')
            .select('*')
            .eq('game_date', gameDate)
            .eq('session_name', sessionName)

        // Get total collection for this session
        const { data: bets } = await supabase
            .from('bets')
            .select('amount')
            .eq('game_session_id', session?.id || '')

        const totalCollection = bets?.reduce((sum, b) => sum + Number(b.amount), 0) || 0

        // Helper to aggregate liability data
        // Uses Map for O(1) lookup instead of array filtering O(N)
        const getAggregatedData = (
            data: any[],
            category: string,
            targetFilter?: string
        ): Map<string, { liability: number, bets: number }> => {
            const map = new Map()

            const filtered = data.filter(d =>
                d.category === category &&
                (!targetFilter || d.target === targetFilter)
            )

            filtered.forEach(d => {
                const key = d.selected_number
                const current = map.get(key) || { liability: 0, bets: 0 }
                map.set(key, {
                    liability: current.liability + Number(d.potential_liability || 0),
                    bets: current.bets + Number(d.total_bet_amount || 0)
                })
            })

            return map
        }

        // Pre-aggregate data for O(1) lookups
        const tripleData = getAggregatedData(liabilityData || [], 'triple', target)
        const singleData = getAggregatedData(liabilityData || [], 'single', target)
        // Jodi data is only relevant if target is 'close' and we have an open single
        const jodiData = (target === 'close' && session?.open_single)
            ? getAggregatedData(liabilityData || [], 'jodi')
            : new Map()

        const results: any[] = []

        // Calculate metrics for all 1000 triples
        for (let i = 0; i < 1000; i++) {
            const triple = i.toString().padStart(3, '0')
            const single = calculateSingle(triple).toString()

            let totalLiability = 0
            let totalBets = 0

            // 1. Triple Liability
            const tData = tripleData.get(triple)
            if (tData) {
                totalLiability += tData.liability
                totalBets += tData.bets
            }

            // 2. Single Liability
            const sData = singleData.get(single)
            if (sData) {
                totalLiability += sData.liability
                totalBets += sData.bets
            }

            // 3. Jodi Liability (Only for Close target)
            if (target === 'close' && session?.open_single) {
                const jodi = session.open_single + single
                const jData = jodiData.get(jodi)
                if (jData) {
                    totalLiability += jData.liability
                    totalBets += jData.bets
                }
            }

            const payoutPercentage = totalCollection > 0
                ? (totalLiability / totalCollection) * 100
                : 0

            results.push({
                triple,
                single: parseInt(single),
                totalBets,
                totalLiability,
                payoutPercentage: Math.round(payoutPercentage * 100) / 100,
                profitPercentage: Math.round((100 - payoutPercentage) * 100) / 100
            })
        }

        // Filter Lists logic - Relaxed constraints for better suggestions

        // 1. Target Match: Sort by closeness to target payout
        const targetMatch = [...results]
            .sort((a, b) => Math.abs(a.payoutPercentage - targetPayout) - Math.abs(b.payoutPercentage - targetPayout))
            .slice(0, 10)

        // 2. System Recommendations (Best Profit): Highest profit % (must have some liability to not be ghost)
        const systemRecommendations = results
            .filter(r => r.totalLiability > 0)
            .sort((a, b) => b.profitPercentage - a.profitPercentage)
            .slice(0, 10)

        // 3. Low Bets: Lowest non-zero bets
        const lowBets = results
            .filter(r => r.totalBets > 0)
            .sort((a, b) => a.totalBets - b.totalBets)
            .slice(0, 10)

        // 4. Ghost (No Bets): Zero liability
        const noBets = results
            .filter(r => r.totalLiability === 0)
            .slice(0, 10) // First 10 is fine as they are all 0

        return NextResponse.json({
            recommendations: {
                totalCollection,
                targetMatch,
                systemRecommendations,
                lowBets,
                noBets
            }
        })
    }

    // ==========================================
    // TYPE: SCHEDULES (Get/Update game schedules)
    // ==========================================
    if (type === 'schedules') {
        const { data: schedules, error } = await supabase
            .from('game_schedules')
            .select('*')

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ schedules })
    }

    // ==========================================
    // TYPE: HOLIDAYS (Get holidays)
    // ==========================================
    if (type === 'holidays') {
        const { data: holidays, error } = await supabase
            .from('holidays')
            .select('*')
            .order('holiday_date', { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ holidays })
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
}

// POST: Admin actions (schedules, holidays)
export async function POST(request: NextRequest) {
    const supabase = await createClient()

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

    if (!profile || !profile.is_active || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    // Update game schedule
    if (action === 'update_schedule') {
        const { sessionName, schedule } = body

        const { error } = await supabase
            .from('game_schedules')
            .update(schedule)
            .eq('session_name', sessionName)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    }

    // Add holiday
    if (action === 'add_holiday') {
        const { holidayDate, description } = body

        const { error } = await supabase
            .from('holidays')
            .insert({ holiday_date: holidayDate, description })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    }

    // Remove holiday
    if (action === 'remove_holiday') {
        const { holidayDate } = body

        const { error } = await supabase
            .from('holidays')
            .delete()
            .eq('holiday_date', holidayDate)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
