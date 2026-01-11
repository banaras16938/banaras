// User Roles
export type UserRole = 'user' | 'staff' | 'admin'

// Game Types
export type GameType = 'single' | 'double' | 'triple'
export type GameSlot = 'morning' | 'night'
export type BetType = 'open' | 'close' | 'jodi'

// Payout Multipliers
export const PAYOUT_MULTIPLIERS = {
    single: 9,    // 10 ka 90
    double: 90,   // 10 ka 900
    triple: 800,  // 10 ka 8000
} as const

// Staff interface
export interface Staff {
    id: string
    user_id: string
    name: string
    email?: string
    phone?: string
    is_active: boolean
    created_at: string
    created_by: string
    last_login?: string
}

// Bet interface
export interface Bet {
    id: string
    staff_id: string
    user_identifier: string
    game_date: string
    game_slot: GameSlot
    bet_type: BetType
    game_type: GameType
    number: string
    amount: number
    potential_payout: number
    is_winner?: boolean
    payout_amount?: number
    created_at: string
}

// Game Result interface
export interface GameResult {
    id: string
    game_date: string
    slot: GameSlot
    open_triple: string | null
    open_single: number | null
    close_triple: string | null
    close_single: number | null
    jodi: string | null
    is_open_declared: boolean
    is_close_declared: boolean
    declared_by?: string
    created_at: string
    updated_at: string
}

// Result Option for Admin Selection
export interface ResultOption {
    triple: string
    single: number
    totalBets: number
    totalLiability: number
    payoutPercentage: number
    profitPercentage: number
}

// Lists for Admin Result Selector
export interface ResultLists {
    targetMatch: ResultOption[]      // List A: Match slider percentage
    systemRecommendations: ResultOption[]  // List B: Highest profit
    lowBets: ResultOption[]          // List C: Low bet volume
    noBets: ResultOption[]           // List D: Zero bets (100% profit)
}

// Profit Analytics
export interface ProfitAnalytics {
    totalCollection: number
    totalPayout: number
    netProfit: number
    profitPercentage: number
    date: string
    slot?: GameSlot
}

// Game Schedule
export interface GameSchedule {
    slot: GameSlot
    bettingStart: string
    openStopWindow: { start: string; end: string }
    openResult: string
    closeStopWindow: { start: string; end: string }
    closeResult: string
}

export const GAME_SCHEDULE: GameSchedule[] = [
    {
        slot: 'morning',
        bettingStart: '09:00',
        openStopWindow: { start: '12:30', end: '13:00' },
        openResult: '13:00',
        closeStopWindow: { start: '14:30', end: '15:00' },
        closeResult: '15:00',
    },
    {
        slot: 'night',
        bettingStart: '09:00',
        openStopWindow: { start: '17:30', end: '18:00' },
        openResult: '18:00',
        closeStopWindow: { start: '19:30', end: '20:00' },
        closeResult: '20:00',
    },
]

// Auth User
export interface AuthUser {
    id: string
    email?: string
    role: UserRole
    staff?: Staff
}
