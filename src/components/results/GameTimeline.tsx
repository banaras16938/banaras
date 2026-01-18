'use client'

import { GameSchedule } from '@/types/types'
import { Clock, Lock, Unlock, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'


interface GameTimelineProps {
    currentTime?: Date
}

function parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
}

function formatTimeDisplay(time: string): string {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

function getTimeStatus(
    schedule: GameSchedule,
    currentMinutes: number
): { openStatus: 'betting' | 'locked' | 'declared'; closeStatus: 'betting' | 'locked' | 'declared' } {
    const startTime = parseTime(schedule.start_time)
    const openFreeze = parseTime(schedule.open_bet_freeze_time)
    const openResult = parseTime(schedule.open_result_time)
    const closeFreeze = parseTime(schedule.close_bet_freeze_time)
    const closeResult = parseTime(schedule.close_result_time)

    let openStatus: 'betting' | 'locked' | 'declared' = 'betting'
    let closeStatus: 'betting' | 'locked' | 'declared' = 'betting'

    // Before start time
    if (currentMinutes < startTime) {
        openStatus = 'betting' // Will show as upcoming
        closeStatus = 'betting'
    }

    // Open status
    if (currentMinutes >= openResult) {
        openStatus = 'declared'
    } else if (currentMinutes >= openFreeze) {
        openStatus = 'locked'
    }

    // Close status
    if (currentMinutes >= closeResult) {
        closeStatus = 'declared'
    } else if (currentMinutes >= closeFreeze) {
        closeStatus = 'locked'
    }

    return { openStatus, closeStatus }
}

export function GameTimeline({ currentTime = new Date() }: GameTimelineProps) {
    const [schedules, setSchedules] = useState<GameSchedule[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()

    useEffect(() => {
        // Fetch live schedules directly from Supabase (public read access via RLS)
        async function fetchSchedules() {
            try {
                setIsLoading(true)
                setError(null)

                const supabase = createClient()
                const { data, error: fetchError } = await supabase
                    .from('game_schedules')
                    .select('*')

                if (fetchError) {
                    throw new Error(fetchError.message)
                }

                if (data && data.length > 0) {
                    setSchedules(data)
                } else {
                    setError('No schedule data available')
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to load schedules'
                setError(message)
                console.error('Failed to fetch schedules:', err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchSchedules()
    }, [])

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 shadow-md border border-gray-200 dark:border-gray-700 animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 shadow-md border border-gray-200 dark:border-gray-700 text-center">
                    <AlertCircle size={40} className="mx-auto text-red-500 mb-2" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Unable to Load Schedules</h3>
                    <p className="text-gray-500 dark:text-gray-400">{error}</p>
                </div>
            </div>
        )
    }

    // Empty state (shouldn't happen with proper DB setup, but handle gracefully)
    if (schedules.length === 0) {
        return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 shadow-md border border-gray-200 dark:border-gray-700 text-center">
                    <Clock size={40} className="mx-auto text-gray-400 mb-2" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Schedules Available</h3>
                    <p className="text-gray-500 dark:text-gray-400">Game schedules have not been configured yet.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {schedules.map((schedule) => {
                const { openStatus, closeStatus } = getTimeStatus(schedule, currentMinutes)
                const slotLabel = schedule.session_name === 'morning' ? 'Morning Game' : 'Night Game'

                return (
                    <div key={schedule.session_name} className="bg-white dark:bg-gray-800/80 rounded-2xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Clock size={20} className="text-purple-500" />
                            {slotLabel}
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Open Betting */}
                            <TimeSlot
                                label="Open & Jodi Betting"
                                time={`${formatTimeDisplay(schedule.start_time)} - ${formatTimeDisplay(schedule.open_bet_freeze_time)}`}
                                status={openStatus === 'betting' ? 'active' : 'inactive'}
                            />

                            {/* Open Lock */}
                            <TimeSlot
                                label="Open Lock Window"
                                time={`${formatTimeDisplay(schedule.open_bet_freeze_time)} - ${formatTimeDisplay(schedule.open_result_time)}`}
                                status={openStatus === 'locked' ? 'locked' : openStatus === 'declared' ? 'inactive' : 'upcoming'}
                            />

                            {/* Close Betting */}
                            <TimeSlot
                                label="Close Betting"
                                time={`${formatTimeDisplay(schedule.start_time)} - ${formatTimeDisplay(schedule.close_bet_freeze_time)}`}
                                status={closeStatus === 'betting' ? 'active' : 'inactive'}
                            />

                            {/* Close Lock */}
                            <TimeSlot
                                label="Close Lock Window"
                                time={`${formatTimeDisplay(schedule.close_bet_freeze_time)} - ${formatTimeDisplay(schedule.close_result_time)}`}
                                status={closeStatus === 'locked' ? 'locked' : closeStatus === 'declared' ? 'inactive' : 'upcoming'}
                            />
                        </div>

                        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-cyan-600 dark:text-cyan-400 font-medium">Open Result:</span>
                                <span className="font-mono text-gray-700 dark:text-white">{formatTimeDisplay(schedule.open_result_time)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-green-600 dark:text-green-400 font-medium">Close Result:</span>
                                <span className="font-mono text-gray-700 dark:text-white">{formatTimeDisplay(schedule.close_result_time)}</span>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

interface TimeSlotProps {
    label: string
    time: string
    status: 'active' | 'locked' | 'upcoming' | 'inactive'
}

function TimeSlot({ label, time, status }: TimeSlotProps) {
    const statusStyles = {
        active: 'border-green-500 bg-green-50 dark:bg-green-500/10',
        locked: 'border-red-500 bg-red-50 dark:bg-red-500/10',
        upcoming: 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30',
        inactive: 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 opacity-60',
    }

    const statusIcons = {
        active: <Unlock size={14} className="text-green-500" />,
        locked: <Lock size={14} className="text-red-500" />,
        upcoming: <Clock size={14} className="text-gray-400" />,
        inactive: <Clock size={14} className="text-gray-400" />,
    }

    return (
        <div className={`p-3 rounded-lg border ${statusStyles[status]}`}>
            <div className="flex items-center gap-2 mb-1">
                {statusIcons[status]}
                <span className="text-xs text-gray-500 dark:text-gray-300">{label}</span>
            </div>
            <p className="text-sm font-mono text-gray-700 dark:text-white">{time}</p>
        </div>
    )
}
