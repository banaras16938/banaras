'use client'

import { useState, useEffect, useCallback } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Wallet,
    Clock,
    Sun,
    Moon,
    ChevronDown,
    ChevronUp,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react'
import { toast } from 'sonner'

// ==========================================
// TYPES
// ==========================================

interface CategoryData {
    collection: number
    payout: number
    betCount: number
}

interface TargetData {
    collection: number
    payout: number
    betCount: number
    wonCount: number
    lostCount: number
    pendingCount: number
    categories: Record<string, CategoryData>
}

interface SessionData {
    open: TargetData
    close: TargetData
    jodi: TargetData
    collection: number
    payout: number
    profit: number
}

interface HisabData {
    date: string
    staffName: string
    morning: SessionData
    night: SessionData
    totalCollection: number
    totalPayout: number
    totalProfit: number
    totalBets: number
    totalPending: number
    totalWon: number
    totalLost: number
}

// ==========================================
// HELPERS
// ==========================================

const fmt = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`

const categoryLabel = (cat: string) => {
    switch (cat) {
        case 'single': return 'Single'
        case 'jodi': return 'Jodi'
        case 'single_patti': return 'SP'
        case 'double_patti': return 'DP'
        case 'triple_patti': return 'TP'
        default: return cat
    }
}

// ==========================================
// MAIN PAGE
// ==========================================

export default function StaffHisabKitabPage() {
    const [data, setData] = useState<HisabData | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async (showToast = false) => {
        if (!showToast) setLoading(true)
        try {
            const res = await fetch('/api/staff/hisab-kitab')
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Failed to fetch')
            setData(result)
            if (showToast) toast.success('Refreshed')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load data')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
                <p>Failed to load settlement data</p>
                <button onClick={() => fetchData()} className="mt-3 text-cyan-400 text-sm underline">
                    Retry
                </button>
            </div>
        )
    }

    const settlement = data.totalProfit
    const isStaffOwes = settlement >= 0

    return (
        <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">Hisab-Kitab</h1>
                    <p className="text-sm text-gray-500">Today&apos;s settlement • {data.date}</p>
                </div>
                <button
                    onClick={() => fetchData(true)}
                    className="p-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 transition-colors"
                >
                    <RefreshCw size={18} className="text-gray-300" />
                </button>
            </div>

            {/* Settlement Banner — the single most important number */}
            <div className={`rounded-2xl p-5 border-2 ${isStaffOwes
                ? 'bg-gradient-to-br from-red-500/10 to-red-900/10 border-red-500/40'
                : 'bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 border-emerald-500/40'
                }`}>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Settlement</p>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isStaffOwes ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                        {isStaffOwes
                            ? <ArrowUpRight size={24} className="text-red-400" />
                            : <ArrowDownRight size={24} className="text-emerald-400" />
                        }
                    </div>
                    <div>
                        <p className={`text-3xl font-bold font-mono ${isStaffOwes ? 'text-red-400' : 'text-emerald-400'}`}>
                            {fmt(settlement)}
                        </p>
                        <p className={`text-sm font-medium mt-0.5 ${isStaffOwes ? 'text-red-400/80' : 'text-emerald-400/80'}`}>
                            {isStaffOwes
                                ? 'You need to pay Admin'
                                : 'Admin needs to pay you'
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-4 gap-2">
                <StatMini icon={<Wallet size={14} />} label="Collection" value={fmt(data.totalCollection)} color="text-cyan-400" />
                <StatMini icon={<TrendingDown size={14} />} label="Payout" value={fmt(data.totalPayout)} color="text-red-400" />
                <StatMini icon={<Clock size={14} />} label="Pending" value={String(data.totalPending)} color="text-amber-400" />
                <StatMini icon={<TrendingUp size={14} />} label="Total Bets" value={String(data.totalBets)} color="text-gray-300" />
            </div>

            {/* Morning Session */}
            <SessionCard
                label="Morning"
                icon={<Sun size={18} className="text-amber-400" />}
                iconBg="bg-amber-500/15"
                session={data.morning}
            />

            {/* Night Session */}
            <SessionCard
                label="Night"
                icon={<Moon size={18} className="text-indigo-400" />}
                iconBg="bg-indigo-500/15"
                session={data.night}
            />

            {/* How Settlement Works */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-xs text-gray-500">
                <p className="font-medium text-gray-400 mb-1">How Settlement Works</p>
                <p>Collection − Payout = Profit. Positive profit → you pay admin. Negative → admin pays you.</p>
            </div>
        </div>
    )
}

// ==========================================
// STAT MINI CARD
// ==========================================

function StatMini({ icon, label, value, color }: {
    icon: React.ReactNode
    label: string
    value: string
    color: string
}) {
    return (
        <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-2.5 text-center">
            <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
            <p className="text-[10px] text-gray-500 uppercase">{label}</p>
            <p className={`text-sm font-bold font-mono mt-0.5 ${color}`}>{value}</p>
        </div>
    )
}

// ==========================================
// SESSION CARD (Morning / Night)
// ==========================================

function SessionCard({ label, icon, iconBg, session }: {
    label: string
    icon: React.ReactNode
    iconBg: string
    session: SessionData
}) {
    const [expanded, setExpanded] = useState(true)
    const hasData = session.collection > 0 || session.payout > 0
    const profit = session.profit

    return (
        <div className="bg-gray-800/80 border border-gray-700 rounded-xl overflow-hidden">
            {/* Session Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
                    <div className="text-left">
                        <p className="text-white font-semibold text-sm">{label} Session</p>
                        {hasData ? (
                            <p className="text-xs text-gray-500">
                                {fmt(session.collection)} collected
                            </p>
                        ) : (
                            <p className="text-xs text-gray-600 italic">No bets yet</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {hasData && (
                        <span className={`text-sm font-bold font-mono ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {profit >= 0 ? '+' : '-'}{fmt(profit)}
                        </span>
                    )}
                    {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                </div>
            </button>

            {/* Expanded Content */}
            {expanded && hasData && (
                <div className="border-t border-gray-700 px-4 py-3 space-y-3">
                    {/* Summary row */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase">Collection</p>
                            <p className="text-sm font-bold text-white font-mono">{fmt(session.collection)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase">Payout</p>
                            <p className="text-sm font-bold text-red-400 font-mono">{fmt(session.payout)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase">Profit</p>
                            <p className={`text-sm font-bold font-mono ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {profit >= 0 ? '+' : '-'}{fmt(profit)}
                            </p>
                        </div>
                    </div>

                    {/* Target Breakdown: Open, Close, Jodi */}
                    <div className="space-y-2">
                        <TargetRow label="Open" color="text-blue-400" data={session.open} />
                        <TargetRow label="Close" color="text-purple-400" data={session.close} />
                        <TargetRow label="Jodi" color="text-amber-400" data={session.jodi} />
                    </div>
                </div>
            )}
        </div>
    )
}

// ==========================================
// TARGET ROW (Open / Close / Jodi)
// ==========================================

function TargetRow({ label, color, data }: {
    label: string
    color: string
    data: TargetData
}) {
    if (data.betCount === 0) return null

    const isJodi = label === 'Jodi'
    const cats = data.categories

    return (
        <div className="bg-gray-900/50 rounded-lg px-3 py-2.5">
            {/* Target header */}
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${color}`}>{label}</span>
                    <span className="text-[10px] text-gray-600">{data.betCount} bets</span>
                    {data.pendingCount > 0 && (
                        <span className="text-[10px] text-amber-500">{data.pendingCount}P</span>
                    )}
                    {data.wonCount > 0 && (
                        <span className="text-[10px] text-emerald-500">{data.wonCount}W</span>
                    )}
                    {data.lostCount > 0 && (
                        <span className="text-[10px] text-red-500">{data.lostCount}L</span>
                    )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <span className="text-white font-mono">{fmt(data.collection)}</span>
                    <span className="text-red-400/70 font-mono">{fmt(data.payout)}</span>
                </div>
            </div>

            {/* Category sub-rows for open/close (not jodi) */}
            {!isJodi && Object.entries(cats).map(([catKey, catData]) => {
                if (catData.betCount === 0) return null
                return (
                    <div key={catKey} className="flex items-center justify-between py-0.5 ml-2">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-gray-400">{categoryLabel(catKey)}</span>
                            <span className="text-[10px] text-gray-600">({catData.betCount})</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                            <span className="text-gray-300 font-mono">{fmt(catData.collection)}</span>
                            <span className="text-red-400/60 font-mono">{fmt(catData.payout)}</span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
