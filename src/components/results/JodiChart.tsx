'use client'

import { useState, useMemo } from 'react'
import { GameResult, SessionType, GameSchedule } from '@/types/types'

interface JodiChartProps {
    results: GameResult[]
    schedules?: GameSchedule[]
    currentTime?: Date
}

// Helper to check if a result should be visible based on schedule
function shouldShowResult(result: GameResult, schedules: GameSchedule[] | undefined, currentTime: Date): {
    showOpen: boolean
    showClose: boolean
    showJodi: boolean
} {
    const schedule = schedules?.find(s => s.session_name === result.session_name)

    if (!schedule) {
        // If no schedule, check the is_declared flags only (for past dates)
        return {
            showOpen: result.is_open_declared,
            showClose: result.is_close_declared,
            showJodi: result.is_close_declared // Jodi requires close to be declared
        }
    }

    // For today's results, check schedule times
    const today = new Date().toISOString().split('T')[0]
    if (result.game_date !== today) {
        // Past/future days - just use declared flags
        return {
            showOpen: result.is_open_declared,
            showClose: result.is_close_declared,
            showJodi: result.is_close_declared
        }
    }

    // Today - check if current time is past the scheduled reveal time
    const parseTime = (timeStr: string): Date => {
        const [hours, minutes] = timeStr.split(':').map(Number)
        const time = new Date(currentTime)
        time.setHours(hours, minutes, 0, 0)
        return time
    }

    const openResultTime = parseTime(schedule.open_result_time)
    const closeResultTime = parseTime(schedule.close_result_time)

    return {
        showOpen: result.is_open_declared && currentTime >= openResultTime,
        showClose: result.is_close_declared && currentTime >= closeResultTime,
        showJodi: result.is_close_declared && currentTime >= closeResultTime
    }
}

export function JodiChart({ results, schedules, currentTime = new Date() }: JodiChartProps) {
    const [selectedSession, setSelectedSession] = useState<SessionType>('morning')

    // Filter results by selected session and apply time-based visibility
    const filteredResults = useMemo(() => {
        return results
            .filter(r => r.session_name === selectedSession)
            .map(result => {
                const visibility = shouldShowResult(result, schedules, currentTime)
                return {
                    ...result,
                    // Only show jodi if it should be visible
                    jodi_result: visibility.showJodi ? result.jodi_result : null
                }
            })
    }, [results, selectedSession, schedules, currentTime])

    // Group results by week for display
    const weekDays = ['DATE', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

    // Get last 4 weeks of results for display
    const getWeeklyResults = () => {
        if (filteredResults.length === 0) {
            return []
        }

        const sortedResults = [...filteredResults].sort((a, b) =>
            new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
        )

        // Group results by week (starting Monday)
        const weeksMap = new Map<string, {
            monday: Date,
            sunday: Date,
            jodis: (string | null)[]
        }>()

        sortedResults.forEach((result) => {
            if (result.jodi_result) {
                const date = new Date(result.game_date)
                // Get Monday of this week as the week identifier
                const dayOfWeek = (date.getDay() + 6) % 7 // Monday = 0
                const monday = new Date(date)
                monday.setDate(date.getDate() - dayOfWeek)
                const sunday = new Date(monday)
                sunday.setDate(monday.getDate() + 6)
                const weekKey = monday.toISOString().split('T')[0]

                if (!weeksMap.has(weekKey)) {
                    weeksMap.set(weekKey, {
                        monday,
                        sunday,
                        jodis: Array(7).fill(null)
                    })
                }

                const week = weeksMap.get(weekKey)!
                week.jodis[dayOfWeek] = result.jodi_result
            }
        })

        // Convert to array format with date ranges and take last 6 weeks
        return Array.from(weeksMap.values())
            .slice(0, 6)
            .map(week => {
                const formatDate = (d: Date) =>
                    `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`
                return {
                    startDate: formatDate(week.monday),
                    endDate: formatDate(week.sunday),
                    jodis: week.jodis
                }
            })
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
                <div>
                    <table className="chart-table chart-table-fit">
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
                                    <td className="chart-date-cell">
                                        <span>{week.startDate}</span>
                                        <span className="chart-date-to">to</span>
                                        <span>{week.endDate}</span>
                                    </td>
                                    {week.jodis.map((jodi, dayIndex) => (
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
