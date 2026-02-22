'use client'

import { useState, useMemo } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Search, IndianRupee, AlertTriangle, TrendingUp, Hash, Layers, Grid3X3 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/utils/format'

interface BetDetail {
    id: string
    staffName: string
    playerName: string
    amount: number
    selectedNumber: string
    target: string
    createdAt: string
    potentialPayout: number
}

interface CategoryData {
    bets: BetDetail[]
    count: number
    totalAmount: number
    totalLiability: number
    multiplier: number
}

interface CrossCheckResult {
    triple: string
    derivedSingle: string
    session: string
    target: string
    date: string
    jodiNumbers: string[]
    jodiNote: string
    totalCollection: number
    categories: {
        triple: CategoryData
        single: CategoryData
        jodi: CategoryData
    }
    grandTotalLiability: number
}

type SessionType = 'morning' | 'night'
type TargetType = 'open' | 'close'

export default function CrossCheckingPage() {
    const [triple, setTriple] = useState('')
    const [session, setSession] = useState<SessionType>('morning')
    const [target, setTarget] = useState<TargetType>('open')
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<CrossCheckResult | null>(null)
    const [hasSearched, setHasSearched] = useState(false)

    // Live-derive single for display
    const previewSingle = useMemo(() => {
        if (triple.length !== 3 || !/^\d{3}$/.test(triple)) return null
        const sum = triple.split('').reduce((s, d) => s + parseInt(d), 0)
        return (sum % 10).toString()
    }, [triple])

    const handleCheck = async () => {
        if (triple.length !== 3 || !/^\d{3}$/.test(triple)) {
            toast.error('Please enter a valid 3-digit triple (000-999)')
            return
        }

        setLoading(true)
        setData(null)
        setHasSearched(true)

        try {
            const response = await fetch(
                `/api/cross-check?triple=${triple}&session=${session}&target=${target}`
            )
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
        if (e.key === 'Enter') handleCheck()
    }

    const estimatedProfit = data
        ? data.totalCollection - data.grandTotalLiability
        : 0

    const profitPercent = data && data.totalCollection > 0
        ? ((estimatedProfit / data.totalCollection) * 100).toFixed(1)
        : '0'

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Result Cross Checking</h1>
                <p className="text-gray-400">
                    Enter a triple to analyze full liability — triple, single, and jodi exposure
                </p>
            </div>

            {/* Input Section */}
            <Card>
                <div className="p-6 space-y-4">
                    {/* Session & Target Selectors */}
                    <div className="flex gap-3 justify-center">
                        <div className="flex rounded-lg overflow-hidden border border-gray-700">
                            {(['morning', 'night'] as SessionType[]).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSession(s)}
                                    className={`px-4 py-2 text-sm font-medium transition-all ${session === s
                                        ? 'bg-indigo-500 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                        }`}
                                >
                                    {s === 'morning' ? '☀️ Morning' : '🌙 Night'}
                                </button>
                            ))}
                        </div>
                        <div className="flex rounded-lg overflow-hidden border border-gray-700">
                            {(['open', 'close'] as TargetType[]).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTarget(t)}
                                    className={`px-4 py-2 text-sm font-medium transition-all ${target === t
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                        }`}
                                >
                                    {t === 'open' ? 'Open' : 'Close'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Triple Input */}
                    <div className="max-w-md mx-auto flex gap-4">
                        <Input
                            placeholder="Enter Triple (e.g., 578)"
                            value={triple}
                            onChange={(e) => setTriple(e.target.value.replace(/\D/g, '').slice(0, 3))}
                            className="text-lg font-mono tracking-widest text-center"
                            onKeyDown={handleKeyDown}
                        />
                        <Button
                            onClick={handleCheck}
                            isLoading={loading}
                            icon={<Search size={18} />}
                            className="min-w-[120px]"
                        >
                            Analyze
                        </Button>
                    </div>

                    {/* Live Derivation Preview */}
                    {previewSingle !== null && (
                        <div className="text-center">
                            <div className="inline-flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-xl px-5 py-2.5">
                                <span className="text-gray-400 text-sm">Triple:</span>
                                <span className="font-mono font-bold text-white text-lg">{triple}</span>
                                <span className="text-gray-500">→</span>
                                <span className="text-gray-400 text-sm">Single:</span>
                                <span className="font-mono font-bold text-cyan-400 text-lg">{previewSingle}</span>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Results */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <LoadingSpinner size="lg" />
                </div>
            ) : data ? (
                <div className="animate-fade-in space-y-6">

                    {/* Summary Cards */}
                    <div className="grid md:grid-cols-3 gap-4">
                        {/* Total Collection */}
                        <div className="p-5 rounded-xl bg-gray-800 border border-gray-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                    <IndianRupee size={20} />
                                </div>
                                <h3 className="text-gray-400 font-medium">Total Collection</h3>
                            </div>
                            <p className="text-2xl font-bold text-white">
                                {formatCurrency(data.totalCollection)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {data.target === 'open' ? 'Open + Jodi' : 'Close'} bets for {data.session} session
                            </p>
                        </div>

                        {/* Total Liability */}
                        <div className="p-5 rounded-xl bg-gray-800 border border-red-500/30">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                                    <AlertTriangle size={20} />
                                </div>
                                <h3 className="text-gray-400 font-medium">Total Liability</h3>
                            </div>
                            <p className="text-2xl font-bold text-red-400">
                                {formatCurrency(data.grandTotalLiability)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                If triple {data.triple} is declared as {data.target}
                            </p>
                        </div>

                        {/* Estimated Profit */}
                        <div className={`p-5 rounded-xl bg-gray-800 border ${estimatedProfit >= 0 ? 'border-emerald-500/30' : 'border-red-500/30'
                            }`}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-lg ${estimatedProfit >= 0
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-red-500/10 text-red-400'
                                    }`}>
                                    <TrendingUp size={20} />
                                </div>
                                <h3 className="text-gray-400 font-medium">Estimated Profit</h3>
                            </div>
                            <p className={`text-2xl font-bold ${estimatedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                {estimatedProfit >= 0 ? '+' : ''}{formatCurrency(estimatedProfit)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {profitPercent}% of collection
                            </p>
                        </div>
                    </div>

                    {/* Derivation Info */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                        <div className="flex flex-wrap items-center gap-4 justify-center text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">Triple:</span>
                                <span className="font-mono font-bold text-white bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded">{data.triple}</span>
                            </div>
                            <span className="text-gray-600">→</span>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">Single:</span>
                                <span className="font-mono font-bold text-cyan-400 bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded">{data.derivedSingle}</span>
                            </div>
                            <span className="text-gray-600">→</span>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">Jodi:</span>
                                <span className="font-mono font-bold text-purple-400 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded">
                                    {data.jodiNote}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Per-Category Breakdown */}
                    <div className="grid md:grid-cols-3 gap-4">
                        <CategoryCard
                            title="Triple Winners"
                            icon={<Layers size={18} />}
                            number={data.triple}
                            color="amber"
                            category={data.categories.triple}
                        />
                        <CategoryCard
                            title="Single Winners"
                            icon={<Hash size={18} />}
                            number={data.derivedSingle}
                            color="blue"
                            category={data.categories.single}
                        />
                        <CategoryCard
                            title="Jodi Exposure"
                            icon={<Grid3X3 size={18} />}
                            number={data.jodiNumbers.join(', ')}
                            color="purple"
                            category={data.categories.jodi}
                        />
                    </div>

                    {/* Detailed Bets Table */}
                    {(data.categories.triple.count + data.categories.single.count + data.categories.jodi.count) > 0 && (
                        <Card>
                            <CardHeader title="All Affected Bets" subtitle={`Bets that would win if ${data.triple} is declared as ${data.session} ${data.target}`} />
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-700 text-gray-400 text-sm">
                                            <th className="p-4 font-medium">Type</th>
                                            <th className="p-4 font-medium">Number</th>
                                            <th className="p-4 font-medium">Staff</th>
                                            <th className="p-4 font-medium">Player</th>
                                            <th className="p-4 font-medium">Amount</th>
                                            <th className="p-4 font-medium">Payout</th>
                                            <th className="p-4 font-medium">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700 text-gray-200">
                                        {data.categories.triple.bets.map(bet => (
                                            <BetRow key={bet.id} bet={bet} type="Triple" color="amber" />
                                        ))}
                                        {data.categories.single.bets.map(bet => (
                                            <BetRow key={bet.id} bet={bet} type="Single" color="blue" />
                                        ))}
                                        {data.categories.jodi.bets.map(bet => (
                                            <BetRow key={bet.id} bet={bet} type="Jodi" color="purple" />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </div>
            ) : hasSearched ? (
                <div className="text-center py-12">
                    <p className="text-gray-500">No data found. Try a different triple.</p>
                </div>
            ) : null}
        </div>
    )
}

// ==========================================
// Category Card Component
// ==========================================
function CategoryCard({
    title, icon, number, color, category
}: {
    title: string
    icon: React.ReactNode
    number: string
    color: 'amber' | 'blue' | 'purple'
    category: CategoryData
}) {
    const colorMap = {
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
        blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
        purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
    }
    const c = colorMap[color]

    return (
        <div className={`p-5 rounded-xl bg-gray-800 border ${c.border}`}>
            <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${c.bg} ${c.text}`}>
                    {icon}
                </div>
                <h3 className="text-white font-semibold text-sm">{title}</h3>
            </div>
            <div className="text-xs text-gray-500 mb-3 font-mono truncate" title={number}>
                #{number}
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Bets</span>
                    <span className="font-bold text-white">{category.count}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Amount</span>
                    <span className="font-bold text-white font-mono">{formatCurrency(category.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Liability (×{category.multiplier})</span>
                    <span className={`font-bold font-mono ${c.text}`}>{formatCurrency(category.totalLiability)}</span>
                </div>
            </div>
        </div>
    )
}

// ==========================================
// Bet Row Component
// ==========================================
function BetRow({ bet, type, color }: { bet: BetDetail; type: string; color: string }) {
    const badgeVariant = color === 'amber' ? 'warning' : color === 'blue' ? 'info' : 'default'
    return (
        <tr className="hover:bg-white/5 transition-colors">
            <td className="p-4">
                <Badge variant={badgeVariant as any}>{type}</Badge>
            </td>
            <td className="p-4 font-mono font-bold text-white">{bet.selectedNumber}</td>
            <td className="p-4 text-gray-300">{bet.staffName}</td>
            <td className="p-4 text-gray-300">{bet.playerName}</td>
            <td className="p-4 font-bold text-white">{formatCurrency(bet.amount)}</td>
            <td className="p-4 font-mono text-red-300">{formatCurrency(bet.potentialPayout)}</td>
            <td className="p-4 font-mono text-sm text-gray-400">
                {new Date(bet.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </td>
        </tr>
    )
}
