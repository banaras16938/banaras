import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// ==========================================
// PLAYERS API ROUTE
// ==========================================

// GET: Get all players created by the current staff
export async function GET(request: NextRequest) {
    const supabase = await createClient()

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
    const search = searchParams.get('search')

    let query = supabase
        .from('players')
        .select('*')
        .order('created_at', { ascending: false })

    // Staff can only see their own players, admin can see all
    if (profile.role !== 'admin') {
        query = query.eq('created_by', profile.id)
    }

    // Search by name or phone
    if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data: players, error } = await query.limit(100)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ players })
}

// POST: Create a new player
export async function POST(request: NextRequest) {
    const supabase = await createClient()

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

    const body = await request.json()
    const { name, phone } = body

    if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Player name is required' }, { status: 400 })
    }

    // Check for duplicate phone if provided
    if (phone) {
        const { data: existing } = await supabase
            .from('players')
            .select('id')
            .eq('phone', phone)
            .eq('created_by', profile.id)
            .single()

        if (existing) {
            return NextResponse.json({ error: 'A player with this phone already exists' }, { status: 400 })
        }
    }

    const { data: player, error } = await supabase
        .from('players')
        .insert({
            name: name.trim(),
            phone: phone?.trim() || null,
            created_by: profile.id
        })
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ player }, { status: 201 })
}

// PUT: Update a player
export async function PUT(request: NextRequest) {
    const supabase = await createClient()

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

    const body = await request.json()
    const { id, name, phone } = body

    if (!id) {
        return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }

    if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Player name is required' }, { status: 400 })
    }

    // Only allow updating own players (unless admin)
    let query = supabase
        .from('players')
        .update({ name: name.trim(), phone: phone?.trim() || null })
        .eq('id', id)

    if (profile.role !== 'admin') {
        query = query.eq('created_by', profile.id)
    }

    const { data: player, error } = await query.select().single()

    if (error) {
        if (error.code === 'PGRST116') {
            return NextResponse.json({ error: 'Player not found' }, { status: 404 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ player })
}

// DELETE: Delete a player (only if no bets exist)
export async function DELETE(request: NextRequest) {
    const supabase = await createClient()

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
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }

    // Check if player has any bets
    const { data: bets } = await supabase
        .from('bets')
        .select('id')
        .eq('player_id', id)
        .limit(1)

    if (bets && bets.length > 0) {
        return NextResponse.json({
            error: 'Cannot delete player with existing bets'
        }, { status: 400 })
    }

    // Only allow deleting own players (unless admin)
    let query = supabase
        .from('players')
        .delete()
        .eq('id', id)

    if (profile.role !== 'admin') {
        query = query.eq('created_by', profile.id)
    }

    const { error } = await query

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
