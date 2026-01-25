'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Lock, User, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

export default function AdminLogin() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const supabase = createClient()

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (signInError) {
                toast.error(signInError.message)
                return
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                toast.error('Authentication failed')
                return
            }

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role, is_active')
                .eq('id', user.id)
                .single()

            if (profileError) {
                console.error('Profile fetch error:', profileError)
                await supabase.auth.signOut()
                if (profileError.code === 'PGRST116') {
                    toast.error('Profile not found. Please contact support.')
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

            await supabase
                .from('profiles')
                .update({ last_login: new Date().toISOString() })
                .eq('id', user.id)

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
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl" />
            </div>

            {/* Login Card */}
            <div className="relative w-full max-w-md">
                {/* Card */}
                <div className="bg-gray-800/70 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Card Header - Logo */}
                    <div className="p-6 flex flex-col items-center justify-center border-b border-gray-700/50">
                        <Image
                            src="/logo-1.png"
                            alt="BANARAS"
                            width={300}
                            height={200}
                            className="h-30 w-auto object-contain"
                            priority
                        />
                        <span className="mt-3 text-xl font-black tracking-wider animate-brand-color">
                            BANARAS
                        </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* User ID Field */}
                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                                    Admin ID
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="Enter your admin ID"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full pl-11 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full pl-11 pr-12 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
                                isLoading={isLoading}
                            >
                                {isLoading ? 'Signing in...' : 'Sign In'}
                            </Button>
                        </form>
                    </div>

                    {/* Card Footer */}
                    <div className="px-6 pb-6 pt-2">
                        <p className="text-center text-sm text-gray-500">
                            Admin access only
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

