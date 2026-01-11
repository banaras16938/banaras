'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Bet } from '@/types/types'
import { Search, Filter, Calendar } from 'lucide-react'

// Mock data
const mockBets: Bet[] = [
    {
        id: '1',
        staff_id: 'staff-1',
        user_identifier: 'User #4521',
        game_date: '2026-01-11',
        game_slot: 'morning',
        bet_type: 'open',
        game_type: 'triple',
        number: '578',
        amount: 500,
        potential_payout: 400000,
        is_winner: true,
        payout_amount: 400000,
        created_at: '2026-01-11T10:30:00Z',
    },
    {
        id: '2',
        staff_id: 'staff-1',
        user_identifier: 'User #3892',
        game_date: '2026-01-11',
        game_slot: 'morning',
        bet_type: 'jodi',
        game_type: 'double',
        number: '45',
        amount: 1000,
        potential_payout: 90000,
        is_winner: false,
        created_at: '2026-01-11T10:25:00Z',
    },
    {
        id: '3',
        staff_id: 'staff-1',
        user_identifier: 'User #2103',
        game_date: '2026-01-11',
        game_slot: 'morning',
        bet_type: 'open',
        game_type: 'single',
        number: '7',
        amount: 200,
        potential_payout: 1800,
        created_at: '2026-01-11T10:20:00Z',
    },
    {
        id: '4',
        staff_id: 'staff-1',
        user_identifier: 'User #7845',
        game_date: '2026-01-10',
        game_slot: 'night',
        bet_type: 'close',
        game_type: 'triple',
        number: '234',
        amount: 300,
        potential_payout: 240000,
        is_winner: false,
        created_at: '2026-01-10T18:15:00Z',
    },
    {
        id: '5',
        staff_id: 'staff-1',
        user_identifier: 'User #1234',
        game_date: '2026-01-10',
        game_slot: 'night',
        bet_type: 'jodi',
        game_type: 'double',
        number: '89',
        amount: 500,
        potential_payout: 45000,
        is_winner: true,
        payout_amount: 45000,
        created_at: '2026-01-10T17:45:00Z',
    },
]

export default function BetHistoryPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState<string>('all')
    const [filterDate, setFilterDate] = useState<string>('')

    const filteredBets = mockBets.filter((bet) => {
        const matchesSearch =
            bet.user_identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bet.number.includes(searchTerm)

        const matchesType = filterType === 'all' || bet.game_type === filterType

        const matchesDate = !filterDate || bet.game_date === filterDate

        return matchesSearch && matchesType && matchesDate
    })

    const totalBets = filteredBets.reduce((sum, bet) => sum + bet.amount, 0)
    const totalPotentialPayout = filteredBets.reduce((sum, bet) => sum + bet.potential_payout, 0)

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Bet History</h1>
                    <p className="text-[var(--text-secondary)]">
                        View and search all placed bets
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <Input
                            placeholder="Search by user or number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12"
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <Select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            options={[
                                { value: 'all', label: 'All Types' },
                                { value: 'single', label: 'Single' },
                                { value: 'double', label: 'Jodi' },
                                { value: 'triple', label: 'Triple' },
                            ]}
                        />
                    </div>
                    <div className="w-full md:w-48 relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <Input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="pl-12"
                        />
                    </div>
                </div>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Total Bets</p>
                    <p className="text-2xl font-bold">{filteredBets.length}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Total Amount</p>
                    <p className="text-2xl font-bold">₹{totalBets.toLocaleString()}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Potential Payout</p>
                    <p className="text-2xl font-bold text-[var(--accent-cyan)]">₹{totalPotentialPayout.toLocaleString()}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Winners</p>
                    <p className="text-2xl font-bold text-[var(--status-success)]">
                        {filteredBets.filter(b => b.is_winner).length}
                    </p>
                </Card>
            </div>

            {/* Bets Table */}
            <Card>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Date</th>
                                <th>Slot</th>
                                <th>Type</th>
                                <th>Number</th>
                                <th>Amount</th>
                                <th>Potential</th>
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
                                        <td className="font-medium">{bet.user_identifier}</td>
                                        <td>{bet.game_date}</td>
                                        <td>
                                            <Badge variant={bet.game_slot === 'morning' ? 'info' : 'warning'}>
                                                {bet.game_slot}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Badge
                                                variant={
                                                    bet.game_type === 'triple' ? 'success' :
                                                        bet.game_type === 'double' ? 'warning' : 'info'
                                                }
                                            >
                                                {bet.game_type}
                                            </Badge>
                                        </td>
                                        <td className="font-mono text-[var(--accent-cyan)]">{bet.number}</td>
                                        <td>₹{bet.amount.toLocaleString()}</td>
                                        <td className="text-[var(--text-muted)]">₹{bet.potential_payout.toLocaleString()}</td>
                                        <td>
                                            {bet.is_winner === undefined ? (
                                                <Badge variant="default">Pending</Badge>
                                            ) : bet.is_winner ? (
                                                <Badge variant="success">Won</Badge>
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
            </Card>
        </div>
    )
}
