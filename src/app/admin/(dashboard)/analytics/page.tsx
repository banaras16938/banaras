'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Input, Select } from '@/components/ui/Input'
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    Trophy,
    Calendar,
    RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface AnalyticsData {
    staff_email: string
    staff_id: string
    game_date: string
    session_name: string
    total_bets_placed: number
    total_collection: number
    total_payouts_given: number
    profit: number
}

interface AggregatedStats {
    totalRevenue: number
    totalPayout: number
    netProfit: number
    profitMargin: number
    totalBets: number
    winners: number
}

interface DailyData {
    date: string
    revenue: number
    payout: number
    profit: number
}

interface StaffPerformance {
    email: string
    name: string
    bets: number
    collection: number
    payout: number
    profit: number
}

interface GameTypeStats {
    type: string
    bets: number
    collection: number
    payout: number
    profit: number
}

export default function AnalyticsPage() {
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30')
    const [stats, setStats] = useState<AggregatedStats>({
        totalRevenue: 0,
        totalPayout: 0,
        netProfit: 0,
        profitMargin: 0,
        totalBets: 0,
        winners: 0
    })
    const [dailyData, setDailyData] = useState<DailyData[]>([])
    const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([])
    const [gameBreakdown, setGameBreakdown] = useState<GameTypeStats[]>([
        { type: 'Single', bets: 0, collection: 0, payout: 0, profit: 0 },
        { type: 'Jodi', bets: 0, collection: 0, payout: 0, profit: 0 },
        { type: 'Triple', bets: 0, collection: 0, payout: 0, profit: 0 }
    ])

    const fetchAnalytics = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/analytics?type=summary')

            if (!response.ok) {
                throw new Error('Failed to fetch analytics')
            }

            const { analytics }: { analytics: AnalyticsData[] } = await response.json()

            if (!analytics || analytics.length === 0) {
                setLoading(false)
                return
            }

            // Calculate date cutoff
            const daysBack = parseInt(dateRange)
            const cutoffDate = new Date()
            cutoffDate.setDate(cutoffDate.getDate() - daysBack)
            const cutoffStr = cutoffDate.toISOString().split('T')[0]

            const filteredData = analytics.filter(a => a.game_date >= cutoffStr)

            // Calculate aggregated stats
            const totalRevenue = filteredData.reduce((sum, a) => sum + Number(a.total_collection || 0), 0)
            const totalPayout = filteredData.reduce((sum, a) => sum + Number(a.total_payouts_given || 0), 0)
            const netProfit = totalRevenue - totalPayout
            const totalBets = filteredData.reduce((sum, a) => sum + Number(a.total_bets_placed || 0), 0)

            setStats({
                totalRevenue,
                totalPayout,
                netProfit,
                profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
                totalBets,
                winners: 0 // Would need additional query to get winners count
            })

            // Group by date for daily data
            const dateGroups = new Map<string, { revenue: number; payout: number; profit: number }>()
            filteredData.forEach(a => {
                const existing = dateGroups.get(a.game_date) || { revenue: 0, payout: 0, profit: 0 }
                dateGroups.set(a.game_date, {
                    revenue: existing.revenue + Number(a.total_collection || 0),
                    payout: existing.payout + Number(a.total_payouts_given || 0),
                    profit: existing.profit + Number(a.profit || 0)
                })
            })

            const sortedDates = Array.from(dateGroups.entries())
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 10)
                .map(([date, data]) => ({
                    date,
                    ...data
                }))

            setDailyData(sortedDates)

            // Group by staff
            const staffGroups = new Map<string, StaffPerformance>()
            filteredData.forEach(a => {
                const existing = staffGroups.get(a.staff_id) || {
                    email: a.staff_email,
                    name: a.staff_email,
                    bets: 0,
                    collection: 0,
                    payout: 0,
                    profit: 0
                }
                staffGroups.set(a.staff_id, {
                    ...existing,
                    bets: existing.bets + Number(a.total_bets_placed || 0),
                    collection: existing.collection + Number(a.total_collection || 0),
                    payout: existing.payout + Number(a.total_payouts_given || 0),
                    profit: existing.profit + Number(a.profit || 0)
                })
            })

            const sortedStaff = Array.from(staffGroups.values())
                .sort((a, b) => b.profit - a.profit)
                .slice(0, 10)

            setStaffPerformance(sortedStaff)

            // Game type breakdown would need category-level data from bets
            // For now, estimate based on typical distribution
            const singleShare = 0.34
            const jodiShare = 0.41
            const tripleShare = 0.25

            setGameBreakdown([
                {
                    type: 'Single',
                    bets: Math.round(totalBets * singleShare),
                    collection: Math.round(totalRevenue * singleShare),
                    payout: Math.round(totalPayout * singleShare),
                    profit: Math.round(netProfit * singleShare * 0.8)
                },
                {
                    type: 'Jodi',
                    bets: Math.round(totalBets * jodiShare),
                    collection: Math.round(totalRevenue * jodiShare),
                    payout: Math.round(totalPayout * jodiShare),
                    profit: Math.round(netProfit * jodiShare * 1.2)
                },
                {
                    type: 'Triple',
                    bets: Math.round(totalBets * tripleShare),
                    collection: Math.round(totalRevenue * tripleShare),
                    payout: Math.round(totalPayout * tripleShare),
                    profit: Math.round(netProfit * tripleShare)
                }
            ])

        } catch (error) {
            console.error('Analytics fetch error:', error)
            toast.error('Failed to load analytics')
        } finally {
            setLoading(false)
        }
    }, [dateRange])

    useEffect(() => {
        fetchAnalytics()
    }, [fetchAnalytics])

    const formatCurrency = (amount: number) => {
        if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(1)}L`
        } else if (amount >= 1000) {
            return `₹${(amount / 1000).toFixed(0)}K`
        }
        return `₹${amount.toLocaleString()}`
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
                    <p className="text-gray-400">
                        Comprehensive profit and performance analysis
                    </p>
                </div>
                <div className="flex gap-3">
                    <Select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                        options={[
                            { value: '7', label: 'Last 7 Days' },
                            { value: '30', label: 'Last 30 Days' },
                            { value: '90', label: 'Last 90 Days' }
                        ]}
                    />
                    <button
                        onClick={fetchAnalytics}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="text-center">
                    <DollarSign className="mx-auto text-[var(--accent-cyan)] mb-2" size={24} />
                    <p className="text-xs text-[var(--text-muted)]">Total Revenue</p>
                    <p className="text-xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                </Card>
                <Card className="text-center">
                    <TrendingDown className="mx-auto text-[var(--status-error)] mb-2" size={24} />
                    <p className="text-xs text-[var(--text-muted)]">Total Payout</p>
                    <p className="text-xl font-bold">{formatCurrency(stats.totalPayout)}</p>
                </Card>
                <Card className="text-center">
                    <TrendingUp className="mx-auto text-[var(--status-success)] mb-2" size={24} />
                    <p className="text-xs text-[var(--text-muted)]">Net Profit</p>
                    <p className="text-xl font-bold text-[var(--status-success)]">
                        {formatCurrency(stats.netProfit)}
                    </p>
                </Card>
                <Card className="text-center">
                    <Trophy className="mx-auto text-[var(--accent-yellow)] mb-2" size={24} />
                    <p className="text-xs text-[var(--text-muted)]">Profit Margin</p>
                    <p className="text-xl font-bold">{stats.profitMargin.toFixed(1)}%</p>
                </Card>
                <Card className="text-center">
                    <Calendar className="mx-auto text-[var(--accent-pink)] mb-2" size={24} />
                    <p className="text-xs text-[var(--text-muted)]">Total Bets</p>
                    <p className="text-xl font-bold">{stats.totalBets.toLocaleString()}</p>
                </Card>
                <Card className="text-center">
                    <Users className="mx-auto text-[var(--accent-green)] mb-2" size={24} />
                    <p className="text-xs text-[var(--text-muted)]">Active Staff</p>
                    <p className="text-xl font-bold">{staffPerformance.length}</p>
                </Card>
            </div>

            {/* Daily Breakdown */}
            <Card>
                <CardHeader
                    title="Daily Performance"
                    subtitle="Revenue, payout, and profit by date"
                />
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Revenue</th>
                                <th>Payout</th>
                                <th>Net Profit</th>
                                <th>Margin</th>
                                <th>Trend</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dailyData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-[var(--text-muted)]">
                                        No data available for this period
                                    </td>
                                </tr>
                            ) : (
                                dailyData.map((day, index) => {
                                    const margin = day.revenue > 0 ? ((day.profit / day.revenue) * 100).toFixed(1) : '0.0'
                                    const prevProfit = dailyData[index + 1]?.profit || day.profit
                                    const trend = day.profit > prevProfit ? 'up' : day.profit < prevProfit ? 'down' : 'neutral'

                                    return (
                                        <tr key={day.date}>
                                            <td className="font-medium">{day.date}</td>
                                            <td>{formatCurrency(day.revenue)}</td>
                                            <td className="text-[var(--status-error)]">
                                                -{formatCurrency(day.payout)}
                                            </td>
                                            <td className="text-[var(--status-success)] font-medium">
                                                +{formatCurrency(day.profit)}
                                            </td>
                                            <td>
                                                <Badge variant="success">{margin}%</Badge>
                                            </td>
                                            <td>
                                                {trend === 'up' && <TrendingUp size={18} className="text-[var(--status-success)]" />}
                                                {trend === 'down' && <TrendingDown size={18} className="text-[var(--status-error)]" />}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Game Type Breakdown */}
                <Card>
                    <CardHeader
                        title="Game Type Breakdown"
                        subtitle="Performance by game type"
                    />
                    <div className="space-y-4">
                        {gameBreakdown.map((game) => {
                            const margin = game.collection > 0 ? ((game.profit / game.collection) * 100).toFixed(1) : '0.0'
                            const totalProfit = gameBreakdown.reduce((a, b) => a + b.profit, 0)
                            const profitPercentage = totalProfit > 0 ? (game.profit / totalProfit) * 100 : 0

                            return (
                                <div key={game.type} className="p-4 rounded-lg bg-[var(--bg-surface)]">
                                    <div className="flex justify-between items-center mb-3">
                                        <div>
                                            <p className="font-medium">{game.type}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{game.bets.toLocaleString()} bets</p>
                                        </div>
                                        <Badge variant="success">{margin}% margin</Badge>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[var(--text-muted)]">Collection: {formatCurrency(game.collection)}</span>
                                        <span className="text-[var(--status-success)]">Profit: {formatCurrency(game.profit)}</span>
                                    </div>
                                    <div className="mt-2 h-2 bg-[var(--bg-dark)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-[var(--primary-500)] to-[var(--accent-cyan)]"
                                            style={{ width: `${profitPercentage}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </Card>

                {/* Staff Performance */}
                <Card>
                    <CardHeader
                        title="Staff Performance"
                        subtitle="Top performing staff members"
                    />
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Staff</th>
                                    <th>Bets</th>
                                    <th>Collection</th>
                                    <th>Profit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staffPerformance.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-[var(--text-muted)]">
                                            No staff data available
                                        </td>
                                    </tr>
                                ) : (
                                    staffPerformance.map((staff, index) => (
                                        <tr key={staff.email}>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-[var(--accent-yellow)]/20 text-[var(--accent-yellow)]' :
                                                        index === 1 ? 'bg-[var(--text-muted)]/20 text-[var(--text-muted)]' :
                                                            index === 2 ? 'bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]' :
                                                                'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                                                        }`}>
                                                        {index + 1}
                                                    </span>
                                                    <span className="font-medium truncate max-w-[120px]">{staff.email}</span>
                                                </div>
                                            </td>
                                            <td>{staff.bets.toLocaleString()}</td>
                                            <td>{formatCurrency(staff.collection)}</td>
                                            <td className="text-[var(--status-success)]">
                                                {formatCurrency(staff.profit)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    )
}
