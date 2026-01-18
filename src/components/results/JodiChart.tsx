'use client'

import { useState } from 'react'
import { GameResult, SessionType } from '@/types/types'

interface JodiChartProps {
    results: GameResult[]
}

export function JodiChart({ results }: JodiChartProps) {
    const [selectedSession, setSelectedSession] = useState<SessionType>('morning')

    // Filter results by selected session
    const filteredResults = results.filter(r => r.session_name === selectedSession)

    // Group results by week for display
    const weekDays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

    // Get last 4 weeks of results for display
    const getWeeklyResults = () => {
        if (filteredResults.length === 0) {
            return []
        }

        const sortedResults = [...filteredResults].sort((a, b) =>
            new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
        )

        // Group results by week (starting Monday)
        const weeksMap = new Map<string, (string | null)[]>()

        sortedResults.forEach((result) => {
            if (result.jodi_result) {
                const date = new Date(result.game_date)
                // Get Monday of this week as the week identifier
                const dayOfWeek = (date.getDay() + 6) % 7 // Monday = 0
                const monday = new Date(date)
                monday.setDate(date.getDate() - dayOfWeek)
                const weekKey = monday.toISOString().split('T')[0]

                if (!weeksMap.has(weekKey)) {
                    weeksMap.set(weekKey, Array(7).fill(null))
                }

                const week = weeksMap.get(weekKey)!
                week[dayOfWeek] = result.jodi_result
            }
        })

        // Convert to array and take last 6 weeks
        return Array.from(weeksMap.values()).slice(0, 6)
    }


    const weeklyData = getWeeklyResults()

    return (
        <div className="animate-fade-in">
            {/* Chart Header */}
            <div className="chart-header">
                <h2>BANARAS JODI CHART</h2>
                <p>Get the most accurate BANARAS JODI CHART records</p>
            </div>

            {/* Session Sub-Tabs */}
            <div className="session-tabs">
                <button
                    onClick={() => setSelectedSession('morning')}
                    className={`session-tab ${selectedSession === 'morning' ? 'active' : ''}`}
                >
                    Banaras Morning
                </button>
                <button
                    onClick={() => setSelectedSession('night')}
                    className={`session-tab ${selectedSession === 'night' ? 'active' : ''}`}
                >
                    Banaras Night
                </button>
            </div>

            {/* Table */}
            {weeklyData.length === 0 ? (
                <div className="p-8 text-center">
                    <p className="text-[var(--text-muted)]">No jodi results available yet.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="chart-table">
                        <thead>
                            <tr>
                                {weekDays.map(day => (
                                    <th key={day}>{day}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {weeklyData.map((week, weekIndex) => (
                                <tr key={weekIndex}>
                                    {week.map((jodi, dayIndex) => (
                                        <td key={dayIndex}>{jodi || '**'}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
