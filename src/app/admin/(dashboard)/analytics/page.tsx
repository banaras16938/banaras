'use client'

import { Card, CardHeader } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    Trophy,
    Calendar
} from 'lucide-react'

// Mock data
const overviewStats = {
    totalRevenue: 14500000,
    totalPayout: 12030000,
    netProfit: 2470000,
    profitMargin: 17.0,
    totalBets: 45230,
    winners: 3421,
}

const monthlyData = [
    { month: 'Jan', revenue: 1450000, payout: 1203000, profit: 247000 },
    { month: 'Dec', revenue: 1380000, payout: 1150000, profit: 230000 },
    { month: 'Nov', revenue: 1290000, payout: 1050000, profit: 240000 },
    { month: 'Oct', revenue: 1420000, payout: 1180000, profit: 240000 },
]

const staffPerformance = [
    { name: 'Staff #1', bets: 12500, collection: 1250000, winners: 890, profit: 210000 },
    { name: 'Staff #2', bets: 10800, collection: 1080000, winners: 756, profit: 183000 },
    { name: 'Staff #3', bets: 9500, collection: 950000, winners: 665, profit: 161000 },
    { name: 'Staff #4', bets: 8200, collection: 820000, winners: 574, profit: 139000 },
    { name: 'Staff #5', bets: 4230, collection: 423000, winners: 296, profit: 71000 },
]

const gameBreakdown = [
    { type: 'Single', bets: 15420, collection: 1542000, payout: 1356000, profit: 186000 },
    { type: 'Jodi', bets: 18500, collection: 1850000, payout: 1480000, profit: 370000 },
    { type: 'Triple', bets: 11310, collection: 1131000, payout: 904000, profit: 227000 },
]

export default function AnalyticsPage() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
                <p className="text-[var(--text-secondary)]">
                    Comprehensive profit and performance analysis
                </p>
            </div>

            {/* Overview Stats */}
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="text-center">
                    <DollarSign className="mx-auto text-[var(--accent-cyan)] mb-2" size={24} />
                    <p className="text-xs text-[var(--text-muted)]">Total Revenue</p>
                    <p className="text-xl font-bold">₹{(overviewStats.totalRevenue / 100000).toFixed(1)}L</p>
                </Card>
                <Card className="text-center">
                    <TrendingDown className="mx-auto text-[var(--status-error)] mb-2" size={24} />
                    <p className="text-xs text-[var(--text-muted)]">Total Payout</p>
                    <p className="text-xl font-bold">₹{(overviewStats.totalPayout / 100000).toFixed(1)}L</p>
                </Card>
                <Card className="text-center">
                    <TrendingUp className="mx-auto text-[var(--status-success)] mb-2" size={24} />
                    <p className="text-xs text-[var(--text-muted)]">Net Profit</p>
                    <p className="text-xl font-bold text-[var(--status-success)]">
                        ₹{(overviewStats.netProfit / 100000).toFixed(1)}L
                    </p>
                </Card>
                <Card className="text-center">
                    <Trophy className="mx-auto text-[var(--accent-yellow)] mb-2" size={24} />
                    <p className="text-xs text-[var(--text-muted)]">Profit Margin</p>
                    <p className="text-xl font-bold">{overviewStats.profitMargin}%</p>
                </Card>
                <Card className="text-center">
                    <Calendar className="mx-auto text-[var(--accent-pink)] mb-2" size={24} />
                    <p className="text-xs text-[var(--text-muted)]">Total Bets</p>
                    <p className="text-xl font-bold">{overviewStats.totalBets.toLocaleString()}</p>
                </Card>
                <Card className="text-center">
                    <Users className="mx-auto text-[var(--accent-green)] mb-2" size={24} />
                    <p className="text-xs text-[var(--text-muted)]">Winners</p>
                    <p className="text-xl font-bold">{overviewStats.winners.toLocaleString()}</p>
                </Card>
            </div>

            {/* Monthly Breakdown */}
            <Card>
                <CardHeader
                    title="Monthly Performance"
                    subtitle="Revenue, payout, and profit trends"
                />
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Month</th>
                                <th>Revenue</th>
                                <th>Payout</th>
                                <th>Net Profit</th>
                                <th>Margin</th>
                                <th>Trend</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthlyData.map((month, index) => {
                                const margin = ((month.profit / month.revenue) * 100).toFixed(1)
                                const prevProfit = monthlyData[index + 1]?.profit || month.profit
                                const trend = month.profit > prevProfit ? 'up' : month.profit < prevProfit ? 'down' : 'neutral'

                                return (
                                    <tr key={month.month}>
                                        <td className="font-medium">{month.month} 2026</td>
                                        <td>₹{(month.revenue / 100000).toFixed(1)}L</td>
                                        <td className="text-[var(--status-error)]">
                                            -₹{(month.payout / 100000).toFixed(1)}L
                                        </td>
                                        <td className="text-[var(--status-success)] font-medium">
                                            +₹{(month.profit / 100000).toFixed(1)}L
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
                            })}
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
                            const margin = ((game.profit / game.collection) * 100).toFixed(1)
                            const profitPercentage = (game.profit / gameBreakdown.reduce((a, b) => a + b.profit, 0)) * 100

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
                                        <span className="text-[var(--text-muted)]">Collection: ₹{(game.collection / 100000).toFixed(1)}L</span>
                                        <span className="text-[var(--status-success)]">Profit: ₹{(game.profit / 1000).toFixed(0)}K</span>
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
                                {staffPerformance.map((staff, index) => (
                                    <tr key={staff.name}>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-[var(--accent-yellow)]/20 text-[var(--accent-yellow)]' :
                                                        index === 1 ? 'bg-[var(--text-muted)]/20 text-[var(--text-muted)]' :
                                                            index === 2 ? 'bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]' :
                                                                'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                                                    }`}>
                                                    {index + 1}
                                                </span>
                                                <span className="font-medium">{staff.name}</span>
                                            </div>
                                        </td>
                                        <td>{staff.bets.toLocaleString()}</td>
                                        <td>₹{(staff.collection / 100000).toFixed(1)}L</td>
                                        <td className="text-[var(--status-success)]">
                                            ₹{(staff.profit / 1000).toFixed(0)}K
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    )
}
