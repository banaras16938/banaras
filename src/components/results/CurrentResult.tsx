'use client'

import { GameResult, GameSchedule, SessionType } from '@/types/types'

interface CurrentResultProps {
    result: GameResult | null
    slot: SessionType
    schedule?: GameSchedule | null
    isLive?: boolean
    currentTime?: Date
}

// Helper to format time from database format to display format
function formatTime(timeStr: string | undefined | null): string {
    if (!timeStr) return '--:--'
    const [hours, minutes] = timeStr.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

// Helper to check if current time >= scheduled time
function isTimeReached(scheduleTime: string | undefined | null, currentTime: Date): boolean {
    if (!scheduleTime) return false
    const [hours, minutes] = scheduleTime.split(':').map(Number)
    const scheduleMinutes = hours * 60 + minutes
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()
    return currentMinutes >= scheduleMinutes
}

export function CurrentResult({ result, slot, schedule, currentTime = new Date() }: CurrentResultProps) {
    // Use schedule from database, fallback to placeholder if not loaded
    const title = slot === 'morning' ? 'BANARAS MORNING' : 'BANARAS NIGHT'
    const openTime = formatTime(schedule?.open_result_time)
    const closeTime = formatTime(schedule?.close_result_time)

    // Time-based visibility: only show results when current time >= scheduled result time
    const canShowOpen = result?.is_open_declared && isTimeReached(schedule?.open_result_time, currentTime)
    const canShowClose = result?.is_close_declared && isTimeReached(schedule?.close_result_time, currentTime)

    // Get display values - show *** or ** when not declared OR when time hasn't reached
    const openTriple = canShowOpen ? result?.open_triple : '***'

    // Jodi: show full when close is declared, show open_single + * when only open is declared
    const jodi = canShowClose
        ? result?.jodi_result
        : (canShowOpen && result?.open_single ? `${result.open_single}*` : '**')

    const closeTriple = canShowClose ? result?.close_triple : '***'

    return (
        <div className="result-card animate-slide-up">
            {/* Header Bar - Blue with title and times */}
            <div className="result-card-header">
                <span className="time">{openTime}</span>
                <span className="title">{title}</span>
                <span className="time">{closeTime}</span>
            </div>

            {/* Body - White with results */}
            <div className="result-card-body">
                <span className="result-value">{openTriple}</span>
                <span className="result-value jodi">{jodi}</span>
                <span className="result-value">{closeTriple}</span>
            </div>
        </div>
    )
}

