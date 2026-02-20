'use client'

import { useState, useEffect, useCallback } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CurrentResult } from '@/components/results/CurrentResult'
import { JodiChart } from '@/components/results/JodiChart'
import { PanelChart } from '@/components/results/PanelChart'
import { Ticket, RefreshCw, Grid3X3, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { GameResult } from '@/types/types'
import { useStaffName } from './layout'
import { useSchedules } from '@/hooks/useSchedules'
import { toast } from 'sonner'

type ChartType = 'jodi' | 'panel'

export default function StaffDashboard() {
    const [morningResult, setMorningResult] = useState<GameResult | null>(null)
    const [nightResult, setNightResult] = useState<GameResult | null>(null)
    const [historicalResults, setHistoricalResults] = useState<GameResult[]>([])
    const [resultsLoading, setResultsLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [activeChart, setActiveChart] = useState<ChartType>('jodi')
    const staffName = useStaffName()
    const { schedules, getScheduleForSession } = useSchedules()

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
                setHistoricalResults(data.results)
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

            {/* Charts Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">Charts</h2>

                {/* Chart Tab Switcher */}
                <div className="flex rounded-xl overflow-hidden border border-gray-700 w-fit">
                    <button
                        onClick={() => setActiveChart('jodi')}
                        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all ${activeChart === 'jodi'
                                ? 'bg-indigo-500 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                            }`}
                    >
                        <Grid3X3 size={16} />
                        Jodi Chart
                    </button>
                    <button
                        onClick={() => setActiveChart('panel')}
                        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all ${activeChart === 'panel'
                                ? 'bg-indigo-500 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                            }`}
                    >
                        <BarChart3 size={16} />
                        Panel Chart
                    </button>
                </div>

                {/* Chart Content */}
                <div className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-xl p-4 overflow-hidden">
                    {resultsLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <LoadingSpinner size="md" />
                        </div>
                    ) : activeChart === 'jodi' ? (
                        <JodiChart results={historicalResults} schedules={schedules} currentTime={currentTime} />
                    ) : (
                        <PanelChart results={historicalResults} schedules={schedules} currentTime={currentTime} />
                    )}
                </div>
            </div>
        </div>
    )
}

