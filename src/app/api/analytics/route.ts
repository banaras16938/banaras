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

        // Jodi data aggregation
        // For CLOSE target: we calculate exact jodi (open_single + close_single)
        // For OPEN target: we estimate max jodi risk (all jodis starting with open_single)
        const jodiData = getAggregatedData(liabilityData || [], 'jodi')

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

            // 3. Jodi Liability
            if (target === 'open') {
                // For OPEN target: Estimate MAX potential jodi payout
                // If we pick this open single, any jodi starting with this digit could win
                // Per SRS: "estimates the max potential payout for Jodis 00-09"
                // We calculate the SUM of all jodi bets starting with this single
                // (conservative approach - assumes we might pick any close single)
                let maxJodiRisk = 0
                let jodiRelatedBets = 0
                for (let closeSingle = 0; closeSingle <= 9; closeSingle++) {
                    const potentialJodi = single + closeSingle.toString()
                    const jData = jodiData.get(potentialJodi)
                    if (jData) {
                        // Track the maximum jodi liability (worst case scenario)
                        if (jData.liability > maxJodiRisk) {
                            maxJodiRisk = jData.liability
                        }
                        jodiRelatedBets += jData.bets
                    }
                }
                totalLiability += maxJodiRisk
                totalBets += jodiRelatedBets
            } else if (target === 'close' && session?.open_single) {
                // For CLOSE target: Calculate exact jodi
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

        // ==========================================
        // RECOMMENDATION LISTS (Per SRS Requirements)
        // ==========================================

        // List A: Target Match - Filter by ±2% tolerance of slider value
        const PAYOUT_TOLERANCE = 2 // ±2% tolerance
        const targetMatch = results
            .filter(r => Math.abs(r.payoutPercentage - targetPayout) <= PAYOUT_TOLERANCE)
            .sort((a, b) => Math.abs(a.payoutPercentage - targetPayout) - Math.abs(b.payoutPercentage - targetPayout))
            .slice(0, 10)

        // List B: System Recommendations - Top 5 lowest payout options (must have bets)
        const systemRecommendations = results
            .filter(r => r.totalBets > 0)
            .sort((a, b) => a.totalLiability - b.totalLiability)
            .slice(0, 5)

        // List C: Low Bets - Bottom 20th percentile by bet volume
        const betsWithVolume = results.filter(r => r.totalBets > 0)
        const sortedByBets = [...betsWithVolume].sort((a, b) => a.totalBets - b.totalBets)
        const percentile20Count = Math.max(Math.ceil(sortedByBets.length * 0.2), 1)
        const lowBets = sortedByBets.slice(0, Math.min(percentile20Count, 10))

        // List D: No Bets (Ghost Numbers) - Zero liability on triple, single, AND jodi
        const noBets = results
            .filter(r => r.totalBets === 0 && r.totalLiability === 0)
            .slice(0, 10)

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

    // ==========================================
    // TYPE: HISAB-KITAB (Daily staff settlement view)
    // ==========================================
    if (type === 'hisab-kitab') {
        if (profile.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        // Get today and yesterday dates
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        const todayStr = today.toISOString().split('T')[0]
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        // Use provided date or default to today
        const selectedDate = gameDate || todayStr

        // Validate date is today or yesterday only
        if (selectedDate !== todayStr && selectedDate !== yesterdayStr) {
            return NextResponse.json({ error: 'Only today and yesterday data is available' }, { status: 400 })
        }

        // Get staff performance data for the selected date
        const { data: performanceData, error } = await supabase
            .from('view_staff_performance')
            .select('*')
            .eq('game_date', selectedDate)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Get staff names
        const { data: staffProfiles } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('role', 'staff')

        const staffMap = new Map(staffProfiles?.map(p => [p.id, p]) || [])

        // Get bet counts for the selected date
        const { data: sessions } = await supabase
            .from('game_sessions')
            .select('id')
            .eq('game_date', selectedDate)

        const sessionIds = sessions?.map(s => s.id) || []

        let betStats = { total: 0, won: 0, lost: 0 }
        if (sessionIds.length > 0) {
            const { data: bets } = await supabase
                .from('bets')
                .select('status')
                .in('game_session_id', sessionIds)

            if (bets) {
                betStats.total = bets.length
                betStats.won = bets.filter(b => b.status === 'won').length
                betStats.lost = bets.filter(b => b.status === 'lost').length
            }
        }

        // Aggregate by staff with session breakdown
        const staffBreakdown = new Map<string, {
            staffId: string
            staffEmail: string
            staffName: string
            morningCollection: number
            morningPayout: number
            morningProfit: number
            nightCollection: number
            nightPayout: number
            nightProfit: number
            totalCollection: number
            totalPayout: number
            totalProfit: number
            totalBets: number
        }>()

        performanceData?.forEach(row => {
            const staffInfo = staffMap.get(row.staff_id)
            const existing = staffBreakdown.get(row.staff_id) || {
                staffId: row.staff_id,
                staffEmail: row.staff_email,
                staffName: staffInfo?.name || row.staff_email,
                morningCollection: 0,
                morningPayout: 0,
                morningProfit: 0,
                nightCollection: 0,
                nightPayout: 0,
                nightProfit: 0,
                totalCollection: 0,
                totalPayout: 0,
                totalProfit: 0,
                totalBets: 0
            }

            const collection = Number(row.total_collection || 0)
            const payout = Number(row.total_payouts_given || 0)
            const profit = Number(row.profit || 0)
            const bets = Number(row.total_bets_placed || 0)

            if (row.session_name === 'morning') {
                existing.morningCollection = collection
                existing.morningPayout = payout
                existing.morningProfit = profit
            } else {
                existing.nightCollection = collection
                existing.nightPayout = payout
                existing.nightProfit = profit
            }

            existing.totalCollection += collection
            existing.totalPayout += payout
            existing.totalProfit += profit
            existing.totalBets += bets

            staffBreakdown.set(row.staff_id, existing)
        })

        // Calculate overall summary
        const staffList = Array.from(staffBreakdown.values())
        const summary = {
            totalCollection: staffList.reduce((sum, s) => sum + s.totalCollection, 0),
            totalPayout: staffList.reduce((sum, s) => sum + s.totalPayout, 0),
            netProfit: staffList.reduce((sum, s) => sum + s.totalProfit, 0),
            totalBets: betStats.total,
            wonBets: betStats.won,
            lostBets: betStats.lost
        }

        return NextResponse.json({
            date: selectedDate,
            isToday: selectedDate === todayStr,
            summary,
            staffBreakdown: staffList.sort((a, b) => b.totalProfit - a.totalProfit)
        })
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

    // Verify PIN for hisab-kitab critical data
    if (action === 'verify_pin') {
        const { pin } = body
        const STATIC_PIN = '6747'

        if (pin === STATIC_PIN) {
            return NextResponse.json({ success: true, verified: true })
        } else {
            return NextResponse.json({ success: false, verified: false, error: 'Invalid PIN' }, { status: 401 })
        }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
