'use client'

import { useState, useEffect, useCallback } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { JodiChart } from '@/components/results/JodiChart'
import { PanelChart } from '@/components/results/PanelChart'
import { RefreshCw, Grid3X3, BarChart3 } from 'lucide-react'
import { GameResult } from '@/types/types'
import { useSchedules } from '@/hooks/useSchedules'
import { toast } from 'sonner'

type ChartType = 'jodi' | 'panel'

export default function ChartsPage() {
    const [historicalResults, setHistoricalResults] = useState<GameResult[]>([])
    const [loading, setLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [activeChart, setActiveChart] = useState<ChartType>('jodi')
    const { schedules } = useSchedules()

    const fetchResults = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/results?limit=all')
            const data = await response.json()

            if (response.ok && data.results) {
                setHistoricalResults(data.results)
            }
        } catch (error) {
            toast.error('Failed to load results')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchResults()

        const timeInterval = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)

        return () => clearInterval(timeInterval)
    }, [fetchResults])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Charts</h1>
                    <p className="text-gray-400">View Jodi &amp; Panel chart history</p>
                </div>
                <button
                    onClick={fetchResults}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    disabled={loading}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

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
                {loading ? (
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
    )
}
