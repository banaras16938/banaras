'use client'

import { GameSchedule, SessionType } from '@/types/types'
import { Clock, Lock, Unlock } from 'lucide-react'
import { useEffect, useState } from 'react'

// Default schedule based on SRS (will be overridden by API data)
const DEFAULT_SCHEDULES: GameSchedule[] = [
    {
        session_name: 'morning',
        start_time: '09:00:00',
        open_bet_freeze_time: '12:30:00',
        open_result_time: '13:00:00',
        close_bet_resume_time: null,
        close_bet_freeze_time: '14:30:00',
        close_result_time: '15:00:00',
    },
    {
        session_name: 'night',
        start_time: '09:00:00',
        open_bet_freeze_time: '17:30:00',
        open_result_time: '18:00:00',
        close_bet_resume_time: null,
        close_bet_freeze_time: '19:30:00',
        close_result_time: '20:00:00',
    },
]

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
    const [schedules, setSchedules] = useState<GameSchedule[]>(DEFAULT_SCHEDULES)
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()

    useEffect(() => {
        // Fetch live schedules from API
        async function fetchSchedules() {
            try {
                const response = await fetch('/api/analytics?type=schedules')
                const data = await response.json()
                if (data.schedules && data.schedules.length > 0) {
                    setSchedules(data.schedules)
                }
            } catch (error) {
                console.error('Failed to fetch schedules:', error)
            }
        }
        fetchSchedules()
    }, [])

    return (
        <div className="space-y-6">
            {schedules.map((schedule) => {
                const { openStatus, closeStatus } = getTimeStatus(schedule, currentMinutes)
                const slotLabel = schedule.session_name === 'morning' ? 'Morning Game' : 'Night Game'

                return (
                    <div key={schedule.session_name} className="glass-card p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Clock size={20} className="text-[var(--primary-400)]" />
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

                        <div className="flex gap-4 mt-4 pt-4 border-t border-[var(--glass-border)]">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-[var(--accent-cyan)]">Open Result:</span>
                                <span className="font-mono">{formatTimeDisplay(schedule.open_result_time)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-[var(--accent-green)]">Close Result:</span>
                                <span className="font-mono">{formatTimeDisplay(schedule.close_result_time)}</span>
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
        active: 'border-[var(--status-success)] bg-green-500/10',
        locked: 'border-[var(--status-error)] bg-red-500/10',
        upcoming: 'border-[var(--glass-border)]',
        inactive: 'border-[var(--glass-border)] opacity-50',
    }

    const statusIcons = {
        active: <Unlock size={14} className="text-[var(--status-success)]" />,
        locked: <Lock size={14} className="text-[var(--status-error)]" />,
        upcoming: <Clock size={14} className="text-[var(--text-muted)]" />,
        inactive: <Clock size={14} className="text-[var(--text-muted)]" />,
    }

    return (
        <div className={`p-3 rounded-lg border ${statusStyles[status]}`}>
            <div className="flex items-center gap-2 mb-1">
                {statusIcons[status]}
                <span className="text-xs text-[var(--text-muted)]">{label}</span>
            </div>
            <p className="text-sm font-mono">{time}</p>
        </div>
    )
}
