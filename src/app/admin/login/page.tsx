'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Lock, User, Shield } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { AuthPageContainer } from '@/components/auth/AuthPageContainer'

export default function AdminLogin() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const supabase = createClient()

            // Sign in with Supabase
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (signInError) {
                toast.error(signInError.message)
                return
            }

            // Verify admin role
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                toast.error('Authentication failed')
                return
            }

            // Fetch profile - handle case where profile doesn't exist
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role, is_active')
                .eq('id', user.id)
                .single()

            if (profileError) {
                console.error('Profile fetch error:', profileError)
                await supabase.auth.signOut()

                // Specific error messages based on error type
                if (profileError.code === 'PGRST116') {
                    toast.error('Profile not found. Please ask an admin to manually create your profile or re-run the database schema.')
                } else {
                    toast.error(`Profile error: ${profileError.message}`)
                }
                return
            }

            if (!profile) {
                await supabase.auth.signOut()
                toast.error('No profile found for this account')
                return
            }

            if (!profile.is_active) {
                await supabase.auth.signOut()
                toast.error('Your account has been disabled')
                return
            }

            if (profile.role !== 'admin') {
                await supabase.auth.signOut()
                toast.error('Access denied. Admin privileges required.')
                return
            }

            // Update last_login timestamp
            await supabase
                .from('profiles')
                .update({ last_login: new Date().toISOString() })
                .eq('id', user.id)

            // Success - redirect to admin dashboard
            toast.success('Login successful!')
            router.push('/admin')
            router.refresh()
        } catch (err) {
            console.error('Login error:', err)
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <AuthPageContainer
            title="Admin Portal"
            subtitle="System Control Center"
            icon={<Shield size={40} className="text-[var(--primary-400)]" />}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary-400)] transition-colors" size={18} />
                        <Input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="!pl-14 h-12 bg-[var(--bg-surface)]/50 border-[var(--glass-border)] focus:bg-[var(--bg-surface)] transition-all"
                            required
                        />
                    </div>

                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary-400)] transition-colors" size={18} />
                        <Input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="!pl-14 h-12 bg-[var(--bg-surface)]/50 border-[var(--glass-border)] focus:bg-[var(--bg-surface)] transition-all"
                            required
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <Button
                        type="submit"
                        className="w-full h-12 text-base font-semibold shadow-lg shadow-[var(--primary-500)]/20 hover:shadow-[var(--primary-500)]/40 transition-all duration-300"
                        isLoading={isLoading}
                    >
                        {isLoading ? 'Authenticating...' : 'Access Dashboard'}
                    </Button>
                </div>

                <div className="text-center">
                    <Link
                        href="/"
                        className="text-sm text-[var(--text-muted)] hover:text-white transition-colors border-b border-transparent hover:border-white/20 pb-0.5"
                    >
                        ← Return to Public Results
                    </Link>
                </div>
            </form>
        </AuthPageContainer>
    )
}
