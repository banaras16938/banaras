'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { GameSchedule, SessionType } from '@/types/types'

interface UseSchedulesReturn {
    schedules: GameSchedule[]
    isLoading: boolean
    error: string | null
    getScheduleForSession: (session: SessionType) => GameSchedule | undefined
    refetch: () => Promise<void>
}

export function useSchedules(): UseSchedulesReturn {
    const [schedules, setSchedules] = useState<GameSchedule[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchSchedules = useCallback(async () => {
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

            setSchedules(data || [])
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch schedules'
            setError(message)
            console.error('Schedule fetch error:', err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSchedules()
    }, [fetchSchedules])

    const getScheduleForSession = useCallback((session: SessionType): GameSchedule | undefined => {
        return schedules.find(s => s.session_name === session)
    }, [schedules])

    return {
        schedules,
        isLoading,
        error,
        getScheduleForSession,
        refetch: fetchSchedules
    }
}

// Helper to format time from database format to display format
export function formatScheduleTime(timeStr: string): string {
    if (!timeStr) return '--:--'
    const [hours, minutes] = timeStr.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}
