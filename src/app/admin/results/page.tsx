'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Slider } from '@/components/ui/Slider'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Input'
import { ResultOption } from '@/types/types'
import {
    Target,
    Zap,
    TrendingDown,
    Ghost,
    Check,
    AlertTriangle,
    Trophy
} from 'lucide-react'

// Mock data generator
function generateResultOptions(): {
    targetMatch: ResultOption[]
    systemRecommendations: ResultOption[]
    lowBets: ResultOption[]
    noBets: ResultOption[]
} {
    const generateOption = (triple: string): ResultOption => {
        const digits = triple.split('').map(Number)
        const sum = digits.reduce((a, b) => a + b, 0)
        const single = sum % 10
        const totalBets = Math.floor(Math.random() * 50000)
        const totalLiability = totalBets * (Math.random() * 100 + 10)
        const collection = 452300 // Fixed total collection for demo
        const payoutPercentage = (totalLiability / collection) * 100

        return {
            triple,
            single,
            totalBets,
            totalLiability,
            payoutPercentage: Math.min(payoutPercentage, 100),
            profitPercentage: 100 - Math.min(payoutPercentage, 100),
        }
    }

    // Generate all 1000 triples
    const allOptions: ResultOption[] = []
    for (let i = 0; i < 1000; i++) {
        const triple = i.toString().padStart(3, '0')
        allOptions.push(generateOption(triple))
    }

    // Sort and filter for different lists
    const sorted = [...allOptions].sort((a, b) => a.payoutPercentage - b.payoutPercentage)

    return {
        targetMatch: sorted.filter(o => o.payoutPercentage >= 8 && o.payoutPercentage <= 15).slice(0, 10),
        systemRecommendations: sorted.slice(0, 5),
        lowBets: allOptions.filter(o => o.totalBets > 0 && o.totalBets < 5000).slice(0, 10),
        noBets: allOptions.filter(o => o.totalBets === 0).slice(0, 10),
    }
}

