import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SessionType, BetTarget, PAYOUT_MULTIPLIERS, PATTI_NUMBERS, PATTI_CATEGORIES, ALL_VALID_PATTIS, getPattiType, PattiCategory } from '@/types/types'

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
        const lookupTriple = searchParams.get('lookupTriple') || null

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
        const payoutSinglePatti = Number(configData?.payout_single_patti || 1400)
        const payoutDoublePatti = Number(configData?.payout_double_patti || 2800)
        const payoutTriplePatti = Number(configData?.payout_triple_patti || 8000)

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
            singlePattiCount: targetBets.filter(b => b.category === 'single_patti').length,
            singlePattiAmount: targetBets.filter(b => b.category === 'single_patti').reduce((s, b) => s + Number(b.amount), 0),
            doublePattiCount: targetBets.filter(b => b.category === 'double_patti').length,
            doublePattiAmount: targetBets.filter(b => b.category === 'double_patti').reduce((s, b) => s + Number(b.amount), 0),
            triplePattiCount: targetBets.filter(b => b.category === 'triple_patti').length,
            triplePattiAmount: targetBets.filter(b => b.category === 'triple_patti').reduce((s, b) => s + Number(b.amount), 0),
            jodiCount: targetBets.filter(b => b.category === 'jodi').length,
            jodiAmount: targetBets.filter(b => b.category === 'jodi').reduce((s, b) => s + Number(b.amount), 0),
            totalPending: targetBets.length,
        }

        // ==========================================
        // PRE-AGGREGATE BET DATA for O(1) lookups
        // ==========================================
        // patti bets by number + target (each patti type separate)
        const singlePattiBetMap = new Map<string, number>()
        const doublePattiBetMap = new Map<string, number>()
        const triplePattiBetMap = new Map<string, number>()
        // single bets by number + target
        const singleBetMap = new Map<string, number>()
        // jodi bets by number
        const jodiBetMap = new Map<string, number>()

        for (const b of bets) {
            const amt = Number(b.amount)
            if (b.category === 'single_patti' && b.target === target) {
                singlePattiBetMap.set(b.selected_number, (singlePattiBetMap.get(b.selected_number) || 0) + amt)
            } else if (b.category === 'double_patti' && b.target === target) {
                doublePattiBetMap.set(b.selected_number, (doublePattiBetMap.get(b.selected_number) || 0) + amt)
            } else if (b.category === 'triple_patti' && b.target === target) {
                triplePattiBetMap.set(b.selected_number, (triplePattiBetMap.get(b.selected_number) || 0) + amt)
            } else if (b.category === 'single' && b.target === target) {
                singleBetMap.set(b.selected_number, (singleBetMap.get(b.selected_number) || 0) + amt)
            } else if (b.category === 'jodi' && b.target === 'jodi_full') {
                jodiBetMap.set(b.selected_number, (jodiBetMap.get(b.selected_number) || 0) + amt)
            }
        }

        // ==========================================
        // CALCULATE ALL 220 VALID PATTIS
        // ==========================================
        const results: any[] = []

        // Iterate over all 220 valid pattis from the master data
        for (const pattiType of PATTI_CATEGORIES) {
            const groups = PATTI_NUMBERS[pattiType]
            for (const [singleDigit, pattis] of Object.entries(groups)) {
                for (const patti of pattis) {
                    const single = singleDigit

                    // 1. Single Patti liability for this specific number
                    const spBetAmt = singlePattiBetMap.get(patti) || 0
                    const spLiab = spBetAmt * payoutSinglePatti

                    // 2. Double Patti liability for this specific number
                    const dpBetAmt = doublePattiBetMap.get(patti) || 0
                    const dpLiab = dpBetAmt * payoutDoublePatti

                    // 3. Triple Patti liability for this specific number
                    const tpBetAmt = triplePattiBetMap.get(patti) || 0
                    const tpLiab = tpBetAmt * payoutTriplePatti

                    // 4. Single liability
                    const singleBetAmt = singleBetMap.get(single) || 0
                    const singleLiab = singleBetAmt * payoutSingle

                    // 5. Jodi liability + exposed jodi numbers
                    // Key insight: Admin controls the close result, so they can pick the
                    // close digit whose jodi has the LEAST bets (ideally zero).
                    // Therefore liability = MIN jodi bet × payout (best-case for admin).
                    let jodiBetAmt = 0
                    let jodiLiab = 0
                    const jodiNumbers: string[] = []
                    const jodiBreakdown: { number: string, amount: number }[] = []

                    if (target === 'open') {
                        // Open: jodi could be single + any close digit (0-9)
                        // Liability = MIN jodi bet (admin will choose close to minimize payout)
                        let minJodiAmt = Infinity
                        for (let c = 0; c <= 9; c++) {
                            const potentialJodi = single + c.toString()
                            jodiNumbers.push(potentialJodi)
                            const jAmt = jodiBetMap.get(potentialJodi) || 0
                            jodiBreakdown.push({ number: potentialJodi, amount: jAmt })
                            if (jAmt < minJodiAmt) {
                                minJodiAmt = jAmt
                            }
                        }
                        // If all jodis have bets, use the min; if any is 0, liability is 0
                        jodiBetAmt = minJodiAmt === Infinity ? 0 : minJodiAmt
                        jodiLiab = jodiBetAmt * payoutJodi
                    } else if (target === 'close' && session.open_single) {
                        // Close: exact jodi = open_single + derived single
                        const exactJodi = session.open_single + single
                        jodiNumbers.push(exactJodi)
                        jodiBetAmt = jodiBetMap.get(exactJodi) || 0
                        jodiBreakdown.push({ number: exactJodi, amount: jodiBetAmt })
                        jodiLiab = jodiBetAmt * payoutJodi
                    } else if (target === 'close' && !session.open_single) {
                        // Close but open not declared yet: all jodis ending with this single
                        // Admin controls open result too, so use MIN
                        let minJodiAmt = Infinity
                        for (let o = 0; o <= 9; o++) {
                            const potentialJodi = o.toString() + single
                            jodiNumbers.push(potentialJodi)
                            const jAmt = jodiBetMap.get(potentialJodi) || 0
                            jodiBreakdown.push({ number: potentialJodi, amount: jAmt })
                            if (jAmt < minJodiAmt) {
                                minJodiAmt = jAmt
                            }
                        }
                        jodiBetAmt = minJodiAmt === Infinity ? 0 : minJodiAmt
                        jodiLiab = jodiBetAmt * payoutJodi
                    }

                    const totalLiability = spLiab + dpLiab + tpLiab + singleLiab + jodiLiab
                    const totalBetsAmt = spBetAmt + dpBetAmt + tpBetAmt + singleBetAmt + jodiBetAmt

                    const payoutPercentage = targetCollection > 0
                        ? (totalLiability / targetCollection) * 100
                        : 0

                    results.push({
                        triple: patti,
                        pattiType,
                        single: parseInt(single),
                        totalBets: totalBetsAmt,
                        totalLiability,
                        payoutPercentage: Math.round(payoutPercentage * 100) / 100,
                        profitPercentage: Math.round((100 - payoutPercentage) * 100) / 100,
                        singlePattiBets: spBetAmt,
                        singlePattiLiability: spLiab,
                        doublePattiBets: dpBetAmt,
                        doublePattiLiability: dpLiab,
                        triplePattiBets: tpBetAmt,
                        triplePattiLiability: tpLiab,
                        singleBets: singleBetAmt,
                        singleLiability: singleLiab,
                        jodiBets: jodiBetAmt,
                        jodiLiability: jodiLiab,
                        jodiNumbers,
                        jodiBreakdown,
                    })
                }
            }
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

        // List 3: LOW BETS — all numbers sorted by total liability ascending
        // Zero-bet numbers appear first (safest), then lowest payout numbers
        const lowBets = [...results]
            .sort((a, b) => a.totalLiability - b.totalLiability)

        // List 4: GHOST NUMBERS — no bets at all on patti, single, AND jodi
        // Only show pattis where declaring them would cause ZERO payout
        const noBets = results.filter(r => r.singlePattiBets === 0 && r.doublePattiBets === 0 && r.triplePattiBets === 0 && r.singleBets === 0 && r.jodiBets === 0)

        // Optional: lookup a specific triple for Manual tab
        const lookupResult = lookupTriple ? results.find(r => r.triple === lookupTriple.padStart(3, '0')) || null : null

        return NextResponse.json({
            recommendations: {
                totalCollection,
                targetCollection,
                targetMatch,
                systemRecommendations: leverageResults,
                lowBets,
                noBets,
                betStats,
                lookupResult,
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

        // Get staff names
        const { data: staffProfiles } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('role', 'staff')

        const staffMap = new Map(staffProfiles?.map(p => [p.id, p]) || [])

        // Get game sessions for the selected date
        const { data: sessions } = await supabase
            .from('game_sessions')
            .select('id, session_name')
            .eq('game_date', selectedDate)

        const sessionList = sessions || []
        const sessionIds = sessionList.map(s => s.id)
        const sessionNameMap = new Map(sessionList.map(s => [s.id, s.session_name]))

        // Fetch ALL bets with player details for the selected date
        let allBets: any[] = []
        if (sessionIds.length > 0) {
            const { data: betsData } = await supabase
                .from('bets')
                .select(`
                    id, amount, category, target, selected_number, status, winning_amount, created_at,
                    staff_id, game_session_id,
                    players!inner(name)
                `)
                .in('game_session_id', sessionIds)
                .order('created_at', { ascending: false })

            allBets = betsData || []
        }

        // Overall bet stats
        const betStats = {
            total: allBets.length,
            won: allBets.filter(b => b.status === 'won').length,
            lost: allBets.filter(b => b.status === 'lost').length
        }

        // ==========================================
        // BUILD STAFF BREAKDOWN WITH OPEN/CLOSE/JODI
        // ==========================================
        interface CategoryBreakdown {
            collection: number
            payout: number
            profit: number
            betCount: number
        }

        interface TargetBreakdown {
            collection: number
            payout: number
            profit: number
            betCount: number
            wonCount: number
            lostCount: number
            pendingCount: number
            categories: Record<string, CategoryBreakdown>
        }

        interface SessionBreakdown {
            open: TargetBreakdown
            close: TargetBreakdown
            jodi: TargetBreakdown
            collection: number
            payout: number
            profit: number
        }

        interface StaffEntry {
            staffId: string
            staffEmail: string
            staffName: string
            morning: SessionBreakdown
            night: SessionBreakdown
            totalCollection: number
            totalPayout: number
            totalProfit: number
            totalBets: number
            bets: any[]
        }

        const emptyCat = (): CategoryBreakdown => ({ collection: 0, payout: 0, profit: 0, betCount: 0 })

        const emptyTarget = (): TargetBreakdown => ({
            collection: 0, payout: 0, profit: 0, betCount: 0, wonCount: 0, lostCount: 0, pendingCount: 0,
            categories: { single: emptyCat(), single_patti: emptyCat(), double_patti: emptyCat(), triple_patti: emptyCat(), jodi: emptyCat() }
        })

        const emptySession = (): SessionBreakdown => ({
            open: emptyTarget(), close: emptyTarget(), jodi: emptyTarget(),
            collection: 0, payout: 0, profit: 0
        })

        const staffBreakdown = new Map<string, StaffEntry>()

        for (const bet of allBets) {
            const staffId = bet.staff_id
            const sessionName = sessionNameMap.get(bet.game_session_id) || 'morning'

            if (!staffBreakdown.has(staffId)) {
                const info = staffMap.get(staffId)
                staffBreakdown.set(staffId, {
                    staffId,
                    staffEmail: info?.email || '',
                    staffName: info?.name || info?.email || 'Unknown',
                    morning: emptySession(),
                    night: emptySession(),
                    totalCollection: 0,
                    totalPayout: 0,
                    totalProfit: 0,
                    totalBets: 0,
                    bets: []
                })
            }

            const staff = staffBreakdown.get(staffId)!
            const session = sessionName === 'morning' ? staff.morning : staff.night
            const amt = Number(bet.amount)
            const winAmt = Number(bet.winning_amount || 0)

            // Determine target bucket
            let targetBucket: TargetBreakdown
            if (bet.target === 'open') targetBucket = session.open
            else if (bet.target === 'close') targetBucket = session.close
            else targetBucket = session.jodi // jodi_full

            targetBucket.collection += amt
            targetBucket.payout += winAmt
            targetBucket.profit = targetBucket.collection - targetBucket.payout
            targetBucket.betCount++
            if (bet.status === 'won') targetBucket.wonCount++
            else if (bet.status === 'lost') targetBucket.lostCount++
            else targetBucket.pendingCount++

            // Category-level breakdown (single/patti types/jodi within target)
            const catKey = bet.category as string
            const cat = (targetBucket.categories as Record<string, any>)[catKey]
            if (cat) {
                cat.collection += amt
                cat.payout += winAmt
                cat.profit = cat.collection - cat.payout
                cat.betCount++
            }

            // Update session totals
            session.collection = session.open.collection + session.close.collection + session.jodi.collection
            session.payout = session.open.payout + session.close.payout + session.jodi.payout
            session.profit = session.collection - session.payout

            // Update staff totals
            staff.totalCollection = staff.morning.collection + staff.night.collection
            staff.totalPayout = staff.morning.payout + staff.night.payout
            staff.totalProfit = staff.totalCollection - staff.totalPayout
            staff.totalBets++

            // Add bet detail
            staff.bets.push({
                id: bet.id,
                playerName: bet.players?.name || 'Unknown',
                category: bet.category,
                target: bet.target,
                selectedNumber: bet.selected_number,
                amount: amt,
                status: bet.status,
                winningAmount: winAmt,
                sessionName,
                createdAt: bet.created_at,
            })
        }

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
