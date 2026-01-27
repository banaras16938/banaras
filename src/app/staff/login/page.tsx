'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Lock, User, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export default function StaffLogin() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
    const [isLocked, setIsLocked] = useState(false)
    const [lockoutTimer, setLockoutTimer] = useState(0)

    // Countdown timer for lockout
    useEffect(() => {
        if (lockoutTimer > 0) {
            const interval = setInterval(() => {
                setLockoutTimer(prev => {
                    if (prev <= 1) {
                        setIsLocked(false)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
            return () => clearInterval(interval)
        }
    }, [lockoutTimer])

    const formatLockoutTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (isLocked) {
            toast.error(`Account locked. Try again in ${formatLockoutTime(lockoutTimer)}`)
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role: 'staff' })
            })

            const data = await response.json()

            if (!response.ok) {
                // Handle lockout
                if (response.status === 429 || data.locked) {
                    setIsLocked(true)
                    setLockoutTimer(data.remainingTime || 900)
                    toast.error(data.error || 'Too many failed attempts')
                    return
                }

                // Show remaining attempts
                if (data.attemptsRemaining !== undefined) {
                    setAttemptsRemaining(data.attemptsRemaining)
                    if (data.attemptsRemaining > 0) {
                        toast.error(`${data.error}. ${data.attemptsRemaining} attempt${data.attemptsRemaining > 1 ? 's' : ''} remaining.`)
                    } else {
                        setIsLocked(true)
                        setLockoutTimer(900) // 15 minutes
                        toast.error('Account locked for 15 minutes')
                    }
                } else {
                    toast.error(data.error || 'Login failed')
                }
                return
            }

            // Success
            setAttemptsRemaining(null)
            toast.success('Login successful!')
            router.push(data.redirect || '/staff')
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
                                    User ID
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="Enter your user ID"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isLocked}
                                        className="w-full pl-11 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                                        disabled={isLocked}
                                        className="w-full pl-11 pr-12 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

                            {/* Lockout Warning */}
                            {isLocked && (
                                <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 flex items-center gap-3">
                                    <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
                                    <div>
                                        <p className="text-red-400 font-medium text-sm">Account Locked</p>
                                        <p className="text-xs text-gray-400">Try again in {formatLockoutTime(lockoutTimer)}</p>
                                    </div>
                                </div>
                            )}

                            {/* Attempts Warning */}
                            {!isLocked && attemptsRemaining !== null && attemptsRemaining <= 2 && (
                                <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-3 flex items-center gap-3">
                                    <AlertTriangle className="text-yellow-400 flex-shrink-0" size={20} />
                                    <p className="text-yellow-400 text-sm">
                                        {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining before lockout
                                    </p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
                                isLoading={isLoading}
                                disabled={isLocked}
                            >
                                {isLocked ? `Locked (${formatLockoutTime(lockoutTimer)})` : isLoading ? 'Signing in...' : 'Sign In'}
                            </Button>
                        </form>
                    </div>

                    {/* Card Footer */}
                    <div className="px-6 pb-6 pt-2">
                        <p className="text-center text-sm text-gray-500">
                            Protected area for authorized staff only
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
