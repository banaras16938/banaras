import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { GameConfig } from '@/types/types'

// Derive single from a triple: sum digits, take rightmost
function deriveSingle(triple: string): string {
    const sum = triple.split('').reduce((s, d) => s + parseInt(d), 0)
    return (sum % 10).toString()
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const triple = searchParams.get('triple')
    const session = searchParams.get('session') // 'morning' | 'night'
    const target = searchParams.get('target')   // 'open' | 'close'
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (!triple || triple.length !== 3 || !/^\d{3}$/.test(triple)) {
        return NextResponse.json({ error: 'A valid 3-digit triple is required' }, { status: 400 })
    }
    if (!session || !['morning', 'night'].includes(session)) {
        return NextResponse.json({ error: 'Session must be morning or night' }, { status: 400 })
    }
    if (!target || !['open', 'close'].includes(target)) {
        return NextResponse.json({ error: 'Target must be open or close' }, { status: 400 })
    }

    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    if (!profile || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const derivedSingle = deriveSingle(triple)

        // Get game session for this date + session
        const { data: gameSession } = await supabase
            .from('game_sessions')
            .select('id, open_single, close_single, jodi_result, open_triple, close_triple')
            .eq('game_date', date)
            .eq('session_name', session)
            .single()

        const sessionId = gameSession?.id

        // Determine jodi exposure
        let jodiNumbers: string[] = []
        let jodiNote = ''

        if (target === 'open') {
            // If we pick this as open triple, single = derivedSingle
            // Jodi could be derivedSingle + any close digit (0-9)
            for (let i = 0; i <= 9; i++) {
                jodiNumbers.push(derivedSingle + i.toString())
            }
            jodiNote = `Jodi exposure: ${derivedSingle}0 - ${derivedSingle}9`
        } else {
            // Close: if open_single already declared, jodi = open_single + derivedSingle
            const openSingle = gameSession?.open_single
            if (openSingle) {
                jodiNumbers = [openSingle + derivedSingle]
                jodiNote = `Exact Jodi: ${openSingle}${derivedSingle}`
            } else {
                // Open not declared yet, all jodis ending with derivedSingle are at risk
                for (let i = 0; i <= 9; i++) {
                    jodiNumbers.push(i.toString() + derivedSingle)
                }
                jodiNote = `Jodi exposure: *${derivedSingle} (open not yet declared)`
            }
        }

        // Get payout config
        const { data: configData, error: configError } = await supabase
            .from('game_config')
            .select('*')
            .single()
        if (configError) throw configError
        const config = configData as GameConfig

        // If no session exists yet, return empty results
        if (!sessionId) {
            return NextResponse.json({
                triple,
                derivedSingle,
                session,
                target,
                date,
                jodiNumbers,
                jodiNote,
                totalCollection: 0,
                categories: {
                    triple: { bets: [], count: 0, totalAmount: 0, totalLiability: 0, multiplier: config.payout_triple },
                    single: { bets: [], count: 0, totalAmount: 0, totalLiability: 0, multiplier: config.payout_single },
                    jodi: { bets: [], count: 0, totalAmount: 0, totalLiability: 0, multiplier: config.payout_jodi },
                },
                grandTotalLiability: 0,
            })
        }

        // Fetch bets scoped to the selected target for accurate collection
        // Per SRS: Open target = open + jodi bets (jodi locks with open)
        //          Close target = close bets only (open/jodi already settled)
        let collectionQuery = supabase
            .from('bets')
            .select('amount')
            .eq('game_session_id', sessionId)

        if (target === 'open') {
            // Open collection = open single/triple bets + jodi bets
            collectionQuery = collectionQuery.in('target', ['open', 'jodi_full'])
        } else {
            // Close collection = close single/triple bets only
            collectionQuery = collectionQuery.eq('target', 'close')
        }

        const { data: allBets } = await collectionQuery

        const totalCollection = (allBets || []).reduce((s: number, b: any) => s + Number(b.amount), 0)

        // Fetch TRIPLE bets matching the entered triple
        const { data: tripleBets } = await supabase
            .from('bets')
            .select(`
                id, amount, created_at, target, selected_number,
                profiles!inner(name),
                players!inner(name)
            `)
            .eq('game_session_id', sessionId)
            .eq('category', 'triple')
            .eq('target', target)
            .eq('selected_number', triple)
            .eq('status', 'pending')

        // Fetch SINGLE bets matching the derived single 
        const { data: singleBets } = await supabase
            .from('bets')
            .select(`
                id, amount, created_at, target, selected_number,
                profiles!inner(name),
                players!inner(name)
            `)
            .eq('game_session_id', sessionId)
            .eq('category', 'single')
            .eq('target', target)
            .eq('selected_number', derivedSingle)
            .eq('status', 'pending')

        // Fetch JODI bets matching exposed jodi numbers
        const { data: jodiBets } = await supabase
            .from('bets')
            .select(`
                id, amount, created_at, target, selected_number,
                profiles!inner(name),
                players!inner(name)
            `)
            .eq('game_session_id', sessionId)
            .eq('category', 'jodi')
            .eq('target', 'jodi_full')
            .in('selected_number', jodiNumbers)
            .eq('status', 'pending')

        // Format bets helper
        const formatBets = (bets: any[], multiplier: number) =>
            (bets || []).map((b: any) => ({
                id: b.id,
                staffName: b.profiles.name,
                playerName: b.players.name,
                amount: Number(b.amount),
                selectedNumber: b.selected_number,
                target: b.target,
                createdAt: b.created_at,
                potentialPayout: Number(b.amount) * multiplier,
            }))

        const tripleFormatted = formatBets(tripleBets || [], config.payout_triple)
        const singleFormatted = formatBets(singleBets || [], config.payout_single)
        const jodiFormatted = formatBets(jodiBets || [], config.payout_jodi)

        const sumAmount = (bets: any[]) => bets.reduce((s: number, b: any) => s + b.amount, 0)
        const sumLiability = (bets: any[]) => bets.reduce((s: number, b: any) => s + b.potentialPayout, 0)

        // For Open target: liability = MAX jodi bet (worst-case exposure per SRS)
        // For Close target: exact single jodi, so full liability applies
        let jodiLiability = sumLiability(jodiFormatted)
        let worstJodi: string | null = null
        let jodiBreakdown: { number: string; bets: number; amount: number; liability: number }[] = []

        if (target === 'open' && jodiNumbers.length > 1) {
            // Group jodi bets by selected number and find the one with maximum total bet
            const jodiByNumber = new Map<string, number>()
            for (const jn of jodiNumbers) {
                jodiByNumber.set(jn, 0)
            }
            for (const bet of jodiFormatted) {
                const current = jodiByNumber.get(bet.selectedNumber) || 0
                jodiByNumber.set(bet.selectedNumber, current + bet.amount)
            }

            // Build breakdown for all jodis
            jodiBreakdown = jodiNumbers.map(jn => {
                const amt = jodiByNumber.get(jn) || 0
                return {
                    number: jn,
                    bets: jodiFormatted.filter(b => b.selectedNumber === jn).length,
                    amount: amt,
                    liability: amt * config.payout_jodi,
                }
            })

            // Find the jodi with maximum bet amount (worst-case exposure)
            let maxAmount = 0
            for (const jn of jodiNumbers) {
                const amt = jodiByNumber.get(jn) || 0
                if (amt > maxAmount) {
                    maxAmount = amt
                    worstJodi = jn
                }
            }

            // Jodi liability = the maximum jodi's liability (worst-case exposure for admin)
            jodiLiability = maxAmount * config.payout_jodi
        }

        const categories = {
            triple: {
                bets: tripleFormatted,
                count: tripleFormatted.length,
                totalAmount: sumAmount(tripleFormatted),
                totalLiability: sumLiability(tripleFormatted),
                multiplier: config.payout_triple,
            },
            single: {
                bets: singleFormatted,
                count: singleFormatted.length,
                totalAmount: sumAmount(singleFormatted),
                totalLiability: sumLiability(singleFormatted),
                multiplier: config.payout_single,
            },
            jodi: {
                bets: jodiFormatted,
                count: jodiFormatted.length,
                totalAmount: sumAmount(jodiFormatted),
                totalLiability: jodiLiability,
                multiplier: config.payout_jodi,
                worstJodi,
                jodiBreakdown,
            },
        }

        const grandTotalLiability =
            categories.triple.totalLiability +
            categories.single.totalLiability +
            categories.jodi.totalLiability

        return NextResponse.json({
            triple,
            derivedSingle,
            session,
            target,
            date,
            jodiNumbers,
            jodiNote,
            totalCollection,
            categories,
            grandTotalLiability,
        })

    } catch (error) {
        console.error('Cross-check API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
