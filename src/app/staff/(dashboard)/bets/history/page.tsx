'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { BetCategory, BetTarget, SessionType } from '@/types/types'
import { Search, Calendar, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface BetWithDetails {
    id: string
    category: BetCategory
    target: BetTarget
    selected_number: string
    amount: number
    status: 'pending' | 'won' | 'lost' | 'refunded'
    winning_amount: number
    created_at: string
    player: { name: string; phone: string | null } | null
    game_session: { game_date: string; session_name: SessionType } | null
}

// Helper to get date strings for today and yesterday
function getDateRange() {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    return {
        today: today.toISOString().split('T')[0],
        yesterday: yesterday.toISOString().split('T')[0],
        minDate: yesterday.toISOString().split('T')[0],
        maxDate: today.toISOString().split('T')[0]
    }
}

export default function BetHistoryPage() {
    const [bets, setBets] = useState<BetWithDetails[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState<string>('all')
    const [filterSession, setFilterSession] = useState<string>('all')
    const [filterDate, setFilterDate] = useState<string>('')

    const dateRange = useMemo(() => getDateRange(), [])

    const fetchBets = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (filterDate) params.append('date', filterDate)
            if (filterSession !== 'all') params.append('session', filterSession)

            const response = await fetch(`/api/bets?${params.toString()}`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch bets')
            }

            setBets(data.bets || [])
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load bets')
            setBets([])
        } finally {
            setLoading(false)
        }
    }, [filterDate, filterSession])

    useEffect(() => {
        fetchBets()
    }, [fetchBets])

    // Filter bets locally for search, type, and date range (last 2 days only)
    const filteredBets = bets.filter((bet) => {
        const playerName = bet.player?.name || ''
        const matchesSearch =
            playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bet.selected_number.includes(searchTerm)

        const matchesType = filterType === 'all' || bet.category === filterType

        // Only show bets from today and yesterday
        const betDate = bet.game_session?.game_date || ''
        const isWithinDateRange = betDate === dateRange.today || betDate === dateRange.yesterday

        return matchesSearch && matchesType && isWithinDateRange
    })



    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Bet History</h1>
                    <p className="text-gray-400">
                        View and search all placed bets
                    </p>
                </div>
                <button
                    onClick={fetchBets}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    disabled={loading}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <Card>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={18} />
                        <Input
                            placeholder="Search by player or number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="!pl-12"
                        />
                    </div>
                    <div className="w-full md:w-40">
                        <Select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            options={[
                                { value: 'all', label: 'All Types' },
                                { value: 'single', label: 'Single' },
                                { value: 'jodi', label: 'Jodi' },
                                { value: 'triple', label: 'Triple' },
                            ]}
                        />
                    </div>
                    <div className="w-full md:w-40">
                        <Select
                            value={filterSession}
                            onChange={(e) => setFilterSession(e.target.value)}
                            options={[
                                { value: 'all', label: 'All Sessions' },
                                { value: 'morning', label: 'Morning' },
                                { value: 'night', label: 'Night' },
                            ]}
                        />
                    </div>
                    <div className="w-full md:w-48 relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={18} />
                        <Input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="!pl-12"
                            min={dateRange.minDate}
                            max={dateRange.maxDate}
                        />
                    </div>
                </div>
            </Card>


            {/* Bets Table */}
            <Card>
                {loading ? (
                    <div className="py-12 flex justify-center">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Player</th>
                                    <th>Date</th>
                                    <th>Session</th>
                                    <th>Type</th>
                                    <th>Target</th>
                                    <th>Number</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBets.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-8 text-[var(--text-muted)]">
                                            No bets found matching your criteria
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBets.map((bet) => (
                                        <tr key={bet.id}>
                                            <td className="font-medium">
                                                <div>
                                                    <p>{bet.player?.name || 'Unknown'}</p>
                                                    {bet.player?.phone && (
                                                        <p className="text-xs text-[var(--text-muted)]">{bet.player.phone}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div>
                                                    <p>{bet.game_session?.game_date || '-'}</p>
                                                    <p className="text-xs text-[var(--text-muted)]">
                                                        {formatTime(bet.created_at)}
                                                    </p>
                                                </div>
                                            </td>
                                            <td>
                                                <Badge variant={bet.game_session?.session_name === 'morning' ? 'info' : 'warning'}>
                                                    {bet.game_session?.session_name || '-'}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Badge
                                                    variant={
                                                        bet.category === 'triple' ? 'success' :
                                                            bet.category === 'jodi' ? 'warning' : 'info'
                                                    }
                                                >
                                                    {bet.category}
                                                </Badge>
                                            </td>
                                            <td className="capitalize text-[var(--text-muted)]">
                                                {bet.target === 'jodi_full' ? 'Jodi' : bet.target}
                                            </td>
                                            <td className="font-mono text-[var(--accent-cyan)] font-bold">
                                                {bet.selected_number}
                                            </td>
                                            <td>₹{Number(bet.amount).toLocaleString()}</td>
                                            <td>
                                                {bet.status === 'pending' ? (
                                                    <Badge variant="default">Pending</Badge>
                                                ) : bet.status === 'won' ? (
                                                    <div>
                                                        <Badge variant="success">Won</Badge>
                                                        <p className="text-xs text-[var(--status-success)] mt-1">
                                                            +₹{Number(bet.winning_amount).toLocaleString()}
                                                        </p>
                                                    </div>
                                                ) : bet.status === 'refunded' ? (
                                                    <Badge variant="warning">Refunded</Badge>
                                                ) : (
                                                    <Badge variant="error">Lost</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    )
}
