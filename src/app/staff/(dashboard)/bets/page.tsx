'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { BetCategory, BetTarget, SessionType, PAYOUT_MULTIPLIERS } from '@/types/types'
import { Check, Search, Plus, User } from 'lucide-react'
import { toast } from 'sonner'

interface Player {
    id: string
    name: string
    phone: string | null
}

const betCategories: { value: BetCategory; label: string; range: string }[] = [
    { value: 'single', label: 'Single', range: '0-9' },
    { value: 'jodi', label: 'Jodi', range: '00-99' },
    { value: 'triple', label: 'Triple (Patti)', range: '000-999' },
]

const betTargets: { value: BetTarget; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'close', label: 'Close' },
    { value: 'jodi_full', label: 'Jodi (Full Day)' },
]

const sessions: { value: SessionType; label: string }[] = [
    { value: 'morning', label: 'Morning Game' },
    { value: 'night', label: 'Night Game' },
]

const quickAmounts = [50, 100, 200, 500, 1000, 2000]

export default function PlaceBetPage() {
    const [sessionName, setSessionName] = useState<SessionType>('morning')
    const [category, setCategory] = useState<BetCategory>('single')
    const [target, setTarget] = useState<BetTarget>('open')
    const [number, setNumber] = useState('')
    const [amount, setAmount] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    // Player selection
    const [players, setPlayers] = useState<Player[]>([])
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
    const [playerSearch, setPlayerSearch] = useState('')
    const [showPlayerModal, setShowPlayerModal] = useState(false)
    const [showNewPlayerForm, setShowNewPlayerForm] = useState(false)
    const [newPlayerName, setNewPlayerName] = useState('')
    const [newPlayerPhone, setNewPlayerPhone] = useState('')
    const [loadingPlayers, setLoadingPlayers] = useState(false)

    const maxDigits = category === 'single' ? 1 : category === 'jodi' ? 2 : 3
    const payout = amount ? Number(amount) * PAYOUT_MULTIPLIERS[category] : 0

    // Fetch players
    const fetchPlayers = useCallback(async (search?: string) => {
        setLoadingPlayers(true)
        try {
            const params = new URLSearchParams()
            if (search) params.append('search', search)

            const response = await fetch(`/api/players?${params.toString()}`)
            const data = await response.json()

            if (response.ok) {
                setPlayers(data.players || [])
            }
        } catch (error) {
            console.error('Failed to fetch players:', error)
        } finally {
            setLoadingPlayers(false)
        }
    }, [])

    useEffect(() => {
        fetchPlayers()
    }, [fetchPlayers])

    // Search players with debounce
    useEffect(() => {
        const debounce = setTimeout(() => {
            if (showPlayerModal) {
                fetchPlayers(playerSearch)
            }
        }, 300)
        return () => clearTimeout(debounce)
    }, [playerSearch, showPlayerModal, fetchPlayers])

    // Auto-set target when category changes
    const handleCategoryChange = (newCategory: BetCategory) => {
        setCategory(newCategory)
        setNumber('')
        // Jodi must use jodi_full target
        if (newCategory === 'jodi') {
            setTarget('jodi_full')
        } else if (target === 'jodi_full') {
            setTarget('open')
        }
    }

    const validateNumber = (value: string): boolean => {
        if (value.length !== maxDigits) return false
        return /^\d+$/.test(value)
    }

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, maxDigits)
        setNumber(value)
    }

    const handleSelectPlayer = (player: Player) => {
        setSelectedPlayer(player)
        setShowPlayerModal(false)
        setPlayerSearch('')
    }

    const handleAddNewPlayer = async () => {
        if (!newPlayerName.trim()) {
            toast.error('Player name is required')
            return
        }

        setIsSubmitting(true)
        try {
            const response = await fetch('/api/players', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newPlayerName.trim(),
                    phone: newPlayerPhone.trim() || null
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to add player')
            }

            // Select the new player
            setSelectedPlayer(data.player)
            setShowPlayerModal(false)
            setShowNewPlayerForm(false)
            setNewPlayerName('')
            setNewPlayerPhone('')
            fetchPlayers()
            toast.success('Player added and selected')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to add player')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedPlayer) {
            toast.error('Please select a player')
            return
        }

        if (!validateNumber(number)) {
            toast.error(`Please enter a valid ${maxDigits}-digit number`)
            return
        }

        if (!amount || Number(amount) <= 0) {
            toast.error('Please enter a valid bet amount')
            return
        }

        setShowConfirmModal(true)
    }

    const confirmBet = async () => {
        if (!selectedPlayer) return

        setIsSubmitting(true)
        setShowConfirmModal(false)

        try {
            const today = new Date().toISOString().split('T')[0]

            const response = await fetch('/api/bets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameDate: today,
                    sessionName: sessionName,
                    category: category,
                    target: target,
                    selectedNumber: number.padStart(maxDigits, '0'),
                    amount: Number(amount),
                    playerId: selectedPlayer.id
                })
            })

            const data = await response.json()

            if (!response.ok) {
                toast.error(data.error || 'Failed to place bet')
                return
            }

            toast.success('Bet placed successfully!')
            setShowSuccessModal(true)
            // Reset form (keep session, category, and player)
            setNumber('')
            setAmount('')
        } catch {
            toast.error('Failed to place bet. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            <Card>
                <CardHeader
                    title="Place New Bet"
                    subtitle="Enter bet details on behalf of player"
                />

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Player Selection */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                            Select Player
                        </label>
                        <button
                            type="button"
                            onClick={() => setShowPlayerModal(true)}
                            className={`w-full p-4 rounded-xl border transition-all text-left flex items-center gap-3 ${selectedPlayer
                                    ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/10'
                                    : 'border-[var(--glass-border)] hover:border-[var(--primary-500)]/50'
                                }`}
                        >
                            <div className="w-10 h-10 rounded-lg bg-[var(--primary-500)]/20 flex items-center justify-center">
                                <User size={20} className="text-[var(--primary-400)]" />
                            </div>
                            <div className="flex-1">
                                {selectedPlayer ? (
                                    <>
                                        <p className="font-medium">{selectedPlayer.name}</p>
                                        {selectedPlayer.phone && (
                                            <p className="text-xs text-[var(--text-muted)]">{selectedPlayer.phone}</p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-[var(--text-muted)]">Click to select a player</p>
                                )}
                            </div>
                            <Badge variant="info">Select</Badge>
                        </button>
                    </div>

                    {/* Bet Category Selection */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                            Bet Category
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {betCategories.map((cat) => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => handleCategoryChange(cat.value)}
                                    className={`p-4 rounded-xl border transition-all text-center ${category === cat.value
                                        ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/10'
                                        : 'border-[var(--glass-border)] hover:border-[var(--primary-500)]/50'
                                        }`}
                                >
                                    <p className="font-semibold">{cat.label}</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">{cat.range}</p>
                                    <Badge variant="info" className="mt-2">
                                        {PAYOUT_MULTIPLIERS[cat.value]}x
                                    </Badge>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Session Selection */}
                    <Select
                        label="Game Session"
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value as SessionType)}
                        options={sessions}
                    />

                    {/* Bet Target Selection */}
                    {category !== 'jodi' && (
                        <Select
                            label="Bet Target"
                            value={target}
                            onChange={(e) => setTarget(e.target.value as BetTarget)}
                            options={betTargets.filter(t => t.value !== 'jodi_full')}
                        />
                    )}

                    {/* Number Input */}
                    <div>
                        <Input
                            label={`Enter ${category === 'single' ? 'Single' : category === 'jodi' ? 'Jodi' : 'Triple'} Number`}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder={category === 'single' ? '0' : category === 'jodi' ? '00' : '000'}
                            value={number}
                            onChange={handleNumberChange}
                            helperText={`Enter a ${maxDigits}-digit number (${betCategories.find(c => c.value === category)?.range})`}
                        />
                    </div>

                    {/* Amount Input with Quick Amounts */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Bet Amount (₹)
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {quickAmounts.map((amt) => (
                                <button
                                    key={amt}
                                    type="button"
                                    onClick={() => setAmount(amt.toString())}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${amount === amt.toString()
                                            ? 'bg-[var(--primary-500)] text-white'
                                            : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)]'
                                        }`}
                                >
                                    ₹{amt}
                                </button>
                            ))}
                        </div>
                        <Input
                            type="number"
                            min="10"
                            step="10"
                            placeholder="Enter amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        {amount && Number(amount) > 0 && (
                            <div className="mt-2 p-3 rounded-lg bg-[var(--status-success)]/10 border border-[var(--status-success)]/30">
                                <p className="text-sm text-[var(--status-success)]">
                                    Potential Payout: <span className="font-bold">₹{payout.toLocaleString()}</span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        isLoading={isSubmitting}
                    >
                        Place Bet
                    </Button>
                </form>
            </Card>

            {/* Player Selection Modal */}
            <Modal
                isOpen={showPlayerModal}
                onClose={() => {
                    setShowPlayerModal(false)
                    setPlayerSearch('')
                    setShowNewPlayerForm(false)
                }}
                title="Select Player"
            >
                <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <Input
                            placeholder="Search players..."
                            value={playerSearch}
                            onChange={(e) => setPlayerSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Player List */}
                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {loadingPlayers ? (
                            <div className="py-4 text-center text-[var(--text-muted)]">Loading...</div>
                        ) : players.length === 0 ? (
                            <div className="py-4 text-center text-[var(--text-muted)]">
                                {playerSearch ? 'No players found' : 'No players yet'}
                            </div>
                        ) : (
                            players.map((player) => (
                                <button
                                    key={player.id}
                                    type="button"
                                    onClick={() => handleSelectPlayer(player)}
                                    className={`w-full p-3 rounded-lg text-left flex items-center gap-3 transition-colors ${selectedPlayer?.id === player.id
                                            ? 'bg-[var(--primary-500)]/20 border border-[var(--primary-500)]'
                                            : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)]'
                                        }`}
                                >
                                    <User size={18} className="text-[var(--primary-400)]" />
                                    <div className="flex-1">
                                        <p className="font-medium">{player.name}</p>
                                        {player.phone && (
                                            <p className="text-xs text-[var(--text-muted)]">{player.phone}</p>
                                        )}
                                    </div>
                                    {selectedPlayer?.id === player.id && (
                                        <Check size={18} className="text-[var(--primary-400)]" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    {/* Add New Player */}
                    {!showNewPlayerForm ? (
                        <button
                            type="button"
                            onClick={() => setShowNewPlayerForm(true)}
                            className="w-full p-3 rounded-lg border border-dashed border-[var(--glass-border)] hover:border-[var(--primary-500)] text-[var(--text-muted)] hover:text-[var(--primary-400)] flex items-center justify-center gap-2 transition-colors"
                        >
                            <Plus size={18} />
                            Add New Player
                        </button>
                    ) : (
                        <div className="p-4 rounded-lg bg-[var(--bg-surface)] space-y-3">
                            <p className="font-medium text-sm">New Player</p>
                            <Input
                                placeholder="Player name"
                                value={newPlayerName}
                                onChange={(e) => setNewPlayerName(e.target.value)}
                            />
                            <Input
                                placeholder="Phone (optional)"
                                type="tel"
                                value={newPlayerPhone}
                                onChange={(e) => setNewPlayerPhone(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        setShowNewPlayerForm(false)
                                        setNewPlayerName('')
                                        setNewPlayerPhone('')
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleAddNewPlayer}
                                    isLoading={isSubmitting}
                                >
                                    Add & Select
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Confirmation Modal */}
            <Modal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="Confirm Bet"
            >
                <div className="space-y-4">
                    <p className="text-[var(--text-secondary)]">
                        Please confirm the following bet details:
                    </p>

                    <div className="p-4 rounded-lg bg-[var(--bg-surface)] space-y-2">
                        <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Player:</span>
                            <span className="font-medium">{selectedPlayer?.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Category:</span>
                            <span className="font-medium">{betCategories.find(c => c.value === category)?.label}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Session:</span>
                            <span className="font-medium capitalize">{sessionName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Target:</span>
                            <span className="font-medium capitalize">{betTargets.find(t => t.value === target)?.label}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Number:</span>
                            <span className="font-mono font-bold text-[var(--accent-cyan)]">{number}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Amount:</span>
                            <span className="font-medium">₹{Number(amount).toLocaleString()}</span>
                        </div>
                        <div className="pt-2 border-t border-[var(--glass-border)] flex justify-between">
                            <span className="text-[var(--text-muted)]">Potential Payout:</span>
                            <span className="font-bold text-[var(--status-success)]">₹{payout.toLocaleString()}</span>
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
                            variant="primary"
                            className="flex-1"
                            onClick={confirmBet}
                            isLoading={isSubmitting}
                        >
                            Confirm Bet
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Success Modal */}
            <Modal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="Bet Placed Successfully"
            >
                <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-[var(--status-success)]/20 flex items-center justify-center mx-auto mb-4">
                        <Check size={32} className="text-[var(--status-success)]" />
                    </div>
                    <p className="text-[var(--text-secondary)]">
                        The bet has been successfully recorded for <strong>{selectedPlayer?.name}</strong>.
                    </p>
                    <Button
                        className="mt-6"
                        onClick={() => setShowSuccessModal(false)}
                    >
                        Place Another Bet
                    </Button>
                </div>
            </Modal>
        </div>
    )
}
