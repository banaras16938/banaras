'use client'

import { useState, useEffect, useCallback } from 'react'
import { CurrentResult } from '@/components/results/CurrentResult'
import { ResultHistory } from '@/components/results/ResultHistory'
import { Card, CardHeader } from '@/components/ui'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { GameResult, sessionToResult } from '@/types/types'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function StaffResultsPage() {
    const [morningResult, setMorningResult] = useState<GameResult | null>(null)
    const [nightResult, setNightResult] = useState<GameResult | null>(null)
    const [historicalResults, setHistoricalResults] = useState<GameResult[]>([])
    const [loading, setLoading] = useState(true)

    const fetchResults = useCallback(async () => {
        setLoading(true)
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
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchResults()

        // Auto-refresh every 30 seconds during result times
        const interval = setInterval(() => {
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

        return () => clearInterval(interval)
    }, [fetchResults])

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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Declared Results</h1>
                    <p className="text-[var(--text-secondary)]">
                        View today&apos;s and historical game results
                    </p>
                </div>
                <button
                    onClick={fetchResults}
                    className="btn btn-secondary flex items-center gap-2"
                    disabled={loading}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Today's Results */}
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-sm text-[var(--text-muted)] mb-3 uppercase tracking-wide">
                        Morning Game (1:00 PM & 3:00 PM)
                    </h3>
                    <CurrentResult
                        result={morningResult || emptyMorningResult}
                        slot="morning"
                    />
                </div>
                <div>
                    <h3 className="text-sm text-[var(--text-muted)] mb-3 uppercase tracking-wide">
                        Night Game (6:00 PM & 8:00 PM)
                    </h3>
                    <CurrentResult
                        result={nightResult || emptyNightResult}
                        slot="night"
                    />
                </div>
            </div>

            {/* Result History */}
            <Card>
                <CardHeader
                    title="Result History"
                    subtitle="Previous game results"
                />
                {historicalResults.length === 0 ? (
                    <div className="py-8 text-center text-[var(--text-muted)]">
                        No historical results available
                    </div>
                ) : (
                    <ResultHistory results={historicalResults} />
                )}
            </Card>
        </div>
    )
}