export default function ResultSelectorPage() {
    const [payoutSlider, setPayoutSlider] = useState(10)
    const [selectedGame, setSelectedGame] = useState<'morning-open' | 'morning-close' | 'night-open' | 'night-close'>('night-open')
    const [selectedResult, setSelectedResult] = useState<ResultOption | null>(null)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const resultLists = generateResultOptions()

    // Filter target match based on slider
    const targetMatchFiltered = resultLists.targetMatch.filter(
        o => Math.abs(o.payoutPercentage - payoutSlider) < 5
    )

    const handleSelectResult = (option: ResultOption) => {
        setSelectedResult(option)
        setShowConfirmModal(true)
    }

    const handleDeclareResult = async () => {
        setIsSubmitting(true)

        // TODO: Submit to Supabase
        await new Promise(resolve => setTimeout(resolve, 1500))

        setShowConfirmModal(false)
        setShowSuccessModal(true)
        setIsSubmitting(false)
    }

    const gameOptions = [
        { value: 'morning-open', label: 'Morning - Open (1:00 PM)' },
        { value: 'morning-close', label: 'Morning - Close (3:00 PM)' },
        { value: 'night-open', label: 'Night - Open (6:00 PM)' },
        { value: 'night-close', label: 'Night - Close (8:00 PM)' },
    ]

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Result Selector</h1>
                    <p className="text-[var(--text-secondary)]">
                        Select optimal result for maximum profit control
                    </p>
                </div>
                <div className="w-full md:w-64">
                    <Select
                        value={selectedGame}
                        onChange={(e) => setSelectedGame(e.target.value as typeof selectedGame)}
                        options={gameOptions}
                    />
                </div>
            </div>

            {/* Current Stats */}
            <div className="grid md:grid-cols-4 gap-4">
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Total Collection</p>
                    <p className="text-2xl font-bold text-[var(--accent-cyan)]">₹4,52,300</p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Single Bets</p>
                    <p className="text-2xl font-bold">₹1,23,500</p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Jodi Bets</p>
                    <p className="text-2xl font-bold">₹2,15,800</p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Triple Bets</p>
                    <p className="text-2xl font-bold">₹1,13,000</p>
                </Card>
            </div>

            {/* Payout Controller */}
            <Card>
                <CardHeader
                    title="Profit / Payout Controller"
                    subtitle="Adjust slider to find results matching your desired payout percentage"
                />
                <div className="mt-4">
                    <Slider
                        label="Desired User Payout"
                        value={payoutSlider}
                        onChange={setPayoutSlider}
                        min={0}
                        max={30}
                        step={1}
                    />
                    <div className="mt-4 p-4 rounded-lg bg-[var(--bg-surface)] flex justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Estimated Payout</p>
                            <p className="text-xl font-bold text-[var(--status-error)]">
                                ₹{Math.round(452300 * payoutSlider / 100).toLocaleString()}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-[var(--text-muted)]">Estimated Profit</p>
                            <p className="text-xl font-bold text-[var(--status-success)]">
                                ₹{Math.round(452300 * (100 - payoutSlider) / 100).toLocaleString()} ({100 - payoutSlider}%)
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Result Lists */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* List A: Target Match */}
                <Card>
                    <CardHeader
                        title="Target Match"
                        subtitle={`Results with ~${payoutSlider}% payout`}
                        action={<Target className="text-[var(--accent-cyan)]" size={20} />}
                    />
                    <ResultListTable
                        results={targetMatchFiltered.length > 0 ? targetMatchFiltered : resultLists.targetMatch}
                        onSelect={handleSelectResult}
                        emptyMessage="No exact matches. Showing closest options."
                    />
                </Card>

                {/* List B: System Recommendations */}
                <Card>
                    <CardHeader
                        title="System Recommendations"
                        subtitle="Highest profit options"
                        action={<Zap className="text-[var(--accent-yellow)]" size={20} />}
                    />
                    <ResultListTable
                        results={resultLists.systemRecommendations}
                        onSelect={handleSelectResult}
                        highlight="profit"
                    />
                </Card>

                {/* List C: Low Bets */}
                <Card>
                    <CardHeader
                        title="Numbers with Low Bets"
                        subtitle="Minimal bet volume"
                        action={<TrendingDown className="text-[var(--accent-pink)]" size={20} />}
                    />
                    <ResultListTable
                        results={resultLists.lowBets}
                        onSelect={handleSelectResult}
                    />
                </Card>

                {/* List D: No Bets (Ghost Numbers) */}
                <Card>
                    <CardHeader
                        title="Ghost Numbers (No Bets)"
                        subtitle="100% profit - zero payout"
                        action={<Ghost className="text-[var(--accent-green)]" size={20} />}
                    />
                    <ResultListTable
                        results={resultLists.noBets}
                        onSelect={handleSelectResult}
                        highlight="ghost"
                    />
                </Card>
            </div>

            {/* Confirmation Modal */}
            <Modal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="Confirm Result Declaration"
                size="md"
            >
                {selectedResult && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-[var(--status-warning)]/10 border border-[var(--status-warning)]/30 flex gap-3">
                            <AlertTriangle className="text-[var(--status-warning)] flex-shrink-0" />
                            <p className="text-sm text-[var(--status-warning)]">
                                This action cannot be undone. The result will be immediately visible to all users.
                            </p>
                        </div>

                        <div className="p-6 rounded-lg bg-[var(--bg-surface)] text-center">
                            <p className="text-xs text-[var(--text-muted)] mb-2">DECLARING RESULT</p>
                            <p className="text-5xl font-mono font-bold text-[var(--accent-cyan)] mb-2">
                                {selectedResult.triple}
                            </p>
                            <p className="text-lg text-white">
                                Single: <span className="font-bold">{selectedResult.single}</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-[var(--bg-surface)]">
                            <div>
                                <p className="text-xs text-[var(--text-muted)]">Estimated Payout</p>
                                <p className="text-lg font-bold text-[var(--status-error)]">
                                    ₹{Math.round(selectedResult.totalLiability).toLocaleString()}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                    {selectedResult.payoutPercentage.toFixed(1)}% of collection
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-[var(--text-muted)]">Estimated Profit</p>
                                <p className="text-lg font-bold text-[var(--status-success)]">
                                    ₹{Math.round(452300 - selectedResult.totalLiability).toLocaleString()}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                    {selectedResult.profitPercentage.toFixed(1)}% margin
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => setShowConfirmModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleDeclareResult}
                                isLoading={isSubmitting}
                            >
                                Declare Result
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Success Modal */}
            <Modal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="Result Declared Successfully"
            >
                <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-[var(--status-success)]/20 flex items-center justify-center mx-auto mb-4">
                        <Trophy size={32} className="text-[var(--status-success)]" />
                    </div>
                    {selectedResult && (
                        <>
                            <p className="text-4xl font-mono font-bold text-[var(--accent-cyan)] mb-2">
                                {selectedResult.triple}
                            </p>
                            <p className="text-[var(--text-secondary)]">
                                Result has been declared and is now live.
                            </p>
                        </>
                    )}
                    <Button
                        className="mt-6"
                        onClick={() => {
                            setShowSuccessModal(false)
                            setSelectedResult(null)
                        }}
                    >
                        Done
                    </Button>
                </div>
            </Modal>
        </div>
    )
}

interface ResultListTableProps {
    results: ResultOption[]
    onSelect: (option: ResultOption) => void
    highlight?: 'profit' | 'ghost'
    emptyMessage?: string
}

function ResultListTable({ results, onSelect, highlight, emptyMessage }: ResultListTableProps) {
    if (results.length === 0) {
        return (
            <div className="py-8 text-center text-[var(--text-muted)]">
                {emptyMessage || 'No results available'}
            </div>
        )
    }

    return (
        <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.map((result) => (
                <button
                    key={result.triple}
                    onClick={() => onSelect(result)}
                    className="w-full p-3 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] transition-all flex items-center justify-between group"
                >
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <p className="font-mono text-xl font-bold text-[var(--accent-cyan)]">
                                {result.triple}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                                Single: {result.single}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">
                                Bets: ₹{result.totalBets.toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                        <div>
                            <p className={`text-sm font-medium ${highlight === 'ghost' || result.profitPercentage > 90
                                    ? 'text-[var(--status-success)]'
                                    : 'text-[var(--text-primary)]'
                                }`}>
                                {result.profitPercentage.toFixed(1)}% profit
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                                Payout: {result.payoutPercentage.toFixed(1)}%
                            </p>
                        </div>
                        <Badge
                            variant={result.profitPercentage > 90 ? 'success' : 'info'}
                            className="group-hover:bg-[var(--primary-500)] group-hover:text-white transition-colors"
                        >
                            Select
                        </Badge>
                    </div>
                </button>
            ))}
        </div>
    )
}
