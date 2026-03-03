import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// ==========================================
// GAME CONFIG API ROUTE
// ==========================================

// GET: Fetch current payout configuration
export async function GET() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: config, error } = await supabase
        .from('game_config')
        .select('*')
        .eq('id', 1)
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ config })
}

// PUT: Update payout configuration (admin only)
export async function PUT(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

    if (!profile || !profile.is_active || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { payout_single, payout_jodi, payout_single_patti, payout_double_patti, payout_triple_patti } = body

    // Validate payouts
    if (payout_single <= 0 || payout_jodi <= 0 || payout_single_patti <= 0 || payout_double_patti <= 0 || payout_triple_patti <= 0) {
        return NextResponse.json({ error: 'Payout values must be positive' }, { status: 400 })
    }

    const { error } = await supabase
        .from('game_config')
        .update({
            payout_single,
            payout_jodi,
            payout_single_patti,
            payout_double_patti,
            payout_triple_patti
        })
        .eq('id', 1)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
