'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    ChevronUp,
    ChevronDown,
    RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface Stats {
    totalBets: number
    totalCollection: number
    totalPayout: number
    profit: number
    profitPercent: number
    pendingBets: number
    wonBets: number
    lostBets: number
}

interface DailyBreakdown {
    date: string
    bets: number
    collection: number
    payout: number
    profit: number
    winners: number
}

export default function ProfitLossPage() {
    const [loading, setLoading] = useState(true)
    const [todayStats, setTodayStats] = useState<Stats | null>(null)
    const [weekStats, setWeekStats] = useState<Stats | null>(null)
    const [monthStats, setMonthStats] = useState<Stats | null>(null)
    const [dailyBreakdown, setDailyBreakdown] = useState<DailyBreakdown[]>([])

    const fetchStats = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/staff/stats')
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch stats')
            }

            setTodayStats(data.today)
            setWeekStats(data.week)
            setMonthStats(data.month)
            setDailyBreakdown(data.dailyBreakdown || [])
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load statistics')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    const formatCurrency = (amount: number, short = false) => {
        if (short && Math.abs(amount) >= 100000) {
            return `₹${(amount / 100000).toFixed(1)}L`
        }
        return `₹${amount.toLocaleString()}`
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Profit & Loss Dashboard</h1>
                    <p className="text-[var(--text-secondary)]">
                        Track your performance and earnings
                    </p>
                </div>
                <button
                    onClick={fetchStats}
                    className="btn btn-secondary flex items-center gap-2"
                    disabled={loading}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-6">
                {/* Today */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--accent-cyan)]/20 to-transparent rounded-bl-full" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar size={18} className="text-[var(--accent-cyan)]" />
                            <span className="text-sm text-[var(--text-muted)]">Today</span>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-[var(--text-muted)]">Total Bets</p>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(todayStats?.totalCollection || 0)}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                    {todayStats?.totalBets || 0} bets placed
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--text-muted)]">Payouts</p>
                                <p className="text-lg font-medium text-[var(--status-error)]">
                                    -{formatCurrency(todayStats?.totalPayout || 0)}
                                </p>
                            </div>
                            <div className="pt-3 border-t border-[var(--glass-border)]">
                                <p className="text-xs text-[var(--text-muted)]">Net Profit</p>
                                <div className="flex items-center gap-2">
                                    <p className={`text-2xl font-bold ${(todayStats?.profit || 0) >= 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}`}>
                                        {formatCurrency(todayStats?.profit || 0)}
                                    </p>
                                    {(todayStats?.profitPercent || 0) !== 0 && (
                                        <Badge variant={(todayStats?.profitPercent || 0) >= 0 ? 'success' : 'error'}>
                                            {(todayStats?.profitPercent || 0) >= 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            {Math.abs(todayStats?.profitPercent || 0)}%
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* This Week */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--accent-pink)]/20 to-transparent rounded-bl-full" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp size={18} className="text-[var(--accent-pink)]" />
                            <span className="text-sm text-[var(--text-muted)]">This Week</span>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-[var(--text-muted)]">Total Bets</p>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(weekStats?.totalCollection || 0)}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                    {weekStats?.totalBets || 0} bets placed
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--text-muted)]">Payouts</p>
                                <p className="text-lg font-medium text-[var(--status-error)]">
                                    -{formatCurrency(weekStats?.totalPayout || 0)}
                                </p>
                            </div>
                            <div className="pt-3 border-t border-[var(--glass-border)]">
                                <p className="text-xs text-[var(--text-muted)]">Net Profit</p>
                                <div className="flex items-center gap-2">
                                    <p className={`text-2xl font-bold ${(weekStats?.profit || 0) >= 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}`}>
                                        {formatCurrency(weekStats?.profit || 0)}
                                    </p>
                                    {(weekStats?.profitPercent || 0) !== 0 && (
                                        <Badge variant={(weekStats?.profitPercent || 0) >= 0 ? 'success' : 'error'}>
                                            {(weekStats?.profitPercent || 0) >= 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            {Math.abs(weekStats?.profitPercent || 0)}%
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* This Month */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--accent-green)]/20 to-transparent rounded-bl-full" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-4">
                            <DollarSign size={18} className="text-[var(--accent-green)]" />
                            <span className="text-sm text-[var(--text-muted)]">This Month</span>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-[var(--text-muted)]">Total Bets</p>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(monthStats?.totalCollection || 0, true)}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                    {monthStats?.totalBets || 0} bets placed
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--text-muted)]">Payouts</p>
                                <p className="text-lg font-medium text-[var(--status-error)]">
                                    -{formatCurrency(monthStats?.totalPayout || 0, true)}
                                </p>
                            </div>
                            <div className="pt-3 border-t border-[var(--glass-border)]">
                                <p className="text-xs text-[var(--text-muted)]">Net Profit</p>
                                <div className="flex items-center gap-2">
                                    <p className={`text-2xl font-bold ${(monthStats?.profit || 0) >= 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}`}>
                                        {formatCurrency(monthStats?.profit || 0, true)}
                                    </p>
                                    {(monthStats?.profitPercent || 0) !== 0 && (
                                        <Badge variant={(monthStats?.profitPercent || 0) >= 0 ? 'success' : 'error'}>
                                            {(monthStats?.profitPercent || 0) >= 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            {Math.abs(monthStats?.profitPercent || 0)}%
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Daily Breakdown */}
            <Card>
                <CardHeader
                    title="Daily Breakdown"
                    subtitle="Last 7 days performance"
                />
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Total Bets</th>
                                <th>Payouts</th>
                                <th>Net Profit</th>
                                <th>Winners</th>
                                <th>Margin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dailyBreakdown.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-[var(--text-muted)]">
                                        No data available yet
                                    </td>
                                </tr>
                            ) : (
                                dailyBreakdown.map((day) => {
                                    const margin = day.collection > 0
                                        ? ((day.profit / day.collection) * 100).toFixed(1)
                                        : '0.0'
                                    const isPositive = day.profit >= 0

                                    return (
                                        <tr key={day.date}>
                                            <td className="font-medium">{day.date}</td>
                                            <td>
                                                <div>
                                                    <p>{formatCurrency(day.collection)}</p>
                                                    <p className="text-xs text-[var(--text-muted)]">
                                                        {day.bets} bets
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="text-[var(--status-error)]">
                                                {day.payout > 0 ? `-${formatCurrency(day.payout)}` : '-'}
                                            </td>
                                            <td>
                                                <span className={isPositive ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}>
                                                    {isPositive ? '+' : ''}{formatCurrency(day.profit)}
                                                </span>
                                            </td>
                                            <td>
                                                <Badge variant="info">{day.winners}</Badge>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-1">
                                                    {isPositive ? (
                                                        <TrendingUp size={14} className="text-[var(--status-success)]" />
                                                    ) : (
                                                        <TrendingDown size={14} className="text-[var(--status-error)]" />
                                                    )}
                                                    <span className={isPositive ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}>
                                                        {margin}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}
