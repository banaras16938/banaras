'use client'

import { Card, CardHeader } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import {
    Users,
    TrendingUp,
    Trophy,
    Ticket,
    Clock,
    ArrowUpRight,
    DollarSign
} from 'lucide-react'
import Link from 'next/link'

// Mock data
const systemStats = [
    {
        label: "Today's Collection",
        value: '₹4,52,300',
        change: '+18%',
        trending: 'up',
        icon: DollarSign
    },
    {
        label: 'Active Staff',
        value: '12',
        change: '2 online',
        trending: 'neutral',
        icon: Users
    },
    {
        label: 'Today\'s Payouts',
        value: '₹3,67,800',
        change: '81.3% of collection',
        trending: 'neutral',
        icon: TrendingUp
    },
    {
        label: 'Net Profit',
        value: '₹84,500',
        change: '18.7%',
        trending: 'up',
        icon: Trophy
    },
]

const gameStatus = {
    morning: {
        status: 'completed',
        openResult: '578',
        closeResult: '478',
        jodi: '09',
        collection: 225000,
        payout: 185000,
    },
    night: {
        status: 'betting',
        openResult: null,
        closeResult: null,
        jodi: null,
        collection: 227300,
        payout: 0,
    },
}

const staffActivity = [
    { name: 'Staff #1', bets: 45, amount: 52300, status: 'online' },
    { name: 'Staff #2', bets: 38, amount: 41200, status: 'online' },
    { name: 'Staff #3', bets: 29, amount: 33800, status: 'offline' },
    { name: 'Staff #4', bets: 52, amount: 61500, status: 'online' },
    { name: 'Staff #5', bets: 31, amount: 38200, status: 'offline' },
]

export default function AdminDashboard() {
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
                            <Badge variant={gameStatus.morning.status === 'completed' ? 'success' : 'warning'}>
                                {gameStatus.morning.status === 'completed' ? 'Completed' : 'In Progress'}
                            </Badge>
                        }
                    />
                    <div className="space-y-4">
                        <div className="flex justify-center gap-6 py-4">
                            <div className="text-center">
                                <p className="text-xs text-[var(--text-muted)]">OPEN</p>
                                <p className="text-3xl font-mono font-bold text-[var(--accent-cyan)]">
                                    {gameStatus.morning.openResult || '***'}
                                </p>
                            </div>
                            <div className="text-center px-6 border-x border-[var(--glass-border)]">
                                <p className="text-xs text-[var(--text-muted)]">JODI</p>
                                <p className="text-3xl font-mono font-bold text-[var(--accent-pink)]">
                                    {gameStatus.morning.jodi || '**'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-[var(--text-muted)]">CLOSE</p>
                                <p className="text-3xl font-mono font-bold text-[var(--accent-green)]">
                                    {gameStatus.morning.closeResult || '***'}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--glass-border)]">
                            <div className="text-center">
                                <p className="text-xs text-[var(--text-muted)]">Collection</p>
                                <p className="text-lg font-bold">₹{gameStatus.morning.collection.toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-[var(--text-muted)]">Payout</p>
                                <p className="text-lg font-bold text-[var(--status-error)]">
                                    ₹{gameStatus.morning.payout.toLocaleString()}
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
                            <Badge variant="warning" dot>
                                Betting Open
                            </Badge>
                        }
                    />
                    <div className="space-y-4">
                        <div className="flex justify-center gap-6 py-4">
                            <div className="text-center">
                                <p className="text-xs text-[var(--text-muted)]">OPEN</p>
                                <p className="text-3xl font-mono font-bold text-[var(--text-muted)] animate-pulse">
                                    ***
                                </p>
                            </div>
                            <div className="text-center px-6 border-x border-[var(--glass-border)]">
                                <p className="text-xs text-[var(--text-muted)]">JODI</p>
                                <p className="text-3xl font-mono font-bold text-[var(--text-muted)] animate-pulse">
                                    **
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-[var(--text-muted)]">CLOSE</p>
                                <p className="text-3xl font-mono font-bold text-[var(--text-muted)] animate-pulse">
                                    ***
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--glass-border)]">
                            <div className="text-center">
                                <p className="text-xs text-[var(--text-muted)]">Collection (Live)</p>
                                <p className="text-lg font-bold text-[var(--accent-cyan)]">
                                    ₹{gameStatus.night.collection.toLocaleString()}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-[var(--text-muted)]">Payout</p>
                                <p className="text-lg font-bold">-</p>
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
                        {staffActivity.map((staff) => (
                            <div
                                key={staff.name}
                                className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface)]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`status-dot ${staff.status === 'online' ? 'online' : 'offline'}`} />
                                    <div>
                                        <p className="font-medium">{staff.name}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{staff.bets} bets today</p>
                                    </div>
                                </div>
                                <p className="font-medium">₹{staff.amount.toLocaleString()}</p>
                            </div>
                        ))}
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
