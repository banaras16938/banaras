'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Input } from '@/components/ui/Input'
import {
    Eye,
    EyeOff,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Users,
    Wallet,
    Trophy,
    X,
    ChevronDown,
    ChevronUp,
    IndianRupee,
    List
} from 'lucide-react'
import { toast } from 'sonner'

// ==========================================
// TYPES
// ==========================================

interface CategoryBreakdown {
    collection: number
    payout: number
    profit: number
    betCount: number
}

interface TargetBreakdown {
    collection: number
    payout: number
    profit: number
    betCount: number
    wonCount: number
    lostCount: number
    pendingCount: number
    categories: Record<string, CategoryBreakdown>
}

interface SessionBreakdown {
    open: TargetBreakdown
    close: TargetBreakdown
    jodi: TargetBreakdown
    collection: number
    payout: number
    profit: number
}

interface BetDetail {
    id: string
    playerName: string
    category: string
    target: string
    selectedNumber: string
    amount: number
    status: string
    winningAmount: number
    sessionName: string
    createdAt: string
}

interface StaffData {
    staffId: string
    staffEmail: string
    staffName: string
    morning: SessionBreakdown
    night: SessionBreakdown
    totalCollection: number
    totalPayout: number
    totalProfit: number
    totalBets: number
    bets: BetDetail[]
}

interface SummaryData {
    totalCollection: number
    totalPayout: number
    netProfit: number
    totalBets: number
    wonBets: number
    lostBets: number
}

interface HisabKitabData {
    date: string
    isToday: boolean
    summary: SummaryData
    staffBreakdown: StaffData[]
}

// ==========================================
// MAIN PAGE
// ==========================================

