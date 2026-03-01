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
import { PATTI_FULL_LABELS, PattiCategory } from '@/types/types'

interface BreakdownItem {
    bets: number
    amount: number
    liability: number
    multiplier?: number
}

interface JodiBreakdownItem {
    number: string
    bets: number
    amount: number
    liability: number
}

interface JodiBreakdown extends BreakdownItem {
    numbers: string[]
    exposure: JodiBreakdownItem[]
}

interface CrossCheckResult {
    success: boolean
    triple: string
    pattiType: string
    single: string
    target: string
    session: string
    totalCollection: number
    breakdown: {
        singlePatti: BreakdownItem
        doublePatti: BreakdownItem
        triplePatti: BreakdownItem
        single: BreakdownItem
        jodi: JodiBreakdown
    }
    totalLiability: number
    payoutPercentage: number
    profitPercentage: number
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
        ? data.totalCollection - data.totalLiability
        : 0

    const profitPercent = data && data.totalCollection > 0
        ? ((estimatedProfit / data.totalCollection) * 100).toFixed(1)
        : '0'

    const fmt = formatCurrency

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Result Cross Checking</h1>
                <p className="text-gray-400">
                    Enter a patti to analyze full liability — patti, single, and jodi exposure
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
                            placeholder="Enter Patti (e.g., 578)"
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
                                <span className="text-gray-400 text-sm">Patti:</span>
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
                                {fmt(data.totalCollection)}
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
                                {fmt(data.totalLiability)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                If patti {data.triple} ({data.payoutPercentage}% payout) is declared as {data.target}
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
                                {estimatedProfit >= 0 ? '+' : ''}{fmt(estimatedProfit)}
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
                                <span className="text-gray-500">Patti:</span>
                                <span className="font-mono font-bold text-white bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded">{data.triple}</span>
                                {data.pattiType && data.pattiType !== 'unknown' && (
                                    <Badge variant="default" className="text-[10px]">
                                        {PATTI_FULL_LABELS[data.pattiType as PattiCategory] || data.pattiType}
                                    </Badge>
                                )}
                            </div>
                            <span className="text-gray-600">→</span>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">Single:</span>
                                <span className="font-mono font-bold text-cyan-400 bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded">{data.single}</span>
                            </div>
                        </div>
                    </div>

                    {/* Per-Category Breakdown */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* SP Card */}
                        <LiabilityCard
                            title="Single Patti (×1400)"
                            icon={<Layers size={18} />}
                            colorClass="emerald"
                            bets={data.breakdown.singlePatti.bets}
                            amount={data.breakdown.singlePatti.amount}
                            liability={data.breakdown.singlePatti.liability}
                        />

                        {/* DP Card */}
                        <LiabilityCard
                            title="Double Patti (×2800)"
                            icon={<Layers size={18} />}
                            colorClass="orange"
                            bets={data.breakdown.doublePatti.bets}
                            amount={data.breakdown.doublePatti.amount}
                            liability={data.breakdown.doublePatti.liability}
                        />

                        {/* TP Card */}
                        <LiabilityCard
                            title="Triple Patti (×8000)"
                            icon={<Layers size={18} />}
                            colorClass="red"
                            bets={data.breakdown.triplePatti.bets}
                            amount={data.breakdown.triplePatti.amount}
                            liability={data.breakdown.triplePatti.liability}
                        />

                        {/* Single Card */}
                        <LiabilityCard
                            title={`Single (×9) → ${data.single}`}
                            icon={<Hash size={18} />}
                            colorClass="blue"
                            bets={data.breakdown.single.bets}
                            amount={data.breakdown.single.amount}
                            liability={data.breakdown.single.liability}
                        />

                        {/* Jodi Card */}
                        <div className="p-5 rounded-xl bg-gray-800 border border-purple-500/30 md:col-span-2 lg:col-span-1">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                                    <Grid3X3 size={18} />
                                </div>
                                <h3 className="text-white font-semibold text-sm">Jodi Exposure (×{data.breakdown.jodi.multiplier})</h3>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Total Jodi Bets</span>
                                    <span className="font-bold text-white">{data.breakdown.jodi.bets}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Amount</span>
                                    <span className="font-bold text-white font-mono">{fmt(data.breakdown.jodi.amount)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">{target === 'open' ? 'Max Liability' : 'Liability'}</span>
                                    <span className="font-bold text-purple-400 font-mono">{fmt(data.breakdown.jodi.liability)}</span>
                                </div>
                            </div>

                            {/* Jodi exposure breakdown */}
                            {data.breakdown.jodi.exposure.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-700 space-y-1 max-h-40 overflow-y-auto">
                                    {data.breakdown.jodi.exposure.map(jd => (
                                        <div key={jd.number} className={`flex justify-between text-xs py-0.5 px-2 rounded ${jd.amount > 0 ? 'bg-purple-500/10 text-purple-300' : 'text-gray-600'
                                            }`}>
                                            <span className="font-mono font-bold">{jd.number}</span>
                                            <span className="font-mono">
                                                {jd.bets > 0 ? `${jd.bets} bets • ${fmt(jd.amount)} → ${fmt(jd.liability)}` : 'No bets'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : hasSearched ? (
                <div className="text-center py-12">
                    <p className="text-gray-500">No data found. Try a different patti number.</p>
                </div>
            ) : null}
        </div>
    )
}

// ==========================================
// Liability Card Component
// ==========================================
function LiabilityCard({
    title, icon, colorClass, bets, amount, liability
}: {
    title: string
    icon: React.ReactNode
    colorClass: 'emerald' | 'orange' | 'red' | 'blue' | 'amber' | 'purple'
    bets: number
    amount: number
    liability: number
}) {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
        orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
        red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
        blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
        purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
    }
    const c = colorMap[colorClass]

    return (
        <div className={`p-5 rounded-xl bg-gray-800 border ${c.border}`}>
            <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${c.bg} ${c.text}`}>
                    {icon}
                </div>
                <h3 className="text-white font-semibold text-sm">{title}</h3>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Bets</span>
                    <span className="font-bold text-white">{bets}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Amount</span>
                    <span className="font-bold text-white font-mono">{formatCurrency(amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Liability</span>
                    <span className={`font-bold font-mono ${c.text}`}>{formatCurrency(liability)}</span>
                </div>
            </div>
        </div>
    )
}
