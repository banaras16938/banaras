import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SessionType } from '@/types/types'

// ==========================================
// GAME SCHEDULES API ROUTE
// ==========================================

// GET: Fetch all game schedules
export async function GET() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: schedules, error } = await supabase
        .from('game_schedules')
        .select('*')
        .order('session_name')

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ schedules })
}

// PUT: Update game schedule (admin only)
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
    const {
        session_name,
        start_time,
        open_bet_freeze_time,
        open_result_time,
        close_bet_resume_time,
        close_bet_freeze_time,
        close_result_time
    } = body

    // Validate required fields
    if (!session_name || !start_time || !open_bet_freeze_time || !open_result_time ||
        !close_bet_freeze_time || !close_result_time) {
        return NextResponse.json({ error: 'All required fields must be provided' }, { status: 400 })
    }

    // Validate session_name
    if (!['morning', 'night'].includes(session_name)) {
        return NextResponse.json({ error: 'Invalid session name' }, { status: 400 })
    }

    // Validate time format (HH:MM:SS or HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/
    const times = [start_time, open_bet_freeze_time, open_result_time, close_bet_freeze_time, close_result_time]
    if (close_bet_resume_time) times.push(close_bet_resume_time)

    for (const time of times) {
        if (!timeRegex.test(time)) {
            return NextResponse.json({ error: `Invalid time format: ${time}` }, { status: 400 })
        }
    }

    // Format times to HH:MM:SS if they're in HH:MM format
    const formatTime = (t: string) => t.includes(':') && t.split(':').length === 2 ? `${t}:00` : t

    const { error } = await supabase
        .from('game_schedules')
        .update({
            start_time: formatTime(start_time),
            open_bet_freeze_time: formatTime(open_bet_freeze_time),
            open_result_time: formatTime(open_result_time),
            close_bet_resume_time: close_bet_resume_time ? formatTime(close_bet_resume_time) : null,
            close_bet_freeze_time: formatTime(close_bet_freeze_time),
            close_result_time: formatTime(close_result_time)
        })
        .eq('session_name', session_name as SessionType)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
