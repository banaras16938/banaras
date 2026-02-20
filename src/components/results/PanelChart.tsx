'use client'

import { useState, useMemo } from 'react'
import { GameResult, SessionType, GameSchedule } from '@/types/types'

interface PanelChartProps {
    results: GameResult[]
    schedules?: GameSchedule[]
    currentTime?: Date
}

// Helper to check if a result should be visible based on schedule
function shouldShowResult(result: GameResult, schedules: GameSchedule[] | undefined, currentTime: Date): {
    showOpen: boolean
    showClose: boolean
} {
    const schedule = schedules?.find(s => s.session_name === result.session_name)

    if (!schedule) {
        // If no schedule, check the is_declared flags only (for past dates)
        return {
            showOpen: result.is_open_declared,
            showClose: result.is_close_declared
        }
    }

    // For today's results, check schedule times
    const today = new Date().toISOString().split('T')[0]
    if (result.game_date !== today) {
        // Past/future days - just use declared flags
        return {
            showOpen: result.is_open_declared,
            showClose: result.is_close_declared
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
        showClose: result.is_close_declared && currentTime >= closeResultTime
    }
}

export function PanelChart({ results, schedules, currentTime = new Date() }: PanelChartProps) {
    const [selectedSession, setSelectedSession] = useState<SessionType>('morning')

    // Filter results by selected session and apply time-based visibility
    const filteredResults = useMemo(() => {
        return results
            .filter(r => r.session_name === selectedSession)
            .map(result => {
                const visibility = shouldShowResult(result, schedules, currentTime)
                return {
                    ...result,
                    // Only show results if scheduled time has passed
                    open_triple: visibility.showOpen ? result.open_triple : null,
                    open_single: visibility.showOpen ? result.open_single : null,
                    close_triple: visibility.showClose ? result.close_triple : null,
                    close_single: visibility.showClose ? result.close_single : null,
                    jodi_result: visibility.showClose ? result.jodi_result : null
                }
            })
    }, [results, selectedSession, schedules, currentTime])

    const weekDays = ['DATE', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

    // Get panel data by week with date ranges
    const getPanelData = () => {
        if (filteredResults.length === 0) {
            return []
        }

        const sortedResults = [...filteredResults].sort((a, b) =>
            new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
        )

        // Helper to calculate single from triple
        const calculateSingle = (triple: string): string => {
            const sum = triple.split('').reduce((acc, d) => acc + parseInt(d), 0)
            return (sum % 10).toString()
        }

        // Group results by week (starting Monday)
        const weeksMap = new Map<string, {
            monday: Date,
            sunday: Date,
            panels: { open: string; jodi: string; close: string }[]
        }>()

        sortedResults.forEach((result) => {
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
                    panels: Array(7).fill(null).map(() => ({ open: '***', jodi: '**', close: '***' }))
                })
            }

            const week = weeksMap.get(weekKey)!
            const openSingle = result.open_triple ? calculateSingle(result.open_triple) : '*'
            const closeSingle = result.close_triple ? calculateSingle(result.close_triple) : '*'

            week.panels[dayOfWeek] = {
                open: result.open_triple || '***',
                jodi: result.jodi_result || `${openSingle}${closeSingle}`,
                close: result.close_triple || '***'
            }
        })

        // Convert to array format with date ranges
        return Array.from(weeksMap.values())
            .slice(0, 6)
            .map(week => {
                const formatDate = (d: Date) =>
                    `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
                return {
                    dateRange: `${formatDate(week.monday)} to ${formatDate(week.sunday)}`,
                    panels: week.panels
                }
            })
    }

    const panelData = getPanelData()

    return (
        <div className="animate-fade-in">
            {/* Chart Header */}
            <div className="chart-header">
                <h2>BANARAS PANEL CHART</h2>
                <p>Get the most accurate BANARAS Panel Chart records</p>
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
            {panelData.length === 0 ? (
                <div className="p-8 text-center">
                    <p className="text-[var(--text-muted)]">No panel results available yet.</p>
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
                            {panelData.map((week, weekIndex) => (
                                <tr key={weekIndex}>
                                    <td className="text-xs font-medium whitespace-nowrap">
                                        {week.dateRange}
                                    </td>
                                    {week.panels.map((panel, dayIndex) => (
                                        <td key={dayIndex} className="text-center">
                                            <div className="text-xs">{panel.open}</div>
                                            <div className="font-bold">{panel.jodi}</div>
                                            <div className="text-xs">{panel.close}</div>
                                        </td>
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
