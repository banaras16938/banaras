'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CurrentResult } from '@/components/results/CurrentResult'
import { ResultHistory } from '@/components/results/ResultHistory'
import { Card, CardHeader } from '@/components/ui'
import {
    TrendingUp,
    TrendingDown,
    Ticket,
    Clock,
    Trophy,
    RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { BetCategory, GameResult } from '@/types/types'
import { useStaffName } from './layout'
import { useSchedules } from '@/hooks/useSchedules'
import { toast } from 'sonner'

interface DashboardStats {
    today: {
        totalBets: number
        totalCollection: number
        totalPayout: number
        profit: number
        profitPercent: number
        pendingBets: number
        wonBets: number
        lostBets: number
    }
    recentBets: Array<{
        id: string
        amount: number
        status: string
        winning_amount: number
        created_at: string
        category?: BetCategory
        selected_number?: string
        player?: { name: string }
    }>
}

export default function StaffDashboard() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [morningResult, setMorningResult] = useState<GameResult | null>(null)
    const [nightResult, setNightResult] = useState<GameResult | null>(null)
    const [historicalResults, setHistoricalResults] = useState<GameResult[]>([])
    const [resultsLoading, setResultsLoading] = useState(true)
    const staffName = useStaffName()
    const { getScheduleForSession } = useSchedules()

    const fetchDashboardData = useCallback(async () => {
        try {
            const response = await fetch('/api/staff/stats')
            const data = await response.json()

            if (response.ok) {
                setStats(data)
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchResults = useCallback(async () => {
        setResultsLoading(true)
        try {
            // Fetch today's results
            const todayResponse = await fetch('/api/results', {
                method: 'POST'
            })
            const todayData = await todayResponse.json()

            if (todayResponse.ok) {
                setMorningResult(todayData.morning)
                setNightResult(todayData.night)
            }

            // Fetch historical results
            const historyResponse = await fetch('/api/results?limit=20')
            const historyData = await historyResponse.json()

            if (historyResponse.ok) {
                setHistoricalResults(historyData.results || [])
            }
        } catch (error) {
            toast.error('Failed to load results')
        } finally {
            setResultsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchDashboardData()
        fetchResults()

        // Refresh dashboard every 60 seconds
        const dashboardInterval = setInterval(fetchDashboardData, 60000)

        // Auto-refresh results every 30 seconds during result times
        const resultsInterval = setInterval(() => {
            const now = new Date()
            const istOffset = 5.5 * 60 * 60 * 1000
            const istNow = new Date(now.getTime() + istOffset)
            const hours = istNow.getHours()
            const minutes = istNow.getMinutes()
            const timeOfDay = hours * 60 + minutes

            // Result declaration times in minutes from midnight
            const resultTimes = [
                { start: 12 * 60 + 30, end: 13 * 60 + 5 },  // 12:30-1:05 PM (Morning Open)
                { start: 14 * 60 + 30, end: 15 * 60 + 5 },  // 2:30-3:05 PM (Morning Close)
                { start: 17 * 60 + 30, end: 18 * 60 + 5 },  // 5:30-6:05 PM (Night Open)
                { start: 19 * 60 + 30, end: 20 * 60 + 5 },  // 7:30-8:05 PM (Night Close)
            ]

            const isResultTime = resultTimes.some(
                ({ start, end }) => timeOfDay >= start && timeOfDay <= end
            )

            if (isResultTime) {
                fetchResults()
            }
        }, 30000)

        return () => {
            clearInterval(dashboardInterval)
            clearInterval(resultsInterval)
        }
    }, [fetchDashboardData, fetchResults])

    // Create empty result placeholder for display
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

    const statCards = [
        {
            label: "Today's Collection",
            value: `${(stats?.today.totalCollection || 0).toLocaleString()} Points`,
            change: `${stats?.today.totalBets || 0} bets`,
            trending: 'neutral',
            icon: Ticket
        },
        {
            label: 'Pending Bets',
            value: stats?.today.pendingBets?.toString() || '0',
            change: 'awaiting result',
            trending: 'neutral',
            icon: Clock
        },
        {
            label: "Today's Profit",
            value: `${(stats?.today.profit || 0).toLocaleString()} Points`,
            change: '',
            trending: 'neutral',
            icon: TrendingUp
        },
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Welcome back, {staffName}!</h1>
                    <p className="text-gray-400">
                        Here&apos;s what&apos;s happening today
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

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statCards.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <div key={stat.label} className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-xl p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-gray-400">{stat.label}</p>
                                    <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                                    <div className="flex items-center gap-1 mt-2">
                                        {stat.trending === 'up' && (
                                            <TrendingUp size={14} className="text-green-400" />
                                        )}
                                        {stat.trending === 'down' && (
                                            <TrendingDown size={14} className="text-red-400" />
                                        )}
                                        <span className={`text-xs ${stat.trending === 'up' ? 'text-green-400' :
                                            stat.trending === 'down' ? 'text-red-400' :
                                                'text-gray-400'
                                            }`}>
                                            {stat.change}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg bg-indigo-500/10">
                                    <Icon size={24} className="text-indigo-400" />
                                </div>
                            </div>
                        </div>
                    )
                })}
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
                        />
                        <CurrentResult
                            result={nightResult || emptyNightResult}
                            slot="night"
                            schedule={getScheduleForSession('night')}
                        />
                    </div>
                )}
            </div>

            {/* Result History */}
            <Card>
                <CardHeader
                    title="Result History"
                    subtitle="Previous game results"
                />
                {historicalResults.length === 0 ? (
                    <div className="py-8 text-center text-gray-400">
                        No historical results available
                    </div>
                ) : (
                    <ResultHistory results={historicalResults} />
                )}
            </Card>
        </div>
    )
}
