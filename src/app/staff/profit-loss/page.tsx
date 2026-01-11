'use client'

import { Card, CardHeader } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    ChevronUp,
    ChevronDown
} from 'lucide-react'

// Mock data
const summaryStats = {
    today: { bets: 45230, payout: 36780, profit: 8450, profitPercent: 18.7 },
    week: { bets: 324500, payout: 278200, profit: 46300, profitPercent: 14.3 },
    month: { bets: 1450000, payout: 1203000, profit: 247000, profitPercent: 17.0 },
}

const dailyBreakdown = [
    { date: '2026-01-11', bets: 45230, payout: 36780, profit: 8450, winners: 12 },
    { date: '2026-01-10', bets: 52100, payout: 48500, profit: 3600, winners: 18 },
    { date: '2026-01-09', bets: 38900, payout: 29200, profit: 9700, winners: 8 },
    { date: '2026-01-08', bets: 47800, payout: 41200, profit: 6600, winners: 14 },
    { date: '2026-01-07', bets: 55200, payout: 43800, profit: 11400, winners: 10 },
    { date: '2026-01-06', bets: 42300, payout: 38700, profit: 3600, winners: 16 },
    { date: '2026-01-05', bets: 43000, payout: 36000, profit: 7000, winners: 11 },
]

export default function ProfitLossPage() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold">Profit & Loss Dashboard</h1>
                <p className="text-[var(--text-secondary)]">
                    Track your performance and earnings
                </p>
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
                                <p className="text-2xl font-bold">₹{summaryStats.today.bets.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--text-muted)]">Payouts</p>
                                <p className="text-lg font-medium text-[var(--status-error)]">
                                    -₹{summaryStats.today.payout.toLocaleString()}
                                </p>
                            </div>
                            <div className="pt-3 border-t border-[var(--glass-border)]">
                                <p className="text-xs text-[var(--text-muted)]">Net Profit</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-2xl font-bold text-[var(--status-success)]">
                                        ₹{summaryStats.today.profit.toLocaleString()}
                                    </p>
                                    <Badge variant="success">
                                        <ChevronUp size={14} />
                                        {summaryStats.today.profitPercent}%
                                    </Badge>
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
                                <p className="text-2xl font-bold">₹{summaryStats.week.bets.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--text-muted)]">Payouts</p>
                                <p className="text-lg font-medium text-[var(--status-error)]">
                                    -₹{summaryStats.week.payout.toLocaleString()}
                                </p>
                            </div>
                            <div className="pt-3 border-t border-[var(--glass-border)]">
                                <p className="text-xs text-[var(--text-muted)]">Net Profit</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-2xl font-bold text-[var(--status-success)]">
                                        ₹{summaryStats.week.profit.toLocaleString()}
                                    </p>
                                    <Badge variant="success">
                                        <ChevronUp size={14} />
                                        {summaryStats.week.profitPercent}%
                                    </Badge>
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
                                <p className="text-2xl font-bold">₹{(summaryStats.month.bets / 100000).toFixed(1)}L</p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--text-muted)]">Payouts</p>
                                <p className="text-lg font-medium text-[var(--status-error)]">
                                    -₹{(summaryStats.month.payout / 100000).toFixed(1)}L
                                </p>
                            </div>
                            <div className="pt-3 border-t border-[var(--glass-border)]">
                                <p className="text-xs text-[var(--text-muted)]">Net Profit</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-2xl font-bold text-[var(--status-success)]">
                                        ₹{(summaryStats.month.profit / 100000).toFixed(1)}L
                                    </p>
                                    <Badge variant="success">
                                        <ChevronUp size={14} />
                                        {summaryStats.month.profitPercent}%
                                    </Badge>
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
                            {dailyBreakdown.map((day) => {
                                const margin = ((day.profit / day.bets) * 100).toFixed(1)
                                const isPositive = day.profit > 0

                                return (
                                    <tr key={day.date}>
                                        <td className="font-medium">{day.date}</td>
                                        <td>₹{day.bets.toLocaleString()}</td>
                                        <td className="text-[var(--status-error)]">
                                            -₹{day.payout.toLocaleString()}
                                        </td>
                                        <td>
                                            <span className={isPositive ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}>
                                                {isPositive ? '+' : ''}₹{day.profit.toLocaleString()}
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
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}
