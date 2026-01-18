'use client'

import { GameResult, GameSchedule, SessionType } from '@/types/types'

interface CurrentResultProps {
    result: GameResult | null
    slot: SessionType
    schedule?: GameSchedule | null
    isLive?: boolean
}

// Helper to format time from database format to display format
function formatTime(timeStr: string | undefined | null): string {
    if (!timeStr) return '--:--'
    const [hours, minutes] = timeStr.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function CurrentResult({ result, slot, schedule }: CurrentResultProps) {
    // Use schedule from database, fallback to placeholder if not loaded
    const title = slot === 'morning' ? 'BANARAS MORNING' : 'BANARAS NIGHT'
    const openTime = formatTime(schedule?.open_result_time)
    const closeTime = formatTime(schedule?.close_result_time)

    // Get display values - show *** or ** when not declared
    const openTriple = result?.is_open_declared ? result.open_triple : '***'
    const jodi = result?.is_close_declared ? result.jodi_result : '**'
    const closeTriple = result?.is_close_declared ? result.close_triple : '***'

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
