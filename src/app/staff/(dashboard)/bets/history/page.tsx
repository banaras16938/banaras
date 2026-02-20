'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { BetCategory, BetTarget, SessionType } from '@/types/types'
import { RefreshCw, TrendingUp, TrendingDown, Wallet, Clock, Trophy, XCircle, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

// ==========================================
// TYPES
// ==========================================

interface GameSessionInfo {
    id: string
    game_date: string
    session_name: SessionType
    open_triple: string | null
    open_single: string | null
    close_triple: string | null
    close_single: string | null
    jodi_result: string | null
}

interface BetEntry {
    id: string
    category: BetCategory
    target: BetTarget
    selected_number: string
    amount: number
    status: 'pending' | 'won' | 'lost' | 'refunded'
    winning_amount: number
    created_at: string
    player: { name: string; phone: string | null } | null
    game_session: GameSessionInfo | null
}

// Sub-tab filter keys
type SubTab = 'all' | 'morning_open' | 'morning_close' | 'night_open' | 'night_close' | 'jodi'

const SUB_TABS: { key: SubTab; label: string; short: string }[] = [
    { key: 'all', label: 'All', short: 'All' },
    { key: 'morning_open', label: 'Morn Open', short: 'M-O' },
    { key: 'morning_close', label: 'Morn Close', short: 'M-C' },
    { key: 'night_open', label: 'Night Open', short: 'N-O' },
    { key: 'night_close', label: 'Night Close', short: 'N-C' },
    { key: 'jodi', label: 'Jodi', short: 'Jodi' },
]

// ==========================================
// HELPERS
// ==========================================

function filterBySubTab(bets: BetEntry[], tab: SubTab): BetEntry[] {
    if (tab === 'all') return bets
    if (tab === 'jodi') return bets.filter(b => b.target === 'jodi_full')
    const [session, target] = tab.split('_') as [SessionType, 'open' | 'close']
    return bets.filter(b =>
        b.game_session?.session_name === session && b.target === target
    )
}

function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    })
}

function getCategoryColor(cat: BetCategory): string {
    switch (cat) {
        case 'single': return 'from-blue-500 to-blue-600'
        case 'jodi': return 'from-purple-500 to-purple-600'
        case 'triple': return 'from-amber-500 to-amber-600'
    }
}

function getCategoryBg(cat: BetCategory): string {
    switch (cat) {
        case 'single': return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
        case 'jodi': return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
        case 'triple': return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    }
}

function getTargetLabel(target: BetTarget): string {
    if (target === 'jodi_full') return 'Jodi'
    return target.charAt(0).toUpperCase() + target.slice(1)
}

