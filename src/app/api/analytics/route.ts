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

        if (totalCollection === 0) {
            // Generate no-bet triples
            const noBets = []
            for (let i = 0; i < 10; i++) {
                const triple = i.toString().padStart(3, '0')
                noBets.push({
                    triple,
                    single: calculateSingle(triple),
                    totalBets: 0,
                    totalLiability: 0,
                    payoutPercentage: 0,
                    profitPercentage: 100
                })
            }

            return NextResponse.json({
                recommendations: {
                    totalCollection: 0,
                    targetMatch: [],
                    systemRecommendations: [],
                    lowBets: [],
                    noBets
                }
            })
        }

        // Process liability data into triple recommendations
        const tripleMap = new Map<string, {
            totalBets: number,
            totalLiability: number
        }>()

        // Initialize map with sampled triples
        for (let i = 0; i < 1000; i += 10) {
            const triple = i.toString().padStart(3, '0')
            tripleMap.set(triple, { totalBets: 0, totalLiability: 0 })
        }

        // Calculate liability for each potential result
        for (const [triple, data] of tripleMap) {
            const single = calculateSingle(triple)
            let liability = 0
            let betsAmount = 0

            // Find matching bets from liability report
            const tripleBets = liabilityData?.filter(
                l => l.category === 'triple' && l.target === target && l.selected_number === triple
            )
            const singleBets = liabilityData?.filter(
                l => l.category === 'single' && l.target === target && l.selected_number === single.toString()
            )

            tripleBets?.forEach(b => {
                liability += Number(b.potential_liability || 0)
                betsAmount += Number(b.total_bet_amount || 0)
            })

            singleBets?.forEach(b => {
                liability += Number(b.potential_liability || 0)
                betsAmount += Number(b.total_bet_amount || 0)
            })

            // If close result, include jodi liability
            if (target === 'close' && session?.open_single) {
                const jodi = session.open_single + single.toString()
                const jodiBets = liabilityData?.filter(
                    l => l.category === 'jodi' && l.selected_number === jodi
                )
                jodiBets?.forEach(b => {
                    liability += Number(b.potential_liability || 0)
                    betsAmount += Number(b.total_bet_amount || 0)
                })
            }

            tripleMap.set(triple, { totalBets: betsAmount, totalLiability: liability })
        }

        // Convert to results array
        const results = Array.from(tripleMap.entries()).map(([triple, data]) => {
            const payoutPercentage = totalCollection > 0
                ? (data.totalLiability / totalCollection) * 100
                : 0
            return {
                triple,
                single: calculateSingle(triple),
                totalBets: data.totalBets,
                totalLiability: data.totalLiability,
                payoutPercentage: Math.round(payoutPercentage * 100) / 100,
                profitPercentage: Math.round((100 - payoutPercentage) * 100) / 100
            }
        })

        const tolerance = 3

        return NextResponse.json({
            recommendations: {
                totalCollection,
                targetMatch: results
                    .filter(r => Math.abs(r.payoutPercentage - targetPayout) <= tolerance)
                    .sort((a, b) => Math.abs(a.payoutPercentage - targetPayout) - Math.abs(b.payoutPercentage - targetPayout))
                    .slice(0, 10),
                systemRecommendations: results
                    .filter(r => r.totalLiability > 0)
                    .sort((a, b) => b.profitPercentage - a.profitPercentage)
                    .slice(0, 10),
                lowBets: results
                    .filter(r => r.totalBets > 0 && r.totalBets < totalCollection * 0.01)
                    .sort((a, b) => a.totalBets - b.totalBets)
                    .slice(0, 10),
                noBets: results
                    .filter(r => r.totalLiability === 0)
                    .slice(0, 10)
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
