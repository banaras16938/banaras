import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { SessionType, GameConfig, getPattiType } from '@/types/types'

// Derive single from a triple: sum digits, take rightmost
function calculateSingle(triple: string): string {
    const sum = triple.split('').reduce((s, d) => s + parseInt(d), 0)
    return (sum % 10).toString()
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const triple = searchParams.get('triple')
    const sessionParam = searchParams.get('session')
    const target = searchParams.get('target')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (!triple || triple.length !== 3 || !/^\d{3}$/.test(triple)) {
        return NextResponse.json({ error: 'A valid 3-digit triple is required' }, { status: 400 })
    }
    if (!sessionParam || !['morning', 'night'].includes(sessionParam)) {
        return NextResponse.json({ error: 'Session must be morning or night' }, { status: 400 })
    }
    if (!target || !['open', 'close'].includes(target)) {
        return NextResponse.json({ error: 'Target must be open or close' }, { status: 400 })
    }

    const session = sessionParam as SessionType
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
        const singleDigit = calculateSingle(triple)
        const pattiType = getPattiType(triple)

        // Get payout config
        const { data: configData, error: configError } = await supabase
            .from('game_config')
            .select('*')
            .single()
        if (configError) throw configError
        const config = configData as GameConfig

        const payoutSingle = Number(config.payout_single || 9)
        const payoutJodi = Number(config.payout_jodi || 90)
        const payoutSinglePatti = Number(config.payout_single_patti || 1400)
        const payoutDoublePatti = Number(config.payout_double_patti || 2800)
        const payoutTriplePatti = Number(config.payout_triple_patti || 8000)

        // Get game session
        const { data: gameSession } = await supabase
            .from('game_sessions')
            .select('id, open_single, close_single, jodi_result, open_triple, close_triple')
            .eq('game_date', date)
            .eq('session_name', session)
            .single()

        const sessionId = gameSession?.id

        // Empty results if no session
        if (!sessionId) {
            return NextResponse.json({
                success: true, triple, pattiType: pattiType || 'unknown', single: singleDigit, target, session,
                totalCollection: 0,
                breakdown: {
                    singlePatti: { bets: 0, amount: 0, liability: 0, multiplier: payoutSinglePatti },
                    doublePatti: { bets: 0, amount: 0, liability: 0, multiplier: payoutDoublePatti },
                    triplePatti: { bets: 0, amount: 0, liability: 0, multiplier: payoutTriplePatti },
                    single: { bets: 0, amount: 0, liability: 0, multiplier: payoutSingle },
                    jodi: { numbers: [], bets: 0, amount: 0, liability: 0, multiplier: payoutJodi, exposure: [] }
                },
                totalLiability: 0, payoutPercentage: 0, profitPercentage: 0,
            })
        }

        // Determine jodi exposure
        const jodiNumbers: string[] = []
        if (target === 'open') {
            for (let i = 0; i <= 9; i++) jodiNumbers.push(singleDigit + i.toString())
        } else {
            const openSingle = gameSession?.open_single
            if (openSingle) {
                jodiNumbers.push(openSingle + singleDigit)
            } else {
                for (let i = 0; i <= 9; i++) jodiNumbers.push(i.toString() + singleDigit)
            }
        }

        // Total collection for this session
        const { data: sessionBets } = await supabase
            .from('bets')
            .select('amount')
            .eq('game_session_id', sessionId)
            .eq('status', 'pending')
        const totalCollection = (sessionBets || []).reduce((s: number, b: any) => s + Number(b.amount), 0)

        // Fetch patti bets for this number
        const { data: pattiBets } = await supabase
            .from('bets')
            .select('id, amount, category, selected_number, target')
            .eq('game_session_id', sessionId)
            .eq('selected_number', triple)
            .eq('target', target)
            .in('category', ['single_patti', 'double_patti', 'triple_patti'])
            .eq('status', 'pending')

        const spBets = (pattiBets || []).filter((b: any) => b.category === 'single_patti')
        const dpBets = (pattiBets || []).filter((b: any) => b.category === 'double_patti')
        const tpBets = (pattiBets || []).filter((b: any) => b.category === 'triple_patti')

        const spAmount = spBets.reduce((s: number, b: any) => s + Number(b.amount), 0)
        const spLiability = spAmount * payoutSinglePatti
        const dpAmount = dpBets.reduce((s: number, b: any) => s + Number(b.amount), 0)
        const dpLiability = dpAmount * payoutDoublePatti
        const tpAmount = tpBets.reduce((s: number, b: any) => s + Number(b.amount), 0)
        const tpLiability = tpAmount * payoutTriplePatti

        // Fetch single bets
        const { data: singleBets } = await supabase
            .from('bets')
            .select('id, amount')
            .eq('game_session_id', sessionId)
            .eq('category', 'single')
            .eq('target', target)
            .eq('selected_number', singleDigit)
            .eq('status', 'pending')

        const singleAmount = (singleBets || []).reduce((s: number, b: any) => s + Number(b.amount), 0)
        const singleLiability = singleAmount * payoutSingle

        // Fetch jodi bets
        const { data: jodiBets } = await supabase
            .from('bets')
            .select('id, amount, selected_number')
            .eq('game_session_id', sessionId)
            .eq('category', 'jodi')
            .eq('target', 'jodi_full')
            .in('selected_number', jodiNumbers.length > 0 ? jodiNumbers : ['__none__'])
            .eq('status', 'pending')

        let jodiLiability = 0
        let jodiExposure: { number: string; bets: number; amount: number; liability: number }[] = []

        if (target === 'open' && jodiNumbers.length > 1) {
            const jodiByNumber = new Map<string, number>()
            for (const jn of jodiNumbers) jodiByNumber.set(jn, 0)
            for (const bet of (jodiBets || [])) {
                const current = jodiByNumber.get(bet.selected_number) || 0
                jodiByNumber.set(bet.selected_number, current + Number(bet.amount))
            }

            jodiExposure = jodiNumbers.map(jn => {
                const amt = jodiByNumber.get(jn) || 0
                return {
                    number: jn,
                    bets: (jodiBets || []).filter((b: any) => b.selected_number === jn).length,
                    amount: amt,
                    liability: amt * payoutJodi,
                }
            })

            let maxAmount = 0
            for (const jn of jodiNumbers) {
                const amt = jodiByNumber.get(jn) || 0
                if (amt > maxAmount) maxAmount = amt
            }
            jodiLiability = maxAmount * payoutJodi
        } else {
            jodiLiability = (jodiBets || []).reduce((s: number, b: any) => s + Number(b.amount), 0) * payoutJodi
            jodiExposure = jodiNumbers.map(jn => {
                const betsForJodi = (jodiBets || []).filter((b: any) => b.selected_number === jn)
                const amountForJodi = betsForJodi.reduce((s: number, b: any) => s + Number(b.amount), 0)
                return {
                    number: jn,
                    bets: betsForJodi.length,
                    amount: amountForJodi,
                    liability: amountForJodi * payoutJodi,
                }
            })
        }

        const totalPattiLiability = spLiability + dpLiability + tpLiability
        const totalLiability = totalPattiLiability + singleLiability + jodiLiability
        const payoutPercentage = totalCollection > 0 ? (totalLiability / totalCollection) * 100 : 0

        return NextResponse.json({
            success: true,
            triple,
            pattiType: pattiType || 'unknown',
            single: singleDigit,
            target,
            session,
            totalCollection,
            breakdown: {
                singlePatti: {
                    bets: spBets.length, amount: spAmount, liability: spLiability, multiplier: payoutSinglePatti,
                },
                doublePatti: {
                    bets: dpBets.length, amount: dpAmount, liability: dpLiability, multiplier: payoutDoublePatti,
                },
                triplePatti: {
                    bets: tpBets.length, amount: tpAmount, liability: tpLiability, multiplier: payoutTriplePatti,
                },
                single: {
                    bets: (singleBets || []).length, amount: singleAmount, liability: singleLiability, multiplier: payoutSingle,
                },
                jodi: {
                    numbers: jodiNumbers, bets: jodiExposure.length,
                    amount: jodiExposure.reduce((s, j) => s + j.amount, 0),
                    liability: jodiLiability, multiplier: payoutJodi, exposure: jodiExposure,
                }
            },
            totalLiability,
            payoutPercentage: Math.round(payoutPercentage * 100) / 100,
            profitPercentage: Math.round((100 - payoutPercentage) * 100) / 100,
        })
    } catch (error) {
        console.error('Cross-check API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
