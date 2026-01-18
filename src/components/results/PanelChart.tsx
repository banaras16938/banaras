'use client'

import { GameResult } from '@/types/types'

interface PanelChartProps {
    results: GameResult[]
}

export function PanelChart({ results }: PanelChartProps) {
    const weekDays = ['DATE', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

    // Get panel data by week with date ranges
    const getPanelData = () => {
        if (results.length === 0) {
            return []
        }

        const sortedResults = [...results].sort((a, b) =>
            new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
        )

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
            week.panels[dayOfWeek] = {
                open: result.open_triple || '***',
                jodi: result.jodi_result || '**',
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

            {/* Chart Title */}
            <div className="bg-white py-4 text-center">
                <h3 className="text-lg font-bold text-[var(--primary-600)]">BANARAS</h3>
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
