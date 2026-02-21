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

        if (!session) {
            return NextResponse.json({
                recommendations: {
                    totalCollection: 0,
                    targetMatch: [],
                    systemRecommendations: [],
                    lowBets: [],
                    noBets: [],
                    betStats: { singleCount: 0, singleAmount: 0, tripleCount: 0, tripleAmount: 0, jodiCount: 0, jodiAmount: 0, totalPending: 0 }
                }
            })
        }

        // Get payout config
        const { data: configData } = await supabase
            .from('game_config')
            .select('*')
            .single()
        const payoutSingle = Number(configData?.payout_single || 9)
        const payoutJodi = Number(configData?.payout_jodi || 90)
        const payoutTriple = Number(configData?.payout_triple || 800)

        // Fetch ALL pending bets for this session
        const { data: allBets } = await supabase
            .from('bets')
            .select('amount, category, target, selected_number, status')
            .eq('game_session_id', session.id)
            .eq('status', 'pending')

        const bets = allBets || []

        // ==========================================
        // TARGET-SPECIFIC COLLECTION
        // ==========================================
        // Per SRS: Jodi betting stops with OPEN (12:30 morning / 17:30 night)
        // So jodi bets are always included for BOTH open and close declarations
        // For OPEN: open bets + jodi bets (both locked at same time)
        // For CLOSE: close bets + jodi bets (jodi payout depends on close result too)
        let targetCollection = 0
        if (target === 'open') {
            targetCollection = bets
                .filter(b => b.target === 'open' || b.target === 'jodi_full')
                .reduce((s, b) => s + Number(b.amount), 0)
        } else {
            targetCollection = bets
                .filter(b => b.target === 'close' || b.target === 'jodi_full')
                .reduce((s, b) => s + Number(b.amount), 0)
        }

        // Also compute total collection (all pending bets) for reference
        const totalCollection = bets.reduce((s, b) => s + Number(b.amount), 0)

        // ==========================================
        // BET STATS for KPIs
        // ==========================================
        // Jodi bets are always relevant (they lock with open, resolve with close)
        const targetBets = bets.filter(b => {
            if (target === 'open') return b.target === 'open' || b.target === 'jodi_full'
            return b.target === 'close' || b.target === 'jodi_full'
        })
        const betStats = {
            singleCount: targetBets.filter(b => b.category === 'single').length,
            singleAmount: targetBets.filter(b => b.category === 'single').reduce((s, b) => s + Number(b.amount), 0),
            tripleCount: targetBets.filter(b => b.category === 'triple').length,
            tripleAmount: targetBets.filter(b => b.category === 'triple').reduce((s, b) => s + Number(b.amount), 0),
            jodiCount: targetBets.filter(b => b.category === 'jodi').length,
            jodiAmount: targetBets.filter(b => b.category === 'jodi').reduce((s, b) => s + Number(b.amount), 0),
            totalPending: targetBets.length,
        }

        // ==========================================
        // PRE-AGGREGATE BET DATA for O(1) lookups
        // ==========================================
        // triple bets by number + target
        const tripleBetMap = new Map<string, number>()
        // single bets by number + target
        const singleBetMap = new Map<string, number>()
        // jodi bets by number
        const jodiBetMap = new Map<string, number>()

        for (const b of bets) {
            const amt = Number(b.amount)
            if (b.category === 'triple' && b.target === target) {
                tripleBetMap.set(b.selected_number, (tripleBetMap.get(b.selected_number) || 0) + amt)
            } else if (b.category === 'single' && b.target === target) {
                singleBetMap.set(b.selected_number, (singleBetMap.get(b.selected_number) || 0) + amt)
            } else if (b.category === 'jodi' && b.target === 'jodi_full') {
                jodiBetMap.set(b.selected_number, (jodiBetMap.get(b.selected_number) || 0) + amt)
            }
        }

        // ==========================================
        // CALCULATE ALL 1000 TRIPLES
        // ==========================================
        const results: any[] = []

        for (let i = 0; i < 1000; i++) {
            const triple = i.toString().padStart(3, '0')
            const singleDigit = calculateSingle(triple)
            const single = singleDigit.toString()

            // 1. Triple liability
            const tripleBetAmt = tripleBetMap.get(triple) || 0
            const tripleLiab = tripleBetAmt * payoutTriple

            // 2. Single liability
            const singleBetAmt = singleBetMap.get(single) || 0
            const singleLiab = singleBetAmt * payoutSingle

            // 3. Jodi liability + exposed jodi numbers
            let jodiBetAmt = 0
            let jodiLiab = 0
            const jodiNumbers: string[] = []

            if (target === 'open') {
                // Open: jodi could be single + any close digit (0-9)
                // Use MAX single jodi risk (worst case)
                let maxJodiLiab = 0
                for (let c = 0; c <= 9; c++) {
                    const potentialJodi = single + c.toString()
                    jodiNumbers.push(potentialJodi)
                    const jAmt = jodiBetMap.get(potentialJodi) || 0
                    jodiBetAmt += jAmt
                    const jLiab = jAmt * payoutJodi
                    if (jLiab > maxJodiLiab) maxJodiLiab = jLiab
                }
                jodiLiab = maxJodiLiab
            } else if (target === 'close' && session.open_single) {
                // Close: exact jodi = open_single + derived single
                const exactJodi = session.open_single + single
                jodiNumbers.push(exactJodi)
                jodiBetAmt = jodiBetMap.get(exactJodi) || 0
                jodiLiab = jodiBetAmt * payoutJodi
            } else if (target === 'close' && !session.open_single) {
                // Close but open not declared yet: all jodis ending with this single
                for (let o = 0; o <= 9; o++) {
                    const potentialJodi = o.toString() + single
                    jodiNumbers.push(potentialJodi)
                    const jAmt = jodiBetMap.get(potentialJodi) || 0
                    jodiBetAmt += jAmt
                    const jLiab = jAmt * payoutJodi
                    if (jLiab > jodiLiab) jodiLiab = jLiab
                }
            }

            const totalLiability = tripleLiab + singleLiab + jodiLiab
            const totalBetsAmt = tripleBetAmt + singleBetAmt + jodiBetAmt

            const payoutPercentage = targetCollection > 0
                ? (totalLiability / targetCollection) * 100
                : 0

            results.push({
                triple,
                single: singleDigit,
                totalBets: totalBetsAmt,
                totalLiability,
                payoutPercentage: Math.round(payoutPercentage * 100) / 100,
                profitPercentage: Math.round((100 - payoutPercentage) * 100) / 100,
                tripleBets: tripleBetAmt,
                tripleLiability: tripleLiab,
                singleBets: singleBetAmt,
                singleLiability: singleLiab,
                jodiBets: jodiBetAmt,
                jodiLiability: jodiLiab,
                jodiNumbers,
            })
        }

        // ==========================================
        // THE 4 RESULT LISTS
        // ==========================================

        // List 1: EXACT Target Match
        // Only show numbers where payout % is exactly the selected integer
        const targetMatch = results
            .filter(r => Math.round(r.payoutPercentage) === Math.round(targetPayout))
            .sort((a, b) => Math.abs(a.payoutPercentage - targetPayout) - Math.abs(b.payoutPercentage - targetPayout))

        // List 2: LEVERAGE — ±10% of the selected percentage
        const leverageResults = results
            .filter(r => {
                const diff = Math.abs(r.payoutPercentage - targetPayout)
                return diff > 0 && diff <= 10
            })
            .sort((a, b) => Math.abs(a.payoutPercentage - targetPayout) - Math.abs(b.payoutPercentage - targetPayout))

        // List 3: LOW BETS — bottom 20th percentile by total bet volume (non-zero only)
        const betsWithVolume = results.filter(r => r.totalBets > 0)
        const sortedByBets = [...betsWithVolume].sort((a, b) => a.totalBets - b.totalBets)
        const percentile20Count = Math.max(Math.ceil(sortedByBets.length * 0.2), 1)
        const lowBets = sortedByBets.slice(0, percentile20Count)

        // List 4: GHOST NUMBERS — no triple bets AND no jodi bets
        // Per SRS: "all possible triple Bet Amount == 0 AND all possible jodi Bet Amount == 0"
        // Singles are ignored for ghost calculation
        const noBets = results.filter(r => r.tripleBets === 0 && r.jodiBets === 0)

        return NextResponse.json({
            recommendations: {
                totalCollection,
                targetCollection,
                targetMatch,
                systemRecommendations: leverageResults,
                lowBets,
                noBets,
                betStats,
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

        // Get PIN from database
        const { data: pinSetting } = await supabase
            .from('admin_settings')
            .select('value')
            .eq('key', 'hisab_kitab_pin')
            .single()

        const storedPin = pinSetting?.value || '6747' // Fallback to default

        if (pin === storedPin) {
            return NextResponse.json({ success: true, verified: true })
        } else {
            return NextResponse.json({ success: false, verified: false, error: 'Invalid PIN' }, { status: 401 })
        }
    }

    // Update PIN for hisab-kitab
    if (action === 'update_pin') {
        const { currentPin, newPin } = body

        if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
        }

        // Get current PIN from database
        const { data: pinSetting } = await supabase
            .from('admin_settings')
            .select('value')
            .eq('key', 'hisab_kitab_pin')
            .single()

        const storedPin = pinSetting?.value || '6747'

        // Verify current PIN
        if (currentPin !== storedPin) {
            return NextResponse.json({ error: 'Current PIN is incorrect' }, { status: 401 })
        }

        // Update PIN
        const { error } = await supabase
            .from('admin_settings')
            .upsert({ key: 'hisab_kitab_pin', value: newPin, updated_at: new Date().toISOString() })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    }

    // Get PIN (masked for security, just returns if PIN is set)
    if (action === 'get_pin_status') {
        const { data: pinSetting } = await supabase
            .from('admin_settings')
            .select('value, updated_at')
            .eq('key', 'hisab_kitab_pin')
            .single()

        return NextResponse.json({
            hasPin: !!pinSetting?.value,
            lastUpdated: pinSetting?.updated_at || null
        })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
