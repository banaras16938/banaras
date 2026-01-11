'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Slider } from '@/components/ui/Slider'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ResultOption, SessionType, BetTarget } from '@/types/types'
import {
    Target,
    Zap,
    TrendingDown,
    Ghost,
    AlertTriangle,
    Trophy,
    RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface RecommendationsData {
    totalCollection: number
    targetMatch: ResultOption[]
    systemRecommendations: ResultOption[]
    lowBets: ResultOption[]
    noBets: ResultOption[]
}

export default function ResultSelectorPage() {
    const [payoutSlider, setPayoutSlider] = useState(10)
    const [selectedSession, setSelectedSession] = useState<SessionType>('morning')
    const [selectedTarget, setSelectedTarget] = useState<BetTarget>('open')
    const [gameDate, setGameDate] = useState(() => new Date().toISOString().split('T')[0])
    const [selectedResult, setSelectedResult] = useState<ResultOption | null>(null)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<RecommendationsData>({
        totalCollection: 0,
        targetMatch: [],
        systemRecommendations: [],
        lowBets: [],
        noBets: []
    })
    const [existingSession, setExistingSession] = useState<{
        open_triple?: string | null
        close_triple?: string | null
    } | null>(null)

    const fetchRecommendations = useCallback(async () => {
        setLoading(true)
        try {
            // Fetch recommendations
            const response = await fetch(
                `/api/analytics?type=recommendations&date=${gameDate}&session=${selectedSession}&target=${selectedTarget}&targetPayout=${payoutSlider}`
            )

            if (!response.ok) {
                throw new Error('Failed to fetch recommendations')
            }

            const { recommendations } = await response.json()
            setData(recommendations || {
                totalCollection: 0,
                targetMatch: [],
                systemRecommendations: [],
                lowBets: [],
                noBets: []
            })

            // Check existing session
            const sessionsRes = await fetch(`/api/results?date=${gameDate}&session=${selectedSession}`)
            if (sessionsRes.ok) {
                const { sessions } = await sessionsRes.json()
                const session = sessions?.find((s: { session_name: string }) => s.session_name === selectedSession)
                setExistingSession(session || null)
            }
        } catch (error) {
            console.error('Error fetching recommendations:', error)
            toast.error('Failed to load recommendations')
        } finally {
            setLoading(false)
        }
    }, [gameDate, selectedSession, selectedTarget, payoutSlider])

    useEffect(() => {
        fetchRecommendations()
    }, [fetchRecommendations])

    const handleSelectResult = (option: ResultOption) => {
        // Check if result already declared
        if (selectedTarget === 'open' && existingSession?.open_triple) {
            toast.error('Open result already declared for this session')
            return
        }
        if (selectedTarget === 'close' && existingSession?.close_triple) {
            toast.error('Close result already declared for this session')
            return
        }
        if (selectedTarget === 'open' && !existingSession?.open_triple === false) {
            // Can declare open
        }
        if (selectedTarget === 'close' && !existingSession?.open_triple) {
            toast.error('Open result must be declared first')
            return
        }

        setSelectedResult(option)
        setShowConfirmModal(true)
    }

    const handleDeclareResult = async () => {
        if (!selectedResult) return

        setIsSubmitting(true)

        try {
            const response = await fetch('/api/results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameDate,
                    sessionName: selectedSession,
                    target: selectedTarget,
                    triple: selectedResult.triple
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to declare result')
            }

            setShowConfirmModal(false)
            setShowSuccessModal(true)

            // Refresh data
            await fetchRecommendations()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to declare result')
        } finally {
            setIsSubmitting(false)
        }
    }

    const sessionOptions = [
        { value: 'morning', label: 'Morning Game' },
        { value: 'night', label: 'Night Game' },
    ]

    const targetOptions = [
        { value: 'open', label: 'Open Result' },
        { value: 'close', label: 'Close Result' },
    ]

    const estimatedPayout = Math.round(data.totalCollection * payoutSlider / 100)
    const estimatedProfit = data.totalCollection - estimatedPayout

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Result Selector</h1>
                    <p className="text-[var(--text-secondary)]">
                        Select optimal result for maximum profit control
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchRecommendations}
                        className="btn btn-secondary flex items-center gap-2"
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid md:grid-cols-4 gap-4">
                    <Input
                        label="Game Date"
                        type="date"
                        value={gameDate}
                        onChange={(e) => setGameDate(e.target.value)}
                    />
                    <Select
                        label="Session"
                        value={selectedSession}
                        onChange={(e) => setSelectedSession(e.target.value as SessionType)}
                        options={sessionOptions}
                    />
                    <Select
                        label="Target"
                        value={selectedTarget}
                        onChange={(e) => setSelectedTarget(e.target.value as BetTarget)}
                        options={targetOptions}
                    />
                    <div className="flex items-end">
                        {existingSession?.open_triple && selectedTarget === 'open' && (
                            <Badge variant="success">Open Declared: {existingSession.open_triple}</Badge>
                        )}
                        {existingSession?.close_triple && selectedTarget === 'close' && (
                            <Badge variant="success">Close Declared: {existingSession.close_triple}</Badge>
                        )}
                    </div>
                </div>
            </Card>

            {/* Current Stats */}
            <div className="grid md:grid-cols-4 gap-4">
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Total Collection</p>
                    <p className="text-2xl font-bold text-[var(--accent-cyan)]">
                        ₹{data.totalCollection.toLocaleString()}
                    </p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Target Match Options</p>
                    <p className="text-2xl font-bold">{data.targetMatch.length}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">High Profit Options</p>
                    <p className="text-2xl font-bold">{data.systemRecommendations.length}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Zero Liability</p>
                    <p className="text-2xl font-bold text-[var(--status-success)]">{data.noBets.length}</p>
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
                                ₹{estimatedPayout.toLocaleString()}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-[var(--text-muted)]">Estimated Profit</p>
                            <p className="text-xl font-bold text-[var(--status-success)]">
                                ₹{estimatedProfit.toLocaleString()} ({100 - payoutSlider}%)
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {loading ? (
                <div className="py-12 flex justify-center">
                    <LoadingSpinner size="lg" />
                </div>
            ) : (
                <>
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
                                results={data.targetMatch}
                                onSelect={handleSelectResult}
                                totalCollection={data.totalCollection}
                                emptyMessage="No matches at this payout level"
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
                                results={data.systemRecommendations}
                                onSelect={handleSelectResult}
                                totalCollection={data.totalCollection}
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
                                results={data.lowBets}
                                onSelect={handleSelectResult}
                                totalCollection={data.totalCollection}
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
                                results={data.noBets}
                                onSelect={handleSelectResult}
                                totalCollection={data.totalCollection}
                                highlight="ghost"
                            />
                        </Card>
                    </div>
                </>
            )}

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
                            <p className="text-xs text-[var(--text-muted)] mb-2">
                                DECLARING {selectedSession.toUpperCase()} {selectedTarget.toUpperCase()} RESULT
                            </p>
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
                                    ₹{Math.round(data.totalCollection - selectedResult.totalLiability).toLocaleString()}
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
    totalCollection: number
    highlight?: 'profit' | 'ghost'
    emptyMessage?: string
}

function ResultListTable({ results, onSelect, totalCollection, highlight, emptyMessage }: ResultListTableProps) {
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
