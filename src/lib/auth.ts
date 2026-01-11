import { createClient } from '@/utils/supabase/server'
import { createClient as createBrowserClient } from '@/utils/supabase/client'
import { redirect } from 'next/navigation'
import { UserRole, AuthUser, Profile } from '@/types/types'

// ==========================================
// SERVER-SIDE AUTH FUNCTIONS
// ==========================================

/**
 * Get the current authenticated user with profile data
 * Returns null if not authenticated or profile not found
 */
export async function getUser(): Promise<AuthUser | null> {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return null
    }

    // Get profile from database
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, role, is_active')
        .eq('id', user.id)
        .single()

    if (profileError || !profile) {
        console.error('Profile not found for user:', user.id)
        return null
    }

    // Check if user is active
    if (!profile.is_active) {
        console.error('User account is deactivated:', user.id)
        return null
    }

    return {
        id: profile.id,
        email: profile.email || user.email || '',
        role: profile.role as UserRole,
        isActive: profile.is_active
    }
}

/**
 * Require a specific role to access a page
 * Redirects to login if not authenticated or wrong role
 */
export async function requireRole(requiredRole: UserRole | UserRole[]): Promise<AuthUser> {
    const user = await getUser()

    if (!user) {
        redirect('/admin/login')
    }

    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

    if (!roles.includes(user.role)) {
        // Staff trying to access admin routes
        if (user.role === 'staff') {
            redirect('/staff')
        }
        redirect('/admin/login')
    }

    return user
}

/**
 * Require admin role
 */
export async function requireAdmin(): Promise<AuthUser> {
    return requireRole('admin')
}

/**
 * Require staff or admin role
 */
export async function requireStaff(): Promise<AuthUser> {
    return requireRole(['admin', 'staff'])
}

// ==========================================
// CLIENT-SIDE AUTH FUNCTIONS
// ==========================================

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createBrowserClient()

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    })

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
}

/**
 * Update the current user's password
 */
export async function updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createBrowserClient()

    const { error } = await supabase.auth.updateUser({
        password: newPassword
    })

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true }
}

/**
 * Get the current session (client-side)
 */
export async function getSession() {
    const supabase = createBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session
}

/**
 * Get current user profile (client-side)
 */
export async function getCurrentProfile(): Promise<Profile | null> {
    const supabase = createBrowserClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return profile
}

// ==========================================
// ADMIN FUNCTIONS
// ==========================================

/**
 * Create a new staff user (admin only)
 * Note: User will be auto-created in profiles table via trigger
 */
export async function createStaffUser(
    email: string,
    password: string
): Promise<{ success: boolean; error?: string; userId?: string }> {
    const supabase = createBrowserClient()

    // This will trigger handle_new_user() which creates the profile
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${window.location.origin}/staff/login`
        }
    })

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true, userId: data.user?.id }
}

/**
 * Update a staff user's role (admin only)
 */
export async function updateUserRole(
    userId: string,
    role: UserRole
): Promise<{ success: boolean; error?: string }> {
    const supabase = createBrowserClient()

    const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true }
}

/**
 * Deactivate/activate a user (admin only)
 */
export async function setUserActive(
    userId: string,
    isActive: boolean
): Promise<{ success: boolean; error?: string }> {
    const supabase = createBrowserClient()

    const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId)

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true }
}

/**
 * Get all profiles (admin only)
 */
export async function getAllProfiles(): Promise<Profile[]> {
    const supabase = createBrowserClient()

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching profiles:', error)
        return []
    }

    return data || []
}
