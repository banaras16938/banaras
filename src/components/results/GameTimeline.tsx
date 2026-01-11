'use client'

import { GAME_SCHEDULE, GameSchedule } from '@/types/types'
import { Clock, Lock, Unlock } from 'lucide-react'

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
    const openStopStart = parseTime(schedule.openStopWindow.start)
    const openResult = parseTime(schedule.openResult)
    const closeStopStart = parseTime(schedule.closeStopWindow.start)
    const closeResult = parseTime(schedule.closeResult)

    let openStatus: 'betting' | 'locked' | 'declared' = 'betting'
    let closeStatus: 'betting' | 'locked' | 'declared' = 'betting'

    if (currentMinutes >= openResult) {
        openStatus = 'declared'
    } else if (currentMinutes >= openStopStart) {
        openStatus = 'locked'
    }

    if (currentMinutes >= closeResult) {
        closeStatus = 'declared'
    } else if (currentMinutes >= closeStopStart) {
        closeStatus = 'locked'
    }

    return { openStatus, closeStatus }
}

export function GameTimeline({ currentTime = new Date() }: GameTimelineProps) {
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()

    return (
        <div className="space-y-6">
            {GAME_SCHEDULE.map((schedule) => {
                const { openStatus, closeStatus } = getTimeStatus(schedule, currentMinutes)
                const slotLabel = schedule.slot === 'morning' ? 'Morning Game' : 'Night Game'

                return (
                    <div key={schedule.slot} className="glass-card p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Clock size={20} className="text-[var(--primary-400)]" />
                            {slotLabel}
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Open Betting */}
                            <TimeSlot
                                label="Open & Jodi Betting"
                                time={`${formatTimeDisplay(schedule.bettingStart)} - ${formatTimeDisplay(schedule.openStopWindow.start)}`}
                                status={openStatus === 'betting' ? 'active' : 'inactive'}
                            />

                            {/* Open Lock */}
                            <TimeSlot
                                label="Open Lock Window"
                                time={`${formatTimeDisplay(schedule.openStopWindow.start)} - ${formatTimeDisplay(schedule.openStopWindow.end)}`}
                                status={openStatus === 'locked' ? 'locked' : openStatus === 'declared' ? 'inactive' : 'upcoming'}
                            />

                            {/* Close Betting */}
                            <TimeSlot
                                label="Close Betting"
                                time={`${formatTimeDisplay(schedule.bettingStart)} - ${formatTimeDisplay(schedule.closeStopWindow.start)}`}
                                status={closeStatus === 'betting' ? 'active' : 'inactive'}
                            />

                            {/* Close Lock */}
                            <TimeSlot
                                label="Close Lock Window"
                                time={`${formatTimeDisplay(schedule.closeStopWindow.start)} - ${formatTimeDisplay(schedule.closeStopWindow.end)}`}
                                status={closeStatus === 'locked' ? 'locked' : closeStatus === 'declared' ? 'inactive' : 'upcoming'}
                            />
                        </div>

                        <div className="flex gap-4 mt-4 pt-4 border-t border-[var(--glass-border)]">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-[var(--accent-cyan)]">Open Result:</span>
                                <span className="font-mono">{formatTimeDisplay(schedule.openResult)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-[var(--accent-green)]">Close Result:</span>
                                <span className="font-mono">{formatTimeDisplay(schedule.closeResult)}</span>
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
