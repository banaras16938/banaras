import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// ==========================================
// STAFF (PROFILES) API ROUTE
// ==========================================

// Helper to check admin access (using cookie-based client)
async function requireAdmin(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Unauthorized', status: 401 }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

    if (!profile || !profile.is_active || profile.role !== 'admin') {
        return { error: 'Admin access required', status: 403 }
    }

    return { user, profile }
}

// GET: List all profiles (admin only)
export async function GET() {
    const supabase = await createClient()

    const adminCheck = await requireAdmin(supabase)
    if ('error' in adminCheck && adminCheck.error) {
        return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    // Get all profiles (role='staff' only ideally, for this specific admin page, but let's return all non-admins or all?)
    // User asked for "add new staff member", so listing "staff" accounts is priority.
    // Let's list ALL profiles so admin can see other admins too if needed, or filter in frontend.
    // But typically staff management should list staff.
    // Let's return all and filter in frontend or query.

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, role, is_active, created_at, name, phone, last_login')
        .eq('role', 'staff') // Only return staff for staff management
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profiles })
}

// POST: Create new staff (admin only)
export async function POST(request: NextRequest) {
    const supabase = await createClient()

    // 1. Verify Admin Access using Session
    const adminCheck = await requireAdmin(supabase)
    if ('error' in adminCheck && adminCheck.error) {
        return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const body = await request.json()
    const { email, password, name, phone } = body

    if (!email || !password || !name) {
        return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 })
    }

    // 2. Use Service Role to Create User
    const adminSupabase = createAdminClient()

    // Check if user already exists first to avoid partial failures?
    // createUser will fail if exists.

    // Create auth user (trigger will create profile automatically in `profiles` table)
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto confirm
        user_metadata: { name } // Optional, but good to have in metadata too
    })

    if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    const userId = authData.user.id

    // 3. Update the auto-created profile with details
    // The trigger `handle_new_user` inserts a row with `id` and `email`.
    // We need to update `name`, `phone`, and ensure `role` is 'staff'.

    const { data: updatedProfile, error: profileError } = await adminSupabase
        .from('profiles')
        .update({
            name,
            phone,
            role: 'staff',
            is_active: true
        })
        .eq('id', userId)
        .select()
        .single()

    if (profileError) {
        // If profile update fails, we should technically delete the auth user or warn.
        // For now, let's return success but with warning, or error.
        console.error('Profile update failed:', profileError)
        return NextResponse.json({
            error: 'User created but profile update failed: ' + profileError.message,
            userId
        }, { status: 201 }) // 201 created partially
    }

    return NextResponse.json({ profile: updatedProfile }, { status: 201 })
}

// PATCH: Update profile (admin only)
export async function PATCH(request: NextRequest) {
    const supabase = await createClient()

    const adminCheck = await requireAdmin(supabase)
    if ('error' in adminCheck && adminCheck.error) {
        return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const body = await request.json()
    const { profileId, is_active } = body
    // We can allow updating other fields too later

    if (!profileId) {
        return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
    }

    // Don't allow an admin to deactivate themselves here (safety check)
    if (adminCheck.user && profileId === adminCheck.user.id) {
        return NextResponse.json({ error: 'Cannot update own status' }, { status: 400 })
    }

    // Use admin client to ensure we can update any profile (RLS allows admin, but explicit is good)
    const adminSupabase = createAdminClient()

    const { data: updatedProfile, error } = await adminSupabase
        .from('profiles')
        .update({ is_active })
        .eq('id', profileId)
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile: updatedProfile })
}

// DELETE: Remove staff (admin only)
export async function DELETE(request: NextRequest) {
    const supabase = await createClient()
    const adminCheck = await requireAdmin(supabase)
    if ('error' in adminCheck && adminCheck.error) {
        return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (adminCheck.user && userId === adminCheck.user.id) {
        return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    try {
        // First, delete related bets (must come before players due to potential constraints)
        const { error: betsDeleteError } = await adminSupabase
            .from('bets')
            .delete()
            .eq('staff_id', userId)

        if (betsDeleteError) {
            console.error('Bets delete error:', betsDeleteError)
        }

        // Delete players created by this staff
        const { error: playersDeleteError } = await adminSupabase
            .from('players')
            .delete()
            .eq('created_by', userId)

        if (playersDeleteError) {
            console.error('Players delete error:', playersDeleteError)
        }

        // Now delete the profile record
        const { error: profileError } = await adminSupabase
            .from('profiles')
            .delete()
            .eq('id', userId)

        if (profileError) {
            console.error('Profile deletion error:', profileError)
            return NextResponse.json({ error: profileError.message }, { status: 500 })
        }

        // Then delete from auth
        const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId)

        if (deleteError) {
            console.error('Auth user deletion error:', deleteError)
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        return NextResponse.json({ message: 'User deleted successfully' })
    } catch (error) {
        console.error('Delete user exception:', error)
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to delete user'
        }, { status: 500 })
    }
}
