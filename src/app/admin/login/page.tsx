'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Lock, User, Shield } from 'lucide-react'
import Link from 'next/link'

export default function AdminLogin() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            // TODO: Implement Supabase authentication
            await new Promise(resolve => setTimeout(resolve, 1000))
            window.location.href = '/admin'
        } catch {
            setError('Invalid credentials. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[var(--bg-dark)] flex items-center justify-center p-4">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[var(--accent-pink)] rounded-full blur-[150px] opacity-15" />
                <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-[var(--primary-600)] rounded-full blur-[150px] opacity-20" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-pink)] to-[var(--primary-600)] mb-4">
                        <Shield size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold gradient-text">Admin Login</h1>
                    <p className="text-[var(--text-muted)] mt-2">
                        Secure access to system controls
                    </p>
                </div>

                {/* Login Form */}
                <div className="glass-card p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-[var(--status-error)] text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                            <Input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-12"
                                required
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-12"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            isLoading={isLoading}
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>
                </div>

                {/* Back Link */}
                <div className="text-center mt-6">
                    <Link
                        href="/"
                        className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
                    >
                        ← Back to Results
                    </Link>
                </div>
            </div>
        </div>
    )
}