function getStatusConfig(status: string) {
    switch (status) {
        case 'won': return { icon: Trophy, color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Won' }
        case 'lost': return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/15', label: 'Lost' }
        case 'refunded': return { icon: RotateCcw, color: 'text-yellow-400', bg: 'bg-yellow-500/15', label: 'Refunded' }
        default: return { icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-500/15', label: 'Pending' }
    }
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function BetHistoryPage() {
    const [positions, setPositions] = useState<BetEntry[]>([])
    const [orders, setOrders] = useState<BetEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [mainTab, setMainTab] = useState<'positions' | 'orders'>('positions')
    const [subTab, setSubTab] = useState<SubTab>('all')
    const [refreshing, setRefreshing] = useState(false)

    const fetchHistory = useCallback(async (showToast = false) => {
        if (showToast) setRefreshing(true)
        else setLoading(true)

        try {
            const res = await fetch('/api/bets/history')
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Failed to fetch')

            setPositions(data.positions || [])
            setOrders(data.orders || [])
            if (showToast) toast.success('Refreshed')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load history')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => { fetchHistory() }, [fetchHistory])



    // Reset sub tab when switching main tab
    useEffect(() => { setSubTab('all') }, [mainTab])

    // Filtered data
    const activeBets = mainTab === 'positions' ? positions : orders
    const filteredBets = useMemo(() => filterBySubTab(activeBets, subTab), [activeBets, subTab])

    // Summary stats
    const stats = useMemo(() => {
        const allBets = [...positions, ...orders]
        const totalInvested = allBets.reduce((s, b) => s + Number(b.amount), 0)
        const totalWon = orders.filter(b => b.status === 'won').reduce((s, b) => s + Number(b.winning_amount), 0)
        const totalLost = orders.filter(b => b.status === 'lost').reduce((s, b) => s + Number(b.amount), 0)
        const pnl = totalWon - totalLost
        const pendingAmount = positions.reduce((s, b) => s + Number(b.amount), 0)
        return { totalInvested, totalWon, pnl, pendingAmount }
    }, [positions, orders])

    // Sub-tab counts
    const subTabCounts = useMemo(() => {
        const counts: Record<SubTab, number> = {
            all: activeBets.length,
            morning_open: 0,
            morning_close: 0,
            night_open: 0,
            night_close: 0,
            jodi: 0,
        }
        for (const b of activeBets) {
            if (b.target === 'jodi_full') { counts.jodi++; continue }
            const session = b.game_session?.session_name
            if (session === 'morning' && b.target === 'open') counts.morning_open++
            else if (session === 'morning' && b.target === 'close') counts.morning_close++
            else if (session === 'night' && b.target === 'open') counts.night_open++
            else if (session === 'night' && b.target === 'close') counts.night_close++
        }
        return counts
    }, [activeBets])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">Bet History</h1>
                    <p className="text-sm text-gray-500">Today&apos;s positions &amp; orders</p>
                </div>
                <button
                    onClick={() => fetchHistory(true)}
                    disabled={refreshing}
                    className="p-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 transition-colors"
                >
                    <RefreshCw size={18} className={`text-gray-300 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-3 text-center">
                    <Wallet size={16} className="mx-auto text-gray-400 mb-1" />
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Invested</p>
                    <p className="text-base font-bold text-white mt-0.5">₹{stats.totalInvested.toLocaleString()}</p>
                </div>
                <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-3 text-center">
                    <Trophy size={16} className="mx-auto text-emerald-400 mb-1" />
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Won</p>
                    <p className="text-base font-bold text-emerald-400 mt-0.5">₹{stats.totalWon.toLocaleString()}</p>
                </div>
                <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-3 text-center">
                    {stats.pnl >= 0
                        ? <TrendingUp size={16} className="mx-auto text-emerald-400 mb-1" />
                        : <TrendingDown size={16} className="mx-auto text-red-400 mb-1" />
                    }
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">P&amp;L</p>
                    <p className={`text-base font-bold mt-0.5 ${stats.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stats.pnl >= 0 ? '+' : ''}₹{stats.pnl.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Main Tabs: Positions / Orders */}
            <div className="flex rounded-xl overflow-hidden border border-gray-700">
                <button
                    onClick={() => setMainTab('positions')}
                    className={`flex-1 py-3.5 font-semibold text-sm transition-all relative ${mainTab === 'positions'
                        ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                >
                    <span className="flex items-center justify-center gap-2">
                        <Clock size={15} />
                        Positions
                        {positions.length > 0 && (
                            <span className="bg-cyan-500/30 text-cyan-300 text-xs px-1.5 py-0.5 rounded-full font-mono">
                                {positions.length}
                            </span>
                        )}
                    </span>
                </button>
                <button
                    onClick={() => setMainTab('orders')}
                    className={`flex-1 py-3.5 font-semibold text-sm transition-all relative ${mainTab === 'orders'
                        ? 'bg-indigo-500/20 text-indigo-400 border-b-2 border-indigo-400'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                >
                    <span className="flex items-center justify-center gap-2">
                        <Trophy size={15} />
                        Orders
                        {orders.length > 0 && (
                            <span className="bg-indigo-500/30 text-indigo-300 text-xs px-1.5 py-0.5 rounded-full font-mono">
                                {orders.length}
                            </span>
                        )}
                    </span>
                </button>
            </div>

            {/* Sub Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {SUB_TABS.map((tab) => {
                    const count = subTabCounts[tab.key]
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setSubTab(tab.key)}
                            className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${subTab === tab.key
                                ? mainTab === 'positions'
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                    : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                : 'bg-gray-800 text-gray-500 border border-gray-700 hover:bg-gray-700'
                                }`}
                        >
                            {tab.label}
                            {count > 0 && (
                                <span className="ml-1 text-[10px] opacity-70">({count})</span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Pending Amount Banner (only on positions tab) */}
            {mainTab === 'positions' && stats.pendingAmount > 0 && (
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs text-cyan-300/80">Pending Amount</span>
                    <span className="text-sm font-bold text-cyan-400 font-mono">₹{stats.pendingAmount.toLocaleString()}</span>
                </div>
            )}

            {/* Bet Cards */}
            <div className="space-y-2">
                {filteredBets.length === 0 ? (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl py-12 text-center">
                        <div className="text-gray-600 text-4xl mb-3">
                            {mainTab === 'positions' ? '📊' : '📋'}
                        </div>
                        <p className="text-gray-500 font-medium">
                            {mainTab === 'positions' ? 'No open positions' : 'No executed orders'}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                            {mainTab === 'positions'
                                ? 'Place some bets to see them here'
                                : 'Results will appear after declaration'
                            }
                        </p>
                    </div>
                ) : (
                    filteredBets.map((bet) => (
                        <BetCard key={bet.id} bet={bet} isPosition={mainTab === 'positions'} />
                    ))
                )}
            </div>
        </div>
    )
}

// ==========================================
// BET CARD COMPONENT
// ==========================================

function BetCard({ bet, isPosition }: { bet: BetEntry; isPosition: boolean }) {
    const statusConfig = getStatusConfig(bet.status)
    const StatusIcon = statusConfig.icon
    const sessionLabel = bet.game_session?.session_name === 'morning' ? 'Morning' : 'Night'

    return (
        <div className={`bg-gray-800/80 border rounded-xl overflow-hidden transition-all hover:bg-gray-800 ${isPosition ? 'border-gray-700' : 'border-gray-700'
            }`}>
            {/* Card Header Strip */}
            <div className={`h-1 bg-gradient-to-r ${isPosition ? 'from-cyan-500 to-blue-500' : getCategoryColor(bet.category)
                }`} />

            <div className="p-3">
                {/* Row 1: Player, Number, Status */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Number Badge */}
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getCategoryColor(bet.category)} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-white font-bold font-mono text-sm">{bet.selected_number}</span>
                        </div>
                        {/* Player + Meta */}
                        <div className="min-w-0 flex-1">
                            <p className="text-white font-medium text-sm truncate">
                                {bet.player?.name || 'Unknown'}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                <span>{sessionLabel}</span>
                                <span className="text-gray-600">•</span>
                                <span>{getTargetLabel(bet.target)}</span>
                                <span className="text-gray-600">•</span>
                                <span>{formatTime(bet.created_at)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${statusConfig.bg} ${statusConfig.color}`}>
                        {isPosition ? (
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                            </span>
                        ) : (
                            <StatusIcon size={12} />
                        )}
                        {statusConfig.label}
                    </div>
                </div>

                {/* Row 2: Details */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase ${getCategoryBg(bet.category)}`}>
                            {bet.category}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <span className="text-[10px] text-gray-500 block">Invested</span>
                            <span className="text-sm font-bold text-white font-mono">₹{Number(bet.amount).toLocaleString()}</span>
                        </div>
                        {bet.status === 'won' && (
                            <div className="text-right">
                                <span className="text-[10px] text-emerald-500 block">Won</span>
                                <span className="text-sm font-bold text-emerald-400 font-mono">
                                    +₹{Number(bet.winning_amount).toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
