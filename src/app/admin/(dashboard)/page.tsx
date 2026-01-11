'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
    Users,
    TrendingUp,
    Trophy,
    Clock,
    ArrowUpRight,
    DollarSign,
    RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface DashboardStats {
    todayCollection: number
    todayPayout: number
    netProfit: number
    profitMargin: number
    activeStaff: number
    totalBetsToday: number
}

interface GameSession {
    id: string
    game_date: string
    session_name: 'morning' | 'night'
    open_triple: string | null
    open_single: string | null
    close_triple: string | null
    close_single: string | null
    jodi_result: string | null
}

interface StaffActivity {
    id: string
    email: string
    name: string | null
    bets_count: number
    total_amount: number
    is_active: boolean
}

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<DashboardStats>({
        todayCollection: 0,
        todayPayout: 0,
        netProfit: 0,
        profitMargin: 0,
        activeStaff: 0,
        totalBetsToday: 0
    })
    const [morningSession, setMorningSession] = useState<GameSession | null>(null)
    const [nightSession, setNightSession] = useState<GameSession | null>(null)
    const [staffActivity, setStaffActivity] = useState<StaffActivity[]>([])

    const fetchDashboardData = useCallback(async () => {
        setLoading(true)
        try {
            const today = new Date().toISOString().split('T')[0]

            // Fetch analytics summary
            const [analyticsRes, sessionsRes, staffRes] = await Promise.all([
                fetch(`/api/analytics?type=summary&date=${today}`),
                fetch(`/api/results?date=${today}`),
                fetch('/api/staff')
            ])

            // Process analytics
            if (analyticsRes.ok) {
                const { analytics } = await analyticsRes.json()
                if (analytics && analytics.length > 0) {
                    const todayData = analytics.filter((a: { game_date: string }) => a.game_date === today)
                    const collection = todayData.reduce((sum: number, a: { total_collection: number }) => sum + Number(a.total_collection || 0), 0)
                    const payout = todayData.reduce((sum: number, a: { total_payouts_given: number }) => sum + Number(a.total_payouts_given || 0), 0)
                    const profit = collection - payout
                    const betsCount = todayData.reduce((sum: number, a: { total_bets_placed: number }) => sum + Number(a.total_bets_placed || 0), 0)

                    setStats(prev => ({
                        ...prev,
                        todayCollection: collection,
                        todayPayout: payout,
                        netProfit: profit,
                        profitMargin: collection > 0 ? (profit / collection) * 100 : 0,
                        totalBetsToday: betsCount
                    }))
                }
            }

            // Process sessions
            if (sessionsRes.ok) {
                const { sessions } = await sessionsRes.json()
                if (sessions) {
                    const morning = sessions.find((s: GameSession) => s.session_name === 'morning')
                    const night = sessions.find((s: GameSession) => s.session_name === 'night')
                    setMorningSession(morning || null)
                    setNightSession(night || null)
                }
            }

            // Process staff
            if (staffRes.ok) {
                const { staff } = await staffRes.json()
                if (staff) {
                    // Get today's bets per staff
                    const betsRes = await fetch(`/api/bets?date=${today}`)
                    const { bets } = betsRes.ok ? await betsRes.json() : { bets: [] }

                    const staffWithActivity = staff.map((s: { id: string; email: string; name: string | null; is_active: boolean }) => {
                        const staffBets = bets?.filter((b: { staff_id: string }) => b.staff_id === s.id) || []
                        return {
                            ...s,
                            bets_count: staffBets.length,
                            total_amount: staffBets.reduce((sum: number, b: { amount: number }) => sum + Number(b.amount || 0), 0)
                        }
                    }).sort((a: StaffActivity, b: StaffActivity) => b.total_amount - a.total_amount)

                    setStaffActivity(staffWithActivity.slice(0, 5))
                    setStats(prev => ({
                        ...prev,
                        activeStaff: staff.filter((s: { is_active: boolean }) => s.is_active).length
                    }))
                }
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error)
            toast.error('Failed to load dashboard data')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchDashboardData()
    }, [fetchDashboardData])

    const getGameStatus = (session: GameSession | null): 'completed' | 'betting' | 'pending' => {
        if (!session) return 'pending'
        if (session.close_triple) return 'completed'
        if (session.open_triple) return 'betting' // Open done, close pending
        return 'betting'
    }

    const systemStats = [
        {
            label: "Today's Collection",
            value: `₹${stats.todayCollection.toLocaleString()}`,
            change: stats.totalBetsToday > 0 ? `${stats.totalBetsToday} bets` : 'No bets yet',
            trending: stats.todayCollection > 0 ? 'up' : 'neutral',
            icon: DollarSign
        },
        {
            label: 'Active Staff',
            value: stats.activeStaff.toString(),
            change: `${staffActivity.filter(s => s.bets_count > 0).length} with bets`,
            trending: 'neutral',
            icon: Users
        },
        {
            label: "Today's Payouts",
            value: `₹${stats.todayPayout.toLocaleString()}`,
            change: stats.todayCollection > 0 ? `${((stats.todayPayout / stats.todayCollection) * 100).toFixed(1)}% of collection` : '-',
            trending: 'neutral',
            icon: TrendingUp
        },
        {
            label: 'Net Profit',
            value: `₹${stats.netProfit.toLocaleString()}`,
            change: `${stats.profitMargin.toFixed(1)}%`,
            trending: stats.netProfit > 0 ? 'up' : 'down',
            icon: Trophy
        },
    ]

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
                    <h1 className="text-2xl font-bold">System Overview</h1>
                    <p className="text-[var(--text-secondary)]">
                        Real-time monitoring and control
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchDashboardData}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                    <Link href="/admin/results" className="btn btn-primary">
                        <Trophy size={18} />
                        Declare Result
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {systemStats.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <Card key={stat.label}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-[var(--text-muted)]">{stat.label}</p>
                                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                    <p className={`text-xs mt-2 ${stat.trending === 'up' ? 'text-[var(--status-success)]' :
                                        stat.trending === 'down' ? 'text-[var(--status-error)]' :
                                            'text-[var(--text-muted)]'
                                        }`}>
                                        {stat.change}
                                    </p>
                                </div>
                                <div className="p-3 rounded-lg bg-[var(--primary-500)]/10">
                                    <Icon size={24} className="text-[var(--primary-400)]" />
                                </div>
                            </div>
                        </Card>
                    )
                })}
            </div>

            {/* Game Status Cards */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Morning Game */}
                <Card>
                    <CardHeader
                        title="Morning Game"
                        action={
                            <Badge variant={getGameStatus(morningSession) === 'completed' ? 'success' :
                                getGameStatus(morningSession) === 'betting' ? 'warning' : 'default'}>
                                {getGameStatus(morningSession) === 'completed' ? 'Completed' :
                                    getGameStatus(morningSession) === 'betting' ? 'In Progress' : 'Not Started'}
                            </Badge>
                        }
                    />
                    <div className="space-y-4">
                        <div className="flex justify-center gap-6 py-4">
                            <div className="text-center">
                                <p className="text-xs text-[var(--text-muted)]">OPEN</p>
                                <p className={`text-3xl font-mono font-bold ${morningSession?.open_triple ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-muted)] animate-pulse'}`}>
                                    {morningSession?.open_triple || '***'}
                                </p>
                            </div>
                            <div className="text-center px-6 border-x border-[var(--glass-border)]">
                                <p className="text-xs text-[var(--text-muted)]">JODI</p>
                                <p className={`text-3xl font-mono font-bold ${morningSession?.jodi_result ? 'text-[var(--accent-pink)]' : 'text-[var(--text-muted)] animate-pulse'}`}>
                                    {morningSession?.jodi_result || '**'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-[var(--text-muted)]">CLOSE</p>
                                <p className={`text-3xl font-mono font-bold ${morningSession?.close_triple ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)] animate-pulse'}`}>
                                    {morningSession?.close_triple || '***'}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Night Game */}
                <Card>
                    <CardHeader
                        title="Night Game"
                        action={
                            <Badge variant={getGameStatus(nightSession) === 'completed' ? 'success' :
                                getGameStatus(nightSession) === 'betting' ? 'warning' : 'default'} dot>
                                {getGameStatus(nightSession) === 'completed' ? 'Completed' :
                                    getGameStatus(nightSession) === 'betting' ? 'In Progress' : 'Betting Open'}
                            </Badge>
                        }
                    />
                    <div className="space-y-4">
                        <div className="flex justify-center gap-6 py-4">
                            <div className="text-center">
                                <p className="text-xs text-[var(--text-muted)]">OPEN</p>
                                <p className={`text-3xl font-mono font-bold ${nightSession?.open_triple ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-muted)] animate-pulse'}`}>
                                    {nightSession?.open_triple || '***'}
                                </p>
                            </div>
                            <div className="text-center px-6 border-x border-[var(--glass-border)]">
                                <p className="text-xs text-[var(--text-muted)]">JODI</p>
                                <p className={`text-3xl font-mono font-bold ${nightSession?.jodi_result ? 'text-[var(--accent-pink)]' : 'text-[var(--text-muted)] animate-pulse'}`}>
                                    {nightSession?.jodi_result || '**'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-[var(--text-muted)]">CLOSE</p>
                                <p className={`text-3xl font-mono font-bold ${nightSession?.close_triple ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)] animate-pulse'}`}>
                                    {nightSession?.close_triple || '***'}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Staff Activity & Quick Actions */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Staff Activity */}
                <Card>
                    <CardHeader
                        title="Staff Activity"
                        action={
                            <Link
                                href="/admin/staff"
                                className="text-sm text-[var(--primary-400)] hover:underline flex items-center gap-1"
                            >
                                Manage <ArrowUpRight size={14} />
                            </Link>
                        }
                    />
                    <div className="space-y-3">
                        {staffActivity.length === 0 ? (
                            <p className="text-center py-4 text-[var(--text-muted)]">No staff activity today</p>
                        ) : (
                            staffActivity.map((staff) => (
                                <div
                                    key={staff.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface)]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`status-dot ${staff.is_active ? 'online' : 'offline'}`} />
                                        <div>
                                            <p className="font-medium">{staff.name || staff.email}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{staff.bets_count} bets today</p>
                                        </div>
                                    </div>
                                    <p className="font-medium">₹{staff.total_amount.toLocaleString()}</p>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader title="Quick Actions" />
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/admin/results" className="block">
                            <div className="p-4 rounded-lg border border-[var(--glass-border)] hover:border-[var(--primary-500)] hover:bg-[var(--primary-500)]/5 transition-all text-center">
                                <Trophy size={32} className="mx-auto text-[var(--accent-cyan)] mb-3" />
                                <p className="font-medium">Result Selector</p>
                                <p className="text-xs text-[var(--text-muted)]">Declare results</p>
                            </div>
                        </Link>
                        <Link href="/admin/staff" className="block">
                            <div className="p-4 rounded-lg border border-[var(--glass-border)] hover:border-[var(--primary-500)] hover:bg-[var(--primary-500)]/5 transition-all text-center">
                                <Users size={32} className="mx-auto text-[var(--accent-pink)] mb-3" />
                                <p className="font-medium">Staff Management</p>
                                <p className="text-xs text-[var(--text-muted)]">Add/Remove staff</p>
                            </div>
                        </Link>
                        <Link href="/admin/analytics" className="block">
                            <div className="p-4 rounded-lg border border-[var(--glass-border)] hover:border-[var(--primary-500)] hover:bg-[var(--primary-500)]/5 transition-all text-center">
                                <TrendingUp size={32} className="mx-auto text-[var(--accent-green)] mb-3" />
                                <p className="font-medium">Analytics</p>
                                <p className="text-xs text-[var(--text-muted)]">Profit reports</p>
                            </div>
                        </Link>
                        <Link href="/admin/games" className="block">
                            <div className="p-4 rounded-lg border border-[var(--glass-border)] hover:border-[var(--primary-500)] hover:bg-[var(--primary-500)]/5 transition-all text-center">
                                <Clock size={32} className="mx-auto text-[var(--accent-orange)] mb-3" />
                                <p className="font-medium">Game Settings</p>
                                <p className="text-xs text-[var(--text-muted)]">Configure games</p>
                            </div>
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    )
}
