// ==========================================
// MATKA GAME - TYPE DEFINITIONS
// ==========================================
// These types match the Supabase database schema

// Database Enums
export type UserRole = 'admin' | 'staff'
export type SessionType = 'morning' | 'night'
export type BetCategory = 'single' | 'jodi' | 'single_patti' | 'double_patti' | 'triple_patti'
export type BetTarget = 'open' | 'close' | 'jodi_full'
export type BetStatus = 'pending' | 'won' | 'lost' | 'refunded'

// Patti category types (new system)
export type PattiCategory = 'single_patti' | 'double_patti' | 'triple_patti'
export const PATTI_CATEGORIES: PattiCategory[] = ['single_patti', 'double_patti', 'triple_patti']

// Payout Multipliers (from game_config)
export const PAYOUT_MULTIPLIERS: Record<string, number> = {
    single: 9,            // 10 ka 90
    jodi: 90,             // 10 ka 900
    single_patti: 1400,   // 10 ka 14000
    double_patti: 2800,   // 10 ka 28000
    triple_patti: 8000,   // 10 ka 80000
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
    payout_single_patti: number
    payout_double_patti: number
    payout_triple_patti: number
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
    payout_single_patti: number
    payout_double_patti: number
    payout_triple_patti: number
    potential_liability: number
}

// ==========================================
// FRONTEND HELPER TYPES
// ==========================================

// Result Option for Admin Selection (computed from liability)
export interface ResultOption {
    triple: string
    pattiType: string // 'single_patti' | 'double_patti' | 'triple_patti'
    single: number
    totalBets: number
    totalLiability: number
    payoutPercentage: number
    profitPercentage: number
    // Per-category breakdown
    singlePattiBets: number
    singlePattiLiability: number
    doublePattiBets: number
    doublePattiLiability: number
    triplePattiBets: number
    triplePattiLiability: number
    singleBets: number
    singleLiability: number
    jodiBets: number
    jodiLiability: number
    jodiNumbers: string[]
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

// ==========================================
// PATTI MASTER DATA (220 valid pattis)
// ==========================================
export interface PattiMaster {
    patti_number: string
    patti_type: PattiCategory
    single_digit: string
}

// All 220 valid patti numbers grouped by type
export const PATTI_NUMBERS: Record<PattiCategory, Record<string, string[]>> = {
    single_patti: {
        '1': ['128', '137', '146', '236', '245', '290', '380', '470', '489', '560', '678', '579'],
        '2': ['129', '138', '147', '156', '237', '246', '345', '390', '480', '570', '679', '589'],
        '3': ['120', '139', '148', '157', '238', '247', '256', '346', '490', '580', '670', '689'],
        '4': ['130', '149', '158', '167', '239', '248', '257', '347', '356', '590', '680', '789'],
        '5': ['140', '159', '168', '230', '249', '258', '267', '348', '357', '456', '690', '780'],
        '6': ['123', '150', '169', '178', '240', '259', '268', '349', '358', '457', '367', '790'],
        '7': ['124', '160', '179', '250', '269', '278', '340', '359', '368', '458', '467', '890'],
        '8': ['125', '134', '170', '189', '260', '279', '350', '369', '378', '459', '567', '468'],
        '9': ['126', '135', '180', '234', '270', '289', '360', '379', '450', '469', '478', '568'],
        '0': ['127', '136', '145', '190', '235', '280', '370', '479', '460', '569', '389', '578'],
    },
    double_patti: {
        '1': ['100', '119', '155', '227', '335', '344', '399', '588', '669'],
        '2': ['200', '110', '228', '255', '336', '499', '660', '688', '778'],
        '3': ['300', '166', '229', '337', '355', '445', '599', '779', '788'],
        '4': ['400', '112', '220', '266', '338', '446', '455', '699', '770'],
        '5': ['500', '113', '122', '177', '339', '366', '447', '799', '889'],
        '6': ['600', '114', '277', '330', '448', '466', '556', '880', '899'],
        '7': ['700', '115', '133', '188', '223', '377', '449', '557', '566'],
        '8': ['800', '116', '224', '233', '288', '440', '477', '558', '990'],
        '9': ['900', '117', '144', '199', '225', '388', '559', '577', '667'],
        '0': ['550', '668', '244', '299', '226', '488', '677', '118', '334'],
    },
    triple_patti: {
        '1': ['777'],
        '2': ['444'],
        '3': ['111'],
        '4': ['888'],
        '5': ['555'],
        '6': ['222'],
        '7': ['999'],
        '8': ['666'],
        '9': ['333'],
        '0': ['000'],
    },
}

// Build a flat set of all valid patti numbers for quick lookup
export const ALL_VALID_PATTIS: Set<string> = new Set(
    Object.values(PATTI_NUMBERS).flatMap(groups => Object.values(groups).flat())
)

// Get patti type for a number (returns null if not a valid patti)
export function getPattiType(number: string): PattiCategory | null {
    for (const type of PATTI_CATEGORIES) {
        for (const group of Object.values(PATTI_NUMBERS[type])) {
            if (group.includes(number)) return type
        }
    }
    return null
}

// Get single digit from a patti number
export function getPattiSingleDigit(number: string): string | null {
    for (const type of PATTI_CATEGORIES) {
        for (const [digit, group] of Object.entries(PATTI_NUMBERS[type])) {
            if (group.includes(number)) return digit
        }
    }
    return null
}

// Patti category display names
export const PATTI_LABELS: Record<PattiCategory, string> = {
    single_patti: 'SP',
    double_patti: 'DP',
    triple_patti: 'TP',
}

export const PATTI_FULL_LABELS: Record<PattiCategory, string> = {
    single_patti: 'Single Patti',
    double_patti: 'Double Patti',
    triple_patti: 'Triple Patti',
}
