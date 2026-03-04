'use client'

import { useState, useEffect, useCallback } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CurrentResult } from '@/components/results/CurrentResult'
import { Ticket, RefreshCw, IndianRupee } from 'lucide-react'
import Link from 'next/link'
import { GameResult } from '@/types/types'
import { useStaffName } from './layout'
import { useSchedules } from '@/hooks/useSchedules'
import { toast } from 'sonner'

export default function StaffDashboard() {
    const [morningResult, setMorningResult] = useState<GameResult | null>(null)
    const [nightResult, setNightResult] = useState<GameResult | null>(null)
    const [resultsLoading, setResultsLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    const staffName = useStaffName()
    const { getScheduleForSession } = useSchedules()

    const fetchResults = useCallback(async () => {
        setResultsLoading(true)
        try {
            const response = await fetch('/api/results?limit=30')
            const data = await response.json()

            if (response.ok && data.results) {
                const today = new Date().toISOString().split('T')[0]

                const todayMorning = data.results.find(
                    (r: GameResult) => r.game_date === today && r.session_name === 'morning'
                )
                const todayNight = data.results.find(
                    (r: GameResult) => r.game_date === today && r.session_name === 'night'
                )

                setMorningResult(todayMorning || null)
                setNightResult(todayNight || null)
            }
        } catch (error) {
            toast.error('Failed to load results')
        } finally {
            setResultsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchResults()

        // Update current time every second
        const timeInterval = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)

        // Auto-refresh results every 30 seconds during result times
        const resultsInterval = setInterval(() => {
            const now = new Date()
            const hours = now.getHours()
            const minutes = now.getMinutes()
            const timeOfDay = hours * 60 + minutes

            // Result declaration times in minutes from midnight
            const resultTimes = [
                { start: 12 * 60 + 30, end: 13 * 60 + 5 },
                { start: 14 * 60 + 30, end: 15 * 60 + 5 },
                { start: 17 * 60 + 30, end: 18 * 60 + 5 },
                { start: 19 * 60 + 30, end: 20 * 60 + 5 },
            ]

            const isResultTime = resultTimes.some(
                ({ start, end }) => timeOfDay >= start && timeOfDay <= end
            )

            if (isResultTime) {
                fetchResults()
            }
        }, 30000)

        return () => {
            clearInterval(resultsInterval)
            clearInterval(timeInterval)
        }
    }, [fetchResults])

    // Empty result placeholders
    const emptyMorningResult: GameResult = {
        id: 'placeholder-morning',
        game_date: new Date().toISOString().split('T')[0],
        session_name: 'morning',
        open_triple: null,
        open_single: null,
        close_triple: null,
        close_single: null,
        jodi_result: null,
        is_open_declared: false,
        is_close_declared: false,
        created_at: new Date().toISOString(),
    }

    const emptyNightResult: GameResult = {
        id: 'placeholder-night',
        game_date: new Date().toISOString().split('T')[0],
        session_name: 'night',
        open_triple: null,
        open_single: null,
        close_triple: null,
        close_single: null,
        jodi_result: null,
        is_open_declared: false,
        is_close_declared: false,
        created_at: new Date().toISOString(),
    }

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Welcome back, {staffName}!</h1>
                    <p className="text-gray-400">
                        Here&apos;s today&apos;s results
                    </p>
                </div>
                <Link
                    href="/staff/bets"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all"
                >
                    <Ticket size={18} />
                    Place New Bet
                </Link>
            </div>

            {/* Payout Rates Section */}
            <div className="space-y-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <IndianRupee size={20} className="text-yellow-400" />
                    Payout Rates
                </h2>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <span className="text-yellow-400 text-sm font-semibold">⚠️ Minimum bet ₹10</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-yellow-300/80 text-sm">All bets must be in multiples of ₹10</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {/* Single */}
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 border border-emerald-500/30 p-4">
                        <div className="text-emerald-400 font-bold text-sm uppercase tracking-wide">Single</div>
                        <div className="mt-1 text-white text-2xl font-extrabold">×9</div>
                        <div className="mt-1 text-emerald-300 text-sm font-semibold">₹10 ka ₹90</div>
                        <div className="mt-2 text-gray-400 text-xs">0–9 • Open / Close</div>
                    </div>

                    {/* Jodi */}
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/30 p-4">
                        <div className="text-amber-400 font-bold text-sm uppercase tracking-wide">Jodi</div>
                        <div className="mt-1 text-white text-2xl font-extrabold">×90</div>
                        <div className="mt-1 text-amber-300 text-sm font-semibold">₹10 ka ₹900</div>
                        <div className="mt-2 text-gray-400 text-xs">00–99 • Jodi</div>
                    </div>

                    {/* Single Patti */}
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-700/20 border border-blue-500/30 p-4">
                        <div className="text-blue-400 font-bold text-sm uppercase tracking-wide">Single Patti</div>
                        <div className="mt-1 text-white text-2xl font-extrabold">×140</div>
                        <div className="mt-1 text-blue-300 text-sm font-semibold">₹10 ka ₹1,400</div>
                        <div className="mt-2 text-gray-400 text-xs">120 numbers • Open / Close</div>
                    </div>

                    {/* Double Patti */}
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-700/20 border border-purple-500/30 p-4">
                        <div className="text-purple-400 font-bold text-sm uppercase tracking-wide">Double Patti</div>
                        <div className="mt-1 text-white text-2xl font-extrabold">×280</div>
                        <div className="mt-1 text-purple-300 text-sm font-semibold">₹10 ka ₹2,800</div>
                        <div className="mt-2 text-gray-400 text-xs">90 numbers • Open / Close</div>
                    </div>

                    {/* Triple Patti */}
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-700/20 border border-rose-500/30 p-4 col-span-2 sm:col-span-1">
                        <div className="text-rose-400 font-bold text-sm uppercase tracking-wide">Triple Patti</div>
                        <div className="mt-1 text-white text-2xl font-extrabold">×800</div>
                        <div className="mt-1 text-rose-300 text-sm font-semibold">₹10 ka ₹8,000</div>
                        <div className="mt-2 text-gray-400 text-xs">10 numbers • Open / Close</div>
                    </div>
                </div>
            </div>

            {/* Today's Results Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Today&apos;s Results</h2>
                    <button
                        onClick={fetchResults}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        disabled={resultsLoading}
                    >
                        <RefreshCw size={16} className={resultsLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {resultsLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="md" />
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                        <CurrentResult
                            result={morningResult || emptyMorningResult}
                            slot="morning"
                            schedule={getScheduleForSession('morning')}
                            currentTime={currentTime}
                        />
                        <CurrentResult
                            result={nightResult || emptyNightResult}
                            slot="night"
                            schedule={getScheduleForSession('night')}
                            currentTime={currentTime}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