export default function HisabKitabPage() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<HisabKitabData | null>(null)
    const [selectedDate, setSelectedDate] = useState<'today' | 'yesterday'>('today')
    const [showCriticalData, setShowCriticalData] = useState(false)
    const [showPinModal, setShowPinModal] = useState(false)
    const [pin, setPin] = useState('')
    const [pinError, setPinError] = useState('')
    const [verifying, setVerifying] = useState(false)
    const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set())
    const [showBets, setShowBets] = useState<Set<string>>(new Set())

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const today = new Date()
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)

            const dateStr = selectedDate === 'today'
                ? today.toISOString().split('T')[0]
                : yesterday.toISOString().split('T')[0]

            const response = await fetch(`/api/analytics?type=hisab-kitab&date=${dateStr}`)
            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch data')
            }

            setData(result)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load data')
            setData(null)
        } finally {
            setLoading(false)
        }
    }, [selectedDate])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handlePinSubmit = async () => {
        if (pin.length !== 4) {
            setPinError('Enter 4-digit PIN')
            return
        }

        setVerifying(true)
        setPinError('')

        try {
            const response = await fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify_pin', pin })
            })

            const result = await response.json()

            if (result.verified) {
                setShowCriticalData(true)
                setShowPinModal(false)
                setPin('')
                toast.success('Critical data unlocked')
            } else {
                setPinError('Wrong PIN')
            }
        } catch {
            setPinError('Verification failed')
        } finally {
            setVerifying(false)
        }
    }

    const fmt = (amount: number) => `₹${amount.toLocaleString('en-IN')}`

    const toggleStaff = (staffId: string) => {
        setExpandedStaff(prev => {
            const next = new Set(prev)
            if (next.has(staffId)) next.delete(staffId)
            else next.add(staffId)
            return next
        })
    }

    const toggleBets = (staffId: string) => {
        setShowBets(prev => {
            const next = new Set(prev)
            if (next.has(staffId)) next.delete(staffId)
            else next.add(staffId)
            return next
        })
    }

    const showOrLock = (value: React.ReactNode) => {
        if (showCriticalData) return value
        return (
            <button
                onClick={() => setShowPinModal(true)}
                className="text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
            >
                <span>****</span>
                <Eye size={14} />
            </button>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Hisab-Kitab</h1>
                    <p className="text-gray-400">
                        Daily staff settlement &amp; profit overview
                        {data && <span className="ml-2 text-gray-500">• {data.date}</span>}
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="flex rounded-lg overflow-hidden border border-gray-700">
                        <button
                            onClick={() => setSelectedDate('today')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${selectedDate === 'today'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setSelectedDate('yesterday')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${selectedDate === 'yesterday'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            Yesterday
                        </button>
                    </div>
                    <button
                        onClick={fetchData}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Overall Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Users size={16} className="text-blue-400" />
                        <span className="text-xs text-gray-400">Total Bets</span>
                    </div>
                    <p className="text-xl font-bold text-white">{data?.summary.totalBets || 0}</p>
                    {showCriticalData && data && (
                        <p className="text-xs text-gray-500 mt-1">
                            <span className="text-emerald-400">{data.summary.wonBets} won</span>
                            {' • '}
                            <span className="text-red-400">{data.summary.lostBets} lost</span>
                        </p>
                    )}
                </div>

                <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Wallet size={16} className="text-cyan-400" />
                        <span className="text-xs text-gray-400">Collection</span>
                    </div>
                    {showOrLock(
                        <p className="text-xl font-bold text-cyan-400">{fmt(data?.summary.totalCollection || 0)}</p>
                    )}
                </div>

                <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingDown size={16} className="text-red-400" />
                        <span className="text-xs text-gray-400">Payout</span>
                    </div>
                    {showOrLock(
                        <p className="text-xl font-bold text-red-400">{fmt(data?.summary.totalPayout || 0)}</p>
                    )}
                </div>

                <div className={`bg-gray-800/80 border rounded-xl p-4 ${showCriticalData && data
                    ? data.summary.netProfit >= 0
                        ? 'border-emerald-500/30'
                        : 'border-red-500/30'
                    : 'border-gray-700'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={16} className={
                            showCriticalData && data
                                ? data.summary.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                                : 'text-gray-400'
                        } />
                        <span className="text-xs text-gray-400">Net Profit</span>
                    </div>
                    {showOrLock(
                        <p className={`text-xl font-bold ${(data?.summary.netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {(data?.summary.netProfit || 0) >= 0 ? '+' : ''}{fmt(data?.summary.netProfit || 0)}
                        </p>
                    )}
                </div>
            </div>

            {/* Toggle critical data */}
            {showCriticalData && (
                <div className="flex justify-end">
                    <button
                        onClick={() => setShowCriticalData(false)}
                        className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
                    >
                        <EyeOff size={12} />
                        Hide sensitive data
                    </button>
                </div>
            )}

            {/* Staff Cards */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Users size={18} className="text-purple-400" />
                    Staff Settlement
                    <span className="text-sm text-gray-500 font-normal">({data?.staffBreakdown.length || 0} staff)</span>
                </h2>

                {!data?.staffBreakdown.length ? (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl py-12 text-center text-gray-500">
                        No staff data for this date
                    </div>
                ) : (
                    <div className="space-y-3">
                        {data.staffBreakdown.map(staff => {
                            const isExpanded = expandedStaff.has(staff.staffId)
                            const isBetsVisible = showBets.has(staff.staffId)
                            const settlement = staff.totalProfit
                            const staffSettlementLabel = settlement >= 0
                                ? `Staff gives ₹${Math.abs(settlement).toLocaleString('en-IN')}`
                                : `Admin pays ₹${Math.abs(settlement).toLocaleString('en-IN')}`

                            return (
                                <div
                                    key={staff.staffId}
                                    className="bg-gray-800/80 border border-gray-700 rounded-xl overflow-hidden"
                                >
                                    {/* Staff Header - always visible */}
                                    <button
                                        onClick={() => toggleStaff(staff.staffId)}
                                        className="w-full p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                                                <span className="text-white font-bold text-sm">
                                                    {(staff.staffName || 'S').charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="text-left min-w-0">
                                                <p className="text-white font-medium text-sm truncate">{staff.staffName}</p>
                                                <p className="text-gray-500 text-xs">{staff.totalBets} bets</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {showCriticalData ? (
                                                <Badge
                                                    variant={settlement >= 0 ? 'success' : 'error'}
                                                    className="font-mono text-xs"
                                                >
                                                    {settlement >= 0 ? '↑ Take' : '↓ Give'}{' '}
                                                    {fmt(Math.abs(settlement))}
                                                </Badge>
                                            ) : (
                                                <span className="text-gray-600 text-sm">****</span>
                                            )}
                                            {isExpanded ? (
                                                <ChevronUp size={16} className="text-gray-400" />
                                            ) : (
                                                <ChevronDown size={16} className="text-gray-400" />
                                            )}
                                        </div>
                                    </button>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-700">
                                            {/* Morning Session */}
                                            <SessionDetailBlock
                                                label="☀️ Morning"
                                                session={staff.morning}
                                                showCritical={showCriticalData}
                                                onUnlock={() => setShowPinModal(true)}
                                                fmt={fmt}
                                            />

                                            {/* Night Session */}
                                            <SessionDetailBlock
                                                label="🌙 Night"
                                                session={staff.night}
                                                showCritical={showCriticalData}
                                                onUnlock={() => setShowPinModal(true)}
                                                fmt={fmt}
                                            />

                                            {/* Totals Footer */}
                                            <div className="border-t border-gray-700 p-4 bg-gray-900/50">
                                                <div className="grid grid-cols-3 gap-4 text-center">
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 uppercase">Total Collection</p>
                                                        <p className="text-sm font-bold text-white font-mono">{fmt(staff.totalCollection)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 uppercase">Total Payout</p>
                                                        {showCriticalData ? (
                                                            <p className="text-sm font-bold text-red-400 font-mono">{fmt(staff.totalPayout)}</p>
                                                        ) : (
                                                            <p className="text-sm text-gray-600">****</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 uppercase">Settlement</p>
                                                        {showCriticalData ? (
                                                            <p className={`text-sm font-bold font-mono ${settlement >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                {settlement >= 0 ? '+' : ''}{fmt(settlement)}
                                                            </p>
                                                        ) : (
                                                            <button
                                                                onClick={() => setShowPinModal(true)}
                                                                className="text-sm text-gray-600 hover:text-gray-400 flex items-center gap-1 mx-auto"
                                                            >
                                                                ****
                                                                <Eye size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Settlement Explanation */}
                                                {showCriticalData && (
                                                    <div className={`mt-3 text-center text-xs py-2 px-3 rounded-lg ${settlement >= 0
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                        }`}>
                                                        {staffSettlementLabel}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Bets Toggle */}
                                            {staff.bets.length > 0 && (
                                                <div className="border-t border-gray-700">
                                                    <button
                                                        onClick={() => toggleBets(staff.staffId)}
                                                        className="w-full px-4 py-3 flex items-center justify-between text-xs hover:bg-gray-700/30 transition-colors"
                                                    >
                                                        <span className="flex items-center gap-2 text-gray-400">
                                                            <List size={14} />
                                                            All Bets ({staff.bets.length})
                                                        </span>
                                                        {isBetsVisible ? (
                                                            <ChevronUp size={14} className="text-gray-500" />
                                                        ) : (
                                                            <ChevronDown size={14} className="text-gray-500" />
                                                        )}
                                                    </button>

                                                    {isBetsVisible && (
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left border-collapse">
                                                                <thead>
                                                                    <tr className="border-b border-gray-700 text-gray-500 text-[11px] uppercase">
                                                                        <th className="px-4 py-2 font-medium">Player</th>
                                                                        <th className="px-4 py-2 font-medium">Type</th>
                                                                        <th className="px-4 py-2 font-medium">No.</th>
                                                                        <th className="px-4 py-2 font-medium text-right">Amount</th>
                                                                        <th className="px-4 py-2 font-medium text-right">Result</th>
                                                                        <th className="px-4 py-2 font-medium text-right">Time</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-700/50">
                                                                    {staff.bets.map(bet => (
                                                                        <tr key={bet.id} className="hover:bg-white/5 transition-colors text-xs">
                                                                            <td className="px-4 py-2.5 text-gray-300 max-w-[100px] truncate">{bet.playerName}</td>
                                                                            <td className="px-4 py-2.5">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <Badge
                                                                                        variant={
                                                                                            bet.category === 'jodi' ? 'default' :
                                                                                                bet.category === 'single' ? 'info' :
                                                                                                    'warning'
                                                                                        }
                                                                                        className="text-[10px] px-1.5 py-0.5"
                                                                                    >
                                                                                        {bet.category.charAt(0).toUpperCase() + bet.category.slice(1)}
                                                                                    </Badge>
                                                                                    <span className="text-gray-600 text-[10px]">
                                                                                        {bet.target === 'jodi_full' ? 'J' : bet.target === 'open' ? 'O' : 'C'}
                                                                                    </span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-2.5 font-mono font-bold text-white">{bet.selectedNumber}</td>
                                                                            <td className="px-4 py-2.5 text-right font-mono font-bold text-white">{fmt(bet.amount)}</td>
                                                                            <td className="px-4 py-2.5 text-right">
                                                                                {bet.status === 'won' ? (
                                                                                    <span className="font-mono font-bold text-emerald-400">+{fmt(bet.winningAmount)}</span>
                                                                                ) : bet.status === 'lost' ? (
                                                                                    <span className="text-red-400">Lost</span>
                                                                                ) : (
                                                                                    <span className="text-amber-400">Pending</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-4 py-2.5 text-right text-gray-500 font-mono">
                                                                                {new Date(bet.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* PIN Modal */}
            {showPinModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-gray-900 rounded-xl p-6 w-full max-w-sm mx-4 border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white">Enter PIN</h3>
                            <button
                                onClick={() => {
                                    setShowPinModal(false)
                                    setPin('')
                                    setPinError('')
                                }}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">
                            Enter 4-digit PIN to view critical financial data
                        </p>
                        <Input
                            type="password"
                            placeholder="****"
                            value={pin}
                            onChange={(e) => {
                                setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                                setPinError('')
                            }}
                            className="text-center text-2xl tracking-widest font-mono"
                            maxLength={4}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handlePinSubmit()
                            }}
                        />
                        {pinError && (
                            <p className="text-red-400 text-sm mt-2 text-center">{pinError}</p>
                        )}
                        <button
                            onClick={handlePinSubmit}
                            disabled={verifying || pin.length !== 4}
                            className="w-full mt-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white py-3 rounded-lg font-medium transition-colors"
                        >
                            {verifying ? 'Verifying...' : 'Unlock'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ==========================================
// Session Detail Block (Morning/Night with Open/Close/Jodi)
// ==========================================
function SessionDetailBlock({
    label, session, showCritical, onUnlock, fmt
}: {
    label: string
    session: SessionBreakdown
    showCritical: boolean
    onUnlock: () => void
    fmt: (n: number) => string
}) {
    const hasData = session.collection > 0 || session.payout > 0

    return (
        <div className="border-t border-gray-700 p-4">
            {/* Session Header */}
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-300">{label}</p>
                {hasData && showCritical && (
                    <span className={`text-xs font-mono font-bold ${session.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {session.profit >= 0 ? '+' : ''}{fmt(session.profit)}
                    </span>
                )}
            </div>

            {!hasData ? (
                <p className="text-xs text-gray-600 italic">No bets</p>
            ) : (
                <div className="space-y-2">
                    {/* Open */}
                    <TargetRow
                        label="Open"
                        color="text-blue-400"
                        data={session.open}
                        showCritical={showCritical}
                        onUnlock={onUnlock}
                        fmt={fmt}
                    />
                    {/* Close */}
                    <TargetRow
                        label="Close"
                        color="text-purple-400"
                        data={session.close}
                        showCritical={showCritical}
                        onUnlock={onUnlock}
                        fmt={fmt}
                    />
                    {/* Jodi */}
                    <TargetRow
                        label="Jodi"
                        color="text-amber-400"
                        data={session.jodi}
                        showCritical={showCritical}
                        onUnlock={onUnlock}
                        fmt={fmt}
                    />

                    {/* Session totals */}
                    <div className="border-t border-gray-700/50 pt-2 mt-2 flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-medium">Session Total</span>
                        <div className="flex items-center gap-4">
                            <span className="text-white font-mono">{fmt(session.collection)}</span>
                            {showCritical ? (
                                <>
                                    <span className="text-red-400 font-mono">{fmt(session.payout)}</span>
                                    <span className={`font-mono font-bold ${session.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {session.profit >= 0 ? '+' : ''}{fmt(session.profit)}
                                    </span>
                                </>
                            ) : (
                                <button onClick={onUnlock} className="text-gray-600 hover:text-gray-400 flex items-center gap-1">
                                    **** <Eye size={10} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ==========================================
// Target Row (Open/Close/Jodi within a session)
// ==========================================
function TargetRow({
    label, color, data, showCritical, onUnlock, fmt
}: {
    label: string
    color: string
    data: TargetBreakdown
    showCritical: boolean
    onUnlock: () => void
    fmt: (n: number) => string
}) {
    if (data.betCount === 0) return null

    // For Open/Close: show Single and Triple sub-rows
    // For Jodi: just show the single jodi row
    const isJodi = label === 'Jodi'
    const cats = data.categories

    return (
        <div className="bg-gray-900/40 rounded-lg px-3 py-2 space-y-1">
            {/* Target Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${color}`}>{label}</span>
                    <span className="text-[10px] text-gray-600">{data.betCount} bets</span>
                    {data.wonCount > 0 && (
                        <span className="text-[10px] text-emerald-500">{data.wonCount}W</span>
                    )}
                    {data.lostCount > 0 && (
                        <span className="text-[10px] text-red-500">{data.lostCount}L</span>
                    )}
                    {data.pendingCount > 0 && (
                        <span className="text-[10px] text-amber-500">{data.pendingCount}P</span>
                    )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <span className="text-white font-mono">{fmt(data.collection)}</span>
                    {showCritical ? (
                        <>
                            <span className="text-red-400 font-mono">{fmt(data.payout)}</span>
                            <span className={`font-mono font-bold ${data.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {data.profit >= 0 ? '+' : ''}{fmt(data.profit)}
                            </span>
                        </>
                    ) : (
                        <button onClick={onUnlock} className="text-gray-600 hover:text-gray-400 flex items-center gap-1">
                            **** <Eye size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Category Sub-rows */}
            {!isJodi && Object.entries(cats).map(([catKey, catData]) => {
                if (catData.betCount === 0) return null
                const catLabel = catKey === 'single' ? 'Single' :
                    catKey === 'single_patti' ? 'SP' :
                        catKey === 'double_patti' ? 'DP' :
                            catKey === 'triple_patti' ? 'TP' :
                                catKey === 'jodi' ? 'Jodi' : catKey
                const catIcon = catKey === 'single' ? '#' :
                    catKey === 'single_patti' ? 'S' :
                        catKey === 'double_patti' ? 'D' :
                            catKey === 'triple_patti' ? 'T' :
                                catKey === 'jodi' ? 'J' : '•'
                return (
                    <CategoryRow
                        key={catKey}
                        label={catLabel}
                        icon={catIcon}
                        data={catData}
                        showCritical={showCritical}
                        onUnlock={onUnlock}
                        fmt={fmt}
                    />
                )
            })}
        </div>
    )
}

// ==========================================
// Category Row (Single/Triple within a target)
// ==========================================
function CategoryRow({
    label, icon, data, showCritical, onUnlock, fmt
}: {
    label: string
    icon: string
    data: CategoryBreakdown
    showCritical: boolean
    onUnlock: () => void
    fmt: (n: number) => string
}) {
    return (
        <div className="flex items-center justify-between py-0.5">
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-600 w-3 text-center">{icon}</span>
                <span className="text-[11px] text-gray-400">{label}</span>
                <span className="text-[10px] text-gray-600">({data.betCount})</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
                <span className="text-gray-300 font-mono">{fmt(data.collection)}</span>
                {showCritical ? (
                    <>
                        <span className="text-red-400/70 font-mono">{fmt(data.payout)}</span>
                        <span className={`font-mono ${data.profit >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                            {data.profit >= 0 ? '+' : ''}{fmt(data.profit)}
                        </span>
                    </>
                ) : (
                    <button onClick={onUnlock} className="text-gray-600 hover:text-gray-400 flex items-center gap-1">
                        **** <Eye size={10} />
                    </button>
                )}
            </div>
        </div>
    )
}
