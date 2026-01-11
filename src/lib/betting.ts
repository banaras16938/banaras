import { createClient } from '@/utils/supabase/client'
import { BetCategory, BetTarget, SessionType, GameSchedule, PAYOUT_MULTIPLIERS } from '@/types/types'

// ==========================================
// BETTING LIBRARY
// ==========================================

export interface PlaceBetParams {
    gameDate: string
    sessionName: SessionType
    category: BetCategory
    target: BetTarget
    selectedNumber: string
    amount: number
    playerId?: string
    playerName?: string
    playerPhone?: string
}

export interface BetValidation {
    isValid: boolean
    error?: string
}

// ==========================================
// TIME VALIDATION (Client-side preview)
// ==========================================

/**
 * Get current time in HH:MM:SS format (IST)
 */
export function getCurrentTimeIST(): string {
    const now = new Date()
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000
    const istTime = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000)

    const hours = istTime.getHours().toString().padStart(2, '0')
    const minutes = istTime.getMinutes().toString().padStart(2, '0')
    const seconds = istTime.getSeconds().toString().padStart(2, '0')

    return `${hours}:${minutes}:${seconds}`
}

/**
 * Check if betting is currently open (client-side preview)
 * Note: Actual validation happens in database trigger
 */
export function canPlaceBetPreview(
    schedules: GameSchedule[],
    sessionName: SessionType,
    target: BetTarget
): BetValidation {
    const schedule = schedules.find(s => s.session_name === sessionName)

    if (!schedule) {
        return { isValid: false, error: 'Schedule not found' }
    }

    const currentTime = getCurrentTimeIST()

    // Betting not started
    if (currentTime < schedule.start_time) {
        return { isValid: false, error: `Betting starts at ${formatTime(schedule.start_time)}` }
    }

    // Open/Jodi betting window
    if (target === 'open' || target === 'jodi_full') {
        if (currentTime >= schedule.open_bet_freeze_time) {
            return {
                isValid: false,
                error: `${target === 'jodi_full' ? 'Jodi' : 'Open'} betting closed at ${formatTime(schedule.open_bet_freeze_time)}`
            }
        }
    }

    // Close betting window
    if (target === 'close') {
        if (currentTime >= schedule.close_bet_freeze_time) {
            return {
                isValid: false,
                error: `Close betting closed at ${formatTime(schedule.close_bet_freeze_time)}`
            }
        }

        // Paused during open result calculation
        if (currentTime >= schedule.open_bet_freeze_time && currentTime < schedule.open_result_time) {
            return {
                isValid: false,
                error: 'Close betting paused during open result calculation'
            }
        }
    }

    return { isValid: true }
}

/**
 * Format time for display (12-hour format)
 */
function formatTime(time: string): string {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
}

// ==========================================
// NUMBER VALIDATION
// ==========================================

/**
 * Validate bet number format
 */
export function validateBetNumber(category: BetCategory, number: string): BetValidation {
    const expectedLength = category === 'single' ? 1 : category === 'jodi' ? 2 : 3

    if (number.length !== expectedLength) {
        return {
            isValid: false,
            error: `${category} must be ${expectedLength} digit(s)`
        }
    }

    if (!/^[0-9]+$/.test(number)) {
        return { isValid: false, error: 'Only digits 0-9 allowed' }
    }

    return { isValid: true }
}

/**
 * Validate category/target combination
 */
export function validateCategoryTarget(category: BetCategory, target: BetTarget): BetValidation {
    // Jodi bets must use jodi_full target
    if (category === 'jodi' && target !== 'jodi_full') {
        return { isValid: false, error: 'Jodi bets must use Jodi target' }
    }

    // Non-jodi bets cannot use jodi_full target
    if (category !== 'jodi' && target === 'jodi_full') {
        return { isValid: false, error: 'Only Jodi bets can use Jodi target' }
    }

    return { isValid: true }
}

// ==========================================
// PAYOUT CALCULATION
// ==========================================

/**
 * Calculate potential payout
 */
export function calculatePotentialPayout(category: BetCategory, amount: number): number {
    return amount * PAYOUT_MULTIPLIERS[category]
}

// ==========================================
// API INTERACTION
// ==========================================

/**
 * Place a bet via API
 */
export async function placeBet(params: PlaceBetParams): Promise<{
    success: boolean
    error?: string
    betId?: string
}> {
    try {
        const response = await fetch('/api/bets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        })

        const data = await response.json()

        if (!response.ok) {
            return { success: false, error: data.error || 'Failed to place bet' }
        }

        return { success: true, betId: data.bet?.id }
    } catch (error) {
        console.error('Place bet error:', error)
        return { success: false, error: 'Network error. Please try again.' }
    }
}

/**
 * Get staff's bets
 */
export async function getMyBets(gameDate?: string, sessionName?: SessionType) {
    try {
        let url = '/api/bets?'
        if (gameDate) url += `date=${gameDate}&`
        if (sessionName) url += `session=${sessionName}`

        const response = await fetch(url)
        const data = await response.json()

        return data.bets || []
    } catch (error) {
        console.error('Get bets error:', error)
        return []
    }
}

/**
 * Get game schedules
 */
export async function getSchedules(): Promise<GameSchedule[]> {
    try {
        const response = await fetch('/api/analytics?type=schedules')
        const data = await response.json()
        return data.schedules || []
    } catch (error) {
        console.error('Get schedules error:', error)
        return []
    }
}

/**
 * Check if today is a holiday
 */
export async function checkHoliday(date: string): Promise<boolean> {
    try {
        const response = await fetch('/api/analytics?type=holidays')
        const data = await response.json()
        return data.holidays?.some((h: { holiday_date: string }) => h.holiday_date === date) || false
    } catch {
        return false
    }
}

// ==========================================
// PLAYER MANAGEMENT
// ==========================================

/**
 * Get or create player
 */
export async function getOrCreatePlayer(
    name: string,
    phone?: string
): Promise<{ id: string; name: string } | null> {
    const supabase = createClient()

    // Try to find existing player by phone
    if (phone) {
        const { data: existing } = await supabase
            .from('players')
            .select('id, name')
            .eq('phone', phone)
            .single()

        if (existing) {
            return existing
        }
    }

    // Create new player
    const { data: newPlayer, error } = await supabase
        .from('players')
        .insert({ name, phone })
        .select('id, name')
        .single()

    if (error) {
        console.error('Create player error:', error)
        return null
    }

    return newPlayer
}

/**
 * Get staff's players
 */
export async function getMyPlayers(): Promise<Array<{ id: string; name: string; phone: string | null }>> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('players')
        .select('id, name, phone')
        .order('name')

    if (error) {
        console.error('Get players error:', error)
        return []
    }

    return data || []
}
