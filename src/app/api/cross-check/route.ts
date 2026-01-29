import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { BetCategory, GameConfig } from '@/types/types'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const number = searchParams.get('number')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (!number) {
        return NextResponse.json({ error: 'Number is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Check authentication & admin role
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
        // 2. Fetch Bets for the number and date
        const { data: bets, error: betsError } = await supabase
            .from('bets')
            .select(`
                id,
                amount,
                category,
                target,
                selected_number,
                created_at,
                game_sessions!inner(
                    id,
                    session_name,
                    game_date
                ),
                profiles!inner(
                    name
                ),
                players!inner(
                    name
                )
            `)
            .eq('selected_number', number)
            .eq('game_sessions.game_date', date)
            .order('created_at', { ascending: false })

        if (betsError) throw betsError

        // 3. Fetch Game Config for payouts
        const { data: configData, error: configError } = await supabase
            .from('game_config')
            .select('*')
            .single()

        if (configError) throw configError
        const config = configData as GameConfig

        // 4. Aggregate Data
        let totalAmount = 0
        let totalLiability = 0
        let sessionBreakdown = {
            morning: { amount: 0, count: 0 },
            night: { amount: 0, count: 0 }
        }

        const betList = bets.map((bet: any) => {
            const amount = Number(bet.amount)
            totalAmount += amount

            // Determine payout multiplier based on category
            let multiplier = 0
            if (bet.category === 'single') multiplier = config.payout_single
            else if (bet.category === 'jodi') multiplier = config.payout_jodi
            else if (bet.category === 'triple') multiplier = config.payout_triple

            const liability = amount * multiplier
            totalLiability += liability

            // Session breakdown
            const session = bet.game_sessions.session_name
            if (session === 'morning') {
                sessionBreakdown.morning.amount += amount
                sessionBreakdown.morning.count += 1
            } else if (session === 'night') {
                sessionBreakdown.night.amount += amount
                sessionBreakdown.night.count += 1
            }

            return {
                id: bet.id,
                staffName: bet.profiles.name,
                playerName: bet.players.name,
                amount: amount,
                session: session,
                target: bet.target,
                category: bet.category,
                createdAt: bet.created_at,
                potentialPayout: liability
            }
        })

        return NextResponse.json({
            number,
            date,
            summary: {
                totalAmount,
                totalLiability,
                totalBets: bets.length,
                sessionBreakdown
            },
            bets: betList
        })

    } catch (error) {
        console.error('Cross-check API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
