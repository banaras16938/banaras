'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Search, IndianRupee, AlertTriangle, Users } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/utils/format'

interface BetDetail {
    id: string
    staffName: string
    playerName: string
    amount: number
    session: 'morning' | 'night'
    target: 'open' | 'close' | 'jodi_full'
    category: 'single' | 'jodi' | 'triple'
    createdAt: string
    potentialPayout: number
}

interface CrossCheckSummary {
    totalAmount: number
    totalLiability: number
    totalBets: number
    sessionBreakdown: {
        morning: { amount: number, count: number }
        night: { amount: number, count: number }
    }
}

export default function CrossCheckingPage() {
    const [number, setNumber] = useState('')
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<{ summary: CrossCheckSummary, bets: BetDetail[] } | null>(null)
    const [hasSearched, setHasSearched] = useState(false)

    const handleCheck = async () => {
        if (!number) {
            toast.error('Please enter a number to check')
            return
        }

        setLoading(true)
        setData(null)
        setHasSearched(true)

        try {
            const response = await fetch(`/api/cross-check?number=${number}`)
            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch data')
            }

            setData(result)
        } catch (error) {
            console.error('Check failed:', error)
            toast.error('Failed to fetch betting data')
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCheck()
        }
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Cross Checking</h1>
                    <p className="text-gray-400">
                        Check liability and bet volume for specific numbers
                    </p>
                </div>
            </div>

            {/* Search Section */}
            <Card>
                <div className="p-6">
                    <div className="max-w-md mx-auto flex gap-4">
                        <Input
                            placeholder="Enter Number (e.g., 5, 56, 123)"
                            value={number}
                            onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 3))}
                            className="text-lg font-mono tracking-widest text-center"
                            onKeyDown={handleKeyDown}
                        />
                        <Button
                            onClick={handleCheck}
                            isLoading={loading}
                            icon={<Search size={18} />}
                            className="min-w-[120px]"
                        >
                            Check
                        </Button>
                    </div>
                    <p className="text-center text-sm text-gray-500 mt-2">
                        Enter any Single, Jodi, or Triple number to analyze today's bets
                    </p>
                </div>
            </Card>

            {/* Results */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <LoadingSpinner size="lg" />
                </div>
            ) : data ? (
                <div className="animate-fade-in space-y-6">

                    {/* Summary Stats */}
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="p-6 rounded-xl bg-gray-800 border border-gray-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                    <IndianRupee size={20} />
                                </div>
                                <h3 className="text-gray-400 font-medium">Total Investment</h3>
                            </div>
                            <p className="text-3xl font-bold text-white">
                                {formatCurrency(data.summary.totalAmount)}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                From {data.summary.totalBets} bets
                            </p>
                        </div>

                        <div className="p-6 rounded-xl bg-gray-800 border border-gray-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                                    <AlertTriangle size={20} />
                                </div>
                                <h3 className="text-gray-400 font-medium">Potential Liability</h3>
                            </div>
                            <p className="text-3xl font-bold text-red-400">
                                {formatCurrency(data.summary.totalLiability)}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                If number {number} wins today
                            </p>
                        </div>

                        <div className="p-6 rounded-xl bg-gray-800 border border-gray-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                    <Users size={20} />
                                </div>
                                <h3 className="text-gray-400 font-medium">Session Split</h3>
                            </div>
                            <div className="space-y-2 mt-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-300">Morning</span>
                                    <span className="font-mono text-white">
                                        {formatCurrency(data.summary.sessionBreakdown.morning.amount)}
                                    </span>
                                </div>
                                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-cyan-400"
                                        style={{ width: `${(data.summary.sessionBreakdown.morning.amount / (data.summary.totalAmount || 1)) * 100}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-sm pt-1">
                                    <span className="text-gray-300">Night</span>
                                    <span className="font-mono text-white">
                                        {formatCurrency(data.summary.sessionBreakdown.night.amount)}
                                    </span>
                                </div>
                                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-400"
                                        style={{ width: `${(data.summary.sessionBreakdown.night.amount / (data.summary.totalAmount || 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Bets Table */}
                    <Card>
                        <CardHeader title="Detailed Bet List" subtitle={`All bets placed on number ${number}`} />
                        {data.bets.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                No bets found for number {number} today.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-700 text-gray-400 text-sm">
                                            <th className="p-4 font-medium">Time</th>
                                            <th className="p-4 font-medium">Staff</th>
                                            <th className="p-4 font-medium">Player</th>
                                            <th className="p-4 font-medium">Session</th>
                                            <th className="p-4 font-medium">Amount</th>
                                            <th className="p-4 font-medium">Potential Win</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700 text-gray-200">
                                        {data.bets.map((bet) => (
                                            <tr key={bet.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 font-mono text-sm text-gray-400">
                                                    {new Date(bet.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="p-4">{bet.staffName}</td>
                                                <td className="p-4">{bet.playerName}</td>
                                                <td className="p-4">
                                                    <Badge variant={bet.session === 'morning' ? 'info' : 'warning'}>
                                                        {bet.session}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 font-bold text-white">
                                                    {formatCurrency(bet.amount)}
                                                </td>
                                                <td className="p-4 font-mono text-red-300">
                                                    {formatCurrency(bet.potentialPayout)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                </div>
            ) : hasSearched ? (
                <div className="text-center py-12">
                    <p className="text-gray-500">No data found for number {number}</p>
                </div>
            ) : null}
        </div>
    )
}
