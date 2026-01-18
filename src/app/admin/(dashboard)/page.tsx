'use client'

import { useEffect, useState, useCallback } from 'react'
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">System Overview</h1>
                    <p className="text-gray-400">
                        Real-time monitoring and control
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchDashboardData}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg hover:bg-gray-700 transition-all"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                    <Link
                        href="/admin/results"
                        className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all"
                    >
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
                        <div key={stat.label} className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-xl p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-gray-400">{stat.label}</p>
                                    <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                                    <p className={`text-xs mt-2 ${stat.trending === 'up' ? 'text-green-400' :
                                        stat.trending === 'down' ? 'text-red-400' :
                                            'text-gray-400'
                                        }`}>
                                        {stat.change}
                                    </p>
                                </div>
                                <div className="p-3 rounded-lg bg-indigo-500/10">
                                    <Icon size={24} className="text-indigo-400" />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Game Status Cards */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Morning Game */}
                <div className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
                        <h3 className="text-lg font-semibold text-white">Morning Game</h3>
                        <Badge variant={getGameStatus(morningSession) === 'completed' ? 'success' :
                            getGameStatus(morningSession) === 'betting' ? 'warning' : 'default'}>
                            {getGameStatus(morningSession) === 'completed' ? 'Completed' :
                                getGameStatus(morningSession) === 'betting' ? 'In Progress' : 'Not Started'}
                        </Badge>
                    </div>
                    <div className="flex justify-center gap-6 py-4">
                        <div className="text-center">
                            <p className="text-xs text-gray-400 mb-1">OPEN</p>
                            <p className={`text-3xl font-mono font-bold ${morningSession?.open_triple ? 'text-cyan-400' : 'text-gray-500 animate-pulse'}`}>
                                {morningSession?.open_triple || '***'}
                            </p>
                        </div>
                        <div className="text-center px-6 border-x border-gray-700">
                            <p className="text-xs text-gray-400 mb-1">JODI</p>
                            <p className={`text-3xl font-mono font-bold ${morningSession?.jodi_result ? 'text-pink-400' : 'text-gray-500 animate-pulse'}`}>
                                {morningSession?.jodi_result || '**'}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-400 mb-1">CLOSE</p>
                            <p className={`text-3xl font-mono font-bold ${morningSession?.close_triple ? 'text-green-400' : 'text-gray-500 animate-pulse'}`}>
                                {morningSession?.close_triple || '***'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Night Game */}
                <div className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
                        <h3 className="text-lg font-semibold text-white">Night Game</h3>
                        <Badge variant={getGameStatus(nightSession) === 'completed' ? 'success' :
                            getGameStatus(nightSession) === 'betting' ? 'warning' : 'default'} dot>
                            {getGameStatus(nightSession) === 'completed' ? 'Completed' :
                                getGameStatus(nightSession) === 'betting' ? 'In Progress' : 'Betting Open'}
                        </Badge>
                    </div>
                    <div className="flex justify-center gap-6 py-4">
                        <div className="text-center">
                            <p className="text-xs text-gray-400 mb-1">OPEN</p>
                            <p className={`text-3xl font-mono font-bold ${nightSession?.open_triple ? 'text-cyan-400' : 'text-gray-500 animate-pulse'}`}>
                                {nightSession?.open_triple || '***'}
                            </p>
                        </div>
                        <div className="text-center px-6 border-x border-gray-700">
                            <p className="text-xs text-gray-400 mb-1">JODI</p>
                            <p className={`text-3xl font-mono font-bold ${nightSession?.jodi_result ? 'text-pink-400' : 'text-gray-500 animate-pulse'}`}>
                                {nightSession?.jodi_result || '**'}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-400 mb-1">CLOSE</p>
                            <p className={`text-3xl font-mono font-bold ${nightSession?.close_triple ? 'text-green-400' : 'text-gray-500 animate-pulse'}`}>
                                {nightSession?.close_triple || '***'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Staff Activity & Quick Actions */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Staff Activity */}
                <div className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
                        <h3 className="text-lg font-semibold text-white">Staff Activity</h3>
                        <Link
                            href="/admin/staff"
                            className="text-sm text-indigo-400 hover:underline flex items-center gap-1"
                        >
                            Manage <ArrowUpRight size={14} />
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {staffActivity.length === 0 ? (
                            <p className="text-center py-4 text-gray-400">No staff activity today</p>
                        ) : (
                            staffActivity.map((staff) => (
                                <div
                                    key={staff.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full ${staff.is_active ? 'bg-green-400' : 'bg-gray-500'}`} />
                                        <div>
                                            <p className="font-medium text-white">{staff.name || staff.email}</p>
                                            <p className="text-xs text-gray-500">{staff.bets_count} bets today</p>
                                        </div>
                                    </div>
                                    <p className="font-medium text-white">₹{staff.total_amount.toLocaleString()}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-xl p-5">
                    <div className="mb-4 pb-4 border-b border-gray-700">
                        <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/admin/results" className="block">
                            <div className="p-4 rounded-lg border border-gray-700 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all text-center">
                                <Trophy size={32} className="mx-auto text-cyan-400 mb-3" />
                                <p className="font-medium text-white">Result Selector</p>
                                <p className="text-xs text-gray-400">Declare results</p>
                            </div>
                        </Link>
                        <Link href="/admin/staff" className="block">
                            <div className="p-4 rounded-lg border border-gray-700 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all text-center">
                                <Users size={32} className="mx-auto text-pink-400 mb-3" />
                                <p className="font-medium text-white">Staff Management</p>
                                <p className="text-xs text-gray-400">Add/Remove staff</p>
                            </div>
                        </Link>
                        <Link href="/admin/analytics" className="block">
                            <div className="p-4 rounded-lg border border-gray-700 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all text-center">
                                <TrendingUp size={32} className="mx-auto text-green-400 mb-3" />
                                <p className="font-medium text-white">Analytics</p>
                                <p className="text-xs text-gray-400">Profit reports</p>
                            </div>
                        </Link>
                        <Link href="/admin/games" className="block">
                            <div className="p-4 rounded-lg border border-gray-700 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all text-center">
                                <Clock size={32} className="mx-auto text-orange-400 mb-3" />
                                <p className="font-medium text-white">Game Settings</p>
                                <p className="text-xs text-gray-400">Configure games</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
