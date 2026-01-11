import { createClient } from '@/utils/supabase/client'
import { SessionType, BetTarget, GameSession, GameResult, sessionToResult, PAYOUT_MULTIPLIERS } from '@/types/types'

// ==========================================
// RESULTS LIBRARY
// ==========================================

export interface ResultOption {
    triple: string
    single: number
    totalBets: number
    totalLiability: number
    payoutPercentage: number
    profitPercentage: number
}

export interface ResultRecommendations {
    totalCollection: number
    targetMatch: ResultOption[]          // List A: Match slider percentage
    systemRecommendations: ResultOption[] // List B: Highest profit
    lowBets: ResultOption[]              // List C: Low bet volume  
    noBets: ResultOption[]               // List D: Zero bets (100% profit)
}

// ==========================================
// RESULT CALCULATION HELPERS
// ==========================================

/**
 * Calculate single from triple (sum of digits, rightmost)
 */
export function calculateSingle(triple: string): number {
    if (!triple || triple.length !== 3) return 0

    const sum = triple.split('').reduce((acc, digit) => acc + parseInt(digit), 0)
    return sum % 10
}

/**
 * Calculate jodi from open and close singles
 */
export function calculateJodi(openSingle: number | string, closeSingle: number | string): string {
    return `${openSingle}${closeSingle}`
}

// ==========================================
// API INTERACTION
// ==========================================

/**
 * Get results from API
 */
export async function getResults(
    gameDate?: string,
    sessionName?: SessionType,
    limit: number = 30
): Promise<GameResult[]> {
    try {
        let url = `/api/results?limit=${limit}`
        if (gameDate) url += `&date=${gameDate}`
        if (sessionName) url += `&session=${sessionName}`

        const response = await fetch(url)
        const data = await response.json()

        return data.results || []
    } catch (error) {
        console.error('Get results error:', error)
        return []
    }
}

/**
 * Get today's results
 */
export async function getTodayResults(): Promise<GameResult[]> {
    const today = new Date().toISOString().split('T')[0]
    return getResults(today)
}

/**
 * Declare result (admin only)
 */
export async function declareResult(
    gameDate: string,
    sessionName: SessionType,
    target: 'open' | 'close',
    triple: string
): Promise<{ success: boolean; error?: string; result?: GameResult }> {
    try {
        const response = await fetch('/api/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gameDate,
                sessionName,
                target,
                triple
            })
        })

        const data = await response.json()

        if (!response.ok) {
            return { success: false, error: data.error }
        }

        return { success: true, result: data.result }
    } catch (error) {
        console.error('Declare result error:', error)
        return { success: false, error: 'Network error. Please try again.' }
    }
}

/**
 * Get result recommendations (admin only)
 */
export async function getResultRecommendations(
    gameDate: string,
    sessionName: SessionType,
    target: BetTarget,
    targetPayoutPercentage: number = 15
): Promise<ResultRecommendations | null> {
    try {
        const response = await fetch(
            `/api/analytics?type=recommendations&date=${gameDate}&session=${sessionName}&target=${target}&targetPayout=${targetPayoutPercentage}`
        )

        const data = await response.json()

        if (data.recommendations) {
            return data.recommendations
        }

        return null
    } catch (error) {
        console.error('Get recommendations error:', error)
        return null
    }
}

/**
 * Get liability report (admin only)
 */
export async function getLiabilityReport(
    gameDate: string,
    sessionName: SessionType,
    target: BetTarget
) {
    try {
        const response = await fetch(
            `/api/analytics?type=liability&date=${gameDate}&session=${sessionName}&target=${target}`
        )

        const data = await response.json()
        return data.liability || []
    } catch (error) {
        console.error('Get liability error:', error)
        return []
    }
}

// ==========================================
// ANALYTICS
// ==========================================

/**
 * Get staff performance analytics
 */
export async function getAnalytics(gameDate?: string) {
    try {
        let url = '/api/analytics?type=summary'
        if (gameDate) url += `&date=${gameDate}`

        const response = await fetch(url)
        const data = await response.json()

        return data.analytics || []
    } catch (error) {
        console.error('Get analytics error:', error)
        return []
    }
}

/**
 * Get today's collection total
 */
export async function getTodayCollection(): Promise<number> {
    const today = new Date().toISOString().split('T')[0]
    const analytics = await getAnalytics(today)

    return analytics.reduce((sum: number, a: { total_collection: number }) =>
        sum + (a.total_collection || 0), 0
    )
}

/**
 * Get today's profit
 */
export async function getTodayProfit(): Promise<number> {
    const today = new Date().toISOString().split('T')[0]
    const analytics = await getAnalytics(today)

    return analytics.reduce((sum: number, a: { profit: number }) =>
        sum + (a.profit || 0), 0
    )
}

// ==========================================
// REALTIME SUBSCRIPTIONS
// ==========================================

/**
 * Subscribe to result changes
 */
export function subscribeToResults(callback: (result: GameSession) => void) {
    const supabase = createClient()

    const channel = supabase
        .channel('results-realtime')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'game_sessions' },
            (payload) => {
                if (payload.new) {
                    callback(payload.new as GameSession)
                }
            }
        )
        .subscribe()

    return () => {
        supabase.removeChannel(channel)
    }
}

/**
 * Subscribe to new bets (admin only)
 */
export function subscribeToBets(callback: (bet: unknown) => void) {
    const supabase = createClient()

    const channel = supabase
        .channel('bets-realtime')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'bets' },
            (payload) => {
                if (payload.new) {
                    callback(payload.new)
                }
            }
        )
        .subscribe()

    return () => {
        supabase.removeChannel(channel)
    }
}
