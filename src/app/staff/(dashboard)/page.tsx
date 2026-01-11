'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
    TrendingUp,
    TrendingDown,
    Ticket,
    Clock,
    Trophy,
    ArrowUpRight
} from 'lucide-react'
import Link from 'next/link'
import { BetCategory, SessionType, PAYOUT_MULTIPLIERS } from '@/types/types'

interface DashboardStats {
    today: {
        totalBets: number
        totalCollection: number
        totalPayout: number
        profit: number
        profitPercent: number
        pendingBets: number
        wonBets: number
        lostBets: number
    }
    recentBets: Array<{
        id: string
        amount: number
        status: string
        winning_amount: number
        created_at: string
        category?: BetCategory
        selected_number?: string
        player?: { name: string }
    }>
}

export default function StaffDashboard() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<DashboardStats | null>(null)

    const fetchDashboardData = useCallback(async () => {
        try {
            const response = await fetch('/api/staff/stats')
            const data = await response.json()

            if (response.ok) {
                setStats(data)
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchDashboardData()
        // Refresh every 60 seconds
        const interval = setInterval(fetchDashboardData, 60000)
        return () => clearInterval(interval)
    }, [fetchDashboardData])

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / (1000 * 60))

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins} min ago`
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours}h ago`
        return date.toLocaleDateString()
    }

    const statCards = [
        {
            label: "Today's Collection",
            value: `₹${(stats?.today.totalCollection || 0).toLocaleString()}`,
            change: `${stats?.today.totalBets || 0} bets`,
            trending: 'neutral',
            icon: Ticket
        },
        {
            label: 'Pending Bets',
            value: stats?.today.pendingBets?.toString() || '0',
            change: 'awaiting result',
            trending: 'neutral',
            icon: Clock
        },
        {
            label: "Today's Profit",
            value: `₹${(stats?.today.profit || 0).toLocaleString()}`,
            change: `${stats?.today.profitPercent || 0}%`,
            trending: (stats?.today.profit || 0) >= 0 ? 'up' : 'down',
            icon: TrendingUp
        },
        {
            label: 'Win Rate',
            value: stats?.today.totalBets
                ? `${((stats.today.wonBets / stats.today.totalBets) * 100).toFixed(1)}%`
                : '0%',
            change: `${stats?.today.wonBets || 0} winners`,
            trending: 'neutral',
            icon: Trophy
        },
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Welcome back, Staff!</h1>
                    <p className="text-[var(--text-secondary)]">
                        Here&apos;s what&apos;s happening today
                    </p>
                </div>
                <Link
                    href="/staff/bets"
                    className="btn btn-primary"
                >
                    <Ticket size={18} />
                    Place New Bet
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <Card key={stat.label} className="relative overflow-hidden">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-[var(--text-muted)]">{stat.label}</p>
                                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                    <div className="flex items-center gap-1 mt-2">
                                        {stat.trending === 'up' && (
                                            <TrendingUp size={14} className="text-[var(--status-success)]" />
                                        )}
                                        {stat.trending === 'down' && (
                                            <TrendingDown size={14} className="text-[var(--status-error)]" />
                                        )}
                                        <span className={`text-xs ${stat.trending === 'up' ? 'text-[var(--status-success)]' :
                                            stat.trending === 'down' ? 'text-[var(--status-error)]' :
                                                'text-[var(--text-muted)]'
                                            }`}>
                                            {stat.change}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg bg-[var(--primary-500)]/10">
                                    <Icon size={24} className="text-[var(--primary-400)]" />
                                </div>
                            </div>
                        </Card>
                    )
                })}
            </div>

            {/* Recent Activity */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent Bets */}
                <Card>
                    <CardHeader
                        title="Recent Bets"
                        action={
                            <Link
                                href="/staff/bets/history"
                                className="text-sm text-[var(--primary-400)] hover:underline flex items-center gap-1"
                            >
                                View All <ArrowUpRight size={14} />
                            </Link>
                        }
                    />
                    <div className="space-y-3">
                        {!stats?.recentBets || stats.recentBets.length === 0 ? (
                            <div className="py-8 text-center text-[var(--text-muted)]">
                                No bets placed today yet
                            </div>
                        ) : (
                            stats.recentBets.slice(0, 5).map((bet) => (
                                <div
                                    key={bet.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[var(--primary-500)]/10 flex items-center justify-center">
                                            <span className="font-mono text-[var(--primary-400)]">
                                                {bet.selected_number || '-'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium">
                                                {bet.player?.name || 'Player'}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                {formatTimeAgo(bet.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">₹{Number(bet.amount).toLocaleString()}</p>
                                        <Badge
                                            variant={
                                                bet.status === 'won' ? 'success' :
                                                    bet.status === 'lost' ? 'error' :
                                                        bet.status === 'pending' ? 'warning' : 'info'
                                            }
                                        >
                                            {bet.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader title="Quick Actions" />
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/staff/bets" className="block">
                            <div className="p-4 rounded-lg border border-[var(--glass-border)] hover:border-[var(--primary-500)] hover:bg-[var(--primary-500)]/5 transition-all text-center">
                                <Ticket size={32} className="mx-auto text-[var(--accent-cyan)] mb-3" />
                                <p className="font-medium">Place Bet</p>
                                <p className="text-xs text-[var(--text-muted)]">Single, Jodi, Triple</p>
                            </div>
                        </Link>
                        <Link href="/staff/bets/history" className="block">
                            <div className="p-4 rounded-lg border border-[var(--glass-border)] hover:border-[var(--primary-500)] hover:bg-[var(--primary-500)]/5 transition-all text-center">
                                <Clock size={32} className="mx-auto text-[var(--accent-pink)] mb-3" />
                                <p className="font-medium">Bet History</p>
                                <p className="text-xs text-[var(--text-muted)]">View all bets</p>
                            </div>
                        </Link>
                        <Link href="/staff/results" className="block">
                            <div className="p-4 rounded-lg border border-[var(--glass-border)] hover:border-[var(--primary-500)] hover:bg-[var(--primary-500)]/5 transition-all text-center">
                                <Trophy size={32} className="mx-auto text-[var(--accent-green)] mb-3" />
                                <p className="font-medium">Results</p>
                                <p className="text-xs text-[var(--text-muted)]">View declared results</p>
                            </div>
                        </Link>
                        <Link href="/staff/profit-loss" className="block">
                            <div className="p-4 rounded-lg border border-[var(--glass-border)] hover:border-[var(--primary-500)] hover:bg-[var(--primary-500)]/5 transition-all text-center">
                                <TrendingUp size={32} className="mx-auto text-[var(--accent-orange)] mb-3" />
                                <p className="font-medium">Profit & Loss</p>
                                <p className="text-xs text-[var(--text-muted)]">Analytics dashboard</p>
                            </div>
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    )
}
