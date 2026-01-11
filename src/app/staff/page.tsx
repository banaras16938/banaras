'use client'

import { Card, CardHeader } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import {
    TrendingUp,
    TrendingDown,
    Ticket,
    Clock,
    Trophy,
    ArrowUpRight
} from 'lucide-react'
import Link from 'next/link'

// Mock data
const stats = [
    {
        label: "Today's Bets",
        value: '₹45,230',
        change: '+12%',
        trending: 'up',
        icon: Ticket
    },
    {
        label: 'Pending Bets',
        value: '23',
        change: '5 new',
        trending: 'neutral',
        icon: Clock
    },
    {
        label: 'Today\'s Profit',
        value: '₹8,450',
        change: '+8.5%',
        trending: 'up',
        icon: TrendingUp
    },
    {
        label: 'Win Rate',
        value: '18.2%',
        change: '-2.1%',
        trending: 'down',
        icon: Trophy
    },
]

const recentBets = [
    { id: '1', user: 'User #4521', type: 'Triple', number: '578', amount: 500, time: '2 min ago' },
    { id: '2', user: 'User #3892', type: 'Jodi', number: '45', amount: 1000, time: '5 min ago' },
    { id: '3', user: 'User #2103', type: 'Single', number: '7', amount: 200, time: '8 min ago' },
    { id: '4', user: 'User #7845', type: 'Triple', number: '234', amount: 300, time: '12 min ago' },
    { id: '5', user: 'User #1234', type: 'Jodi', number: '89', amount: 500, time: '15 min ago' },
]

export default function StaffDashboard() {
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
                {stats.map((stat) => {
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
                        {recentBets.map((bet) => (
                            <div
                                key={bet.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[var(--primary-500)]/10 flex items-center justify-center">
                                        <span className="font-mono text-[var(--primary-400)]">{bet.number}</span>
                                    </div>
                                    <div>
                                        <p className="font-medium">{bet.user}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{bet.time}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium">₹{bet.amount}</p>
                                    <Badge
                                        variant={bet.type === 'Triple' ? 'success' : bet.type === 'Jodi' ? 'warning' : 'info'}
                                    >
                                        {bet.type}
                                    </Badge>
                                </div>
                            </div>
                        ))}
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
