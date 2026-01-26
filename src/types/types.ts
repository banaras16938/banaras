// ==========================================
// MATKA GAME - TYPE DEFINITIONS
// ==========================================
// These types match the Supabase database schema

// Database Enums
export type UserRole = 'admin' | 'staff'
export type SessionType = 'morning' | 'night'
export type BetCategory = 'single' | 'jodi' | 'triple'
export type BetTarget = 'open' | 'close' | 'jodi_full'
export type BetStatus = 'pending' | 'won' | 'lost' | 'refunded'

// Payout Multipliers (from game_config)
export const PAYOUT_MULTIPLIERS = {
    single: 9,    // 10 ka 90
    jodi: 90,     // 10 ka 900
    triple: 800,  // 10 ka 8000
} as const

// ==========================================
// DATABASE TABLE TYPES
// ==========================================

// Profile (Staff/Admin)
export interface Profile {
    id: string
    email: string | null
    role: UserRole
    is_active: boolean
    created_at: string
}

// Extended Staff Profile (includes additional fields from profiles table)
export interface Staff extends Profile {
    name: string | null
    phone: string | null
    address: string | null
    last_login: string | null
}

// Game Schedule (Dynamic Timing Control)
export interface GameSchedule {
    session_name: SessionType
    start_time: string          // TIME format: "09:00:00"
    open_bet_freeze_time: string
    open_result_time: string
    close_bet_resume_time: string | null
    close_bet_freeze_time: string
    close_result_time: string
}

// Holiday
export interface Holiday {
    holiday_date: string        // DATE format: "2026-01-01"
    description: string | null
    created_at: string
}

// Player (End user placing bets through staff)
export interface Player {
    id: string
    name: string
    phone: string | null
    created_by: string          // Profile ID
    created_at: string
}

// Game Config (Payout settings)
export interface GameConfig {
    id: number
    payout_single: number
    payout_jodi: number
    payout_triple: number
}

// Game Session (Daily game instance)
export interface GameSession {
    id: string
    game_date: string           // DATE format: "2026-01-11"
    session_name: SessionType
    open_triple: string | null  // VARCHAR(3)
    open_single: string | null  // VARCHAR(1)
    close_triple: string | null // VARCHAR(3)
    close_single: string | null // VARCHAR(1)
    jodi_result: string | null  // VARCHAR(2)
    created_at: string
}

// Bet
export interface Bet {
    id: string
    game_session_id: string
    player_id: string
    staff_id: string
    category: BetCategory
    target: BetTarget
    selected_number: string
    amount: number
    status: BetStatus
    winning_amount: number
    created_at: string
}

// ==========================================
// VIEW TYPES
// ==========================================

// Staff Performance (from view_staff_performance)
export interface StaffPerformance {
    staff_email: string
    staff_id: string
    game_date: string
    session_name: SessionType
    total_bets_placed: number
    total_collection: number
    total_payouts_given: number
    profit: number
}

// Liability Report (from view_liability_report)
export interface LiabilityReport {
    game_session_id: string
    game_date: string
    session_name: SessionType
    category: BetCategory
    target: BetTarget
    selected_number: string
    bet_count: number
    total_bet_amount: number
    payout_single: number
    payout_jodi: number
    payout_triple: number
    potential_liability: number
}

// ==========================================
// FRONTEND HELPER TYPES
// ==========================================

// Result Option for Admin Selection (computed from liability)
export interface ResultOption {
    triple: string
    single: number
    totalBets: number
    totalLiability: number
    payoutPercentage: number
    profitPercentage: number
}

// Result Recommendations (4 Lists per SRS)
export interface ResultRecommendations {
    targetMatch: ResultOption[]          // List A: Match slider percentage
    systemRecommendations: ResultOption[] // List B: Highest profit
    lowBets: ResultOption[]              // List C: Low bet volume  
    noBets: ResultOption[]               // List D: Zero bets (100% profit)
}

/**
 * @deprecated Use schedules from game_schedules table instead.
 * This is kept for backwards compatibility but times should be fetched from database.
 */
export const GAME_SCHEDULE_UI: { session: SessionType; label: string; times: string }[] = [
    { session: 'morning', label: 'Morning Game', times: '1:00 PM & 3:00 PM' },
    { session: 'night', label: 'Night Game', times: '6:00 PM & 8:00 PM' },
]

// Bet Form Data
export interface BetFormData {
    gameDate: string
    sessionName: SessionType
    category: BetCategory
    target: BetTarget
    selectedNumber: string
    amount: number
    playerId: string
    playerName?: string
    playerPhone?: string
}

// Auth User (for frontend context)
export interface AuthUser {
    id: string
    email: string
    role: UserRole
    isActive: boolean
}

// API Response Types
export interface ApiResponse<T> {
    data?: T
    error?: string
}

// Game Result (Combined for display)
export interface GameResult {
    id: string
    game_date: string
    session_name: SessionType
    open_triple: string | null
    open_single: string | null
    close_triple: string | null
    close_single: string | null
    jodi_result: string | null
    is_open_declared: boolean
    is_close_declared: boolean
    created_at: string
}

// Helper to check if session is declared
export function isOpenDeclared(session: GameSession): boolean {
    return session.open_triple !== null && session.open_single !== null
}

export function isCloseDeclared(session: GameSession): boolean {
    return session.close_triple !== null && session.close_single !== null
}

// Convert GameSession to GameResult for UI compatibility
export function sessionToResult(session: GameSession): GameResult {
    return {
        id: session.id,
        game_date: session.game_date,
        session_name: session.session_name,
        open_triple: session.open_triple,
        open_single: session.open_single,
        close_triple: session.close_triple,
        close_single: session.close_single,
        jodi_result: session.jodi_result,
        is_open_declared: isOpenDeclared(session),
        is_close_declared: isCloseDeclared(session),
        created_at: session.created_at,
    }
}
