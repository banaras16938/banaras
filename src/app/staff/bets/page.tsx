'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { GameType, BetType, PAYOUT_MULTIPLIERS } from '@/types/types'
import { Check, AlertCircle } from 'lucide-react'

const gameTypes: { value: GameType; label: string; range: string }[] = [
    { value: 'single', label: 'Single', range: '0-9' },
    { value: 'double', label: 'Jodi (Double)', range: '00-99' },
    { value: 'triple', label: 'Triple (Patti)', range: '000-999' },
]

const betTypes: { value: BetType; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'close', label: 'Close' },
    { value: 'jodi', label: 'Jodi' },
]

export default function PlaceBetPage() {
    const [gameType, setGameType] = useState<GameType>('single')
    const [betType, setBetType] = useState<BetType>('open')
    const [number, setNumber] = useState('')
    const [amount, setAmount] = useState('')
    const [userIdentifier, setUserIdentifier] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [error, setError] = useState('')

    const maxDigits = gameType === 'single' ? 1 : gameType === 'double' ? 2 : 3
    const payout = amount ? Number(amount) * PAYOUT_MULTIPLIERS[gameType] : 0

    const validateNumber = (value: string): boolean => {
        if (value.length !== maxDigits) return false
        return /^\d+$/.test(value)
    }

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, maxDigits)
        setNumber(value)
        setError('')
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateNumber(number)) {
            setError(`Please enter a valid ${maxDigits}-digit number`)
            return
        }

        if (!amount || Number(amount) <= 0) {
            setError('Please enter a valid bet amount')
            return
        }

        if (!userIdentifier.trim()) {
            setError('Please enter user identifier')
            return
        }

        setShowConfirmModal(true)
    }

    const confirmBet = async () => {
        setIsSubmitting(true)
        setShowConfirmModal(false)

        try {
            // TODO: Submit bet to Supabase
            await new Promise(resolve => setTimeout(resolve, 1000))

            setShowSuccessModal(true)
            // Reset form
            setNumber('')
            setAmount('')
            setUserIdentifier('')
        } catch {
            setError('Failed to place bet. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            <Card>
                <CardHeader
                    title="Place New Bet"
                    subtitle="Enter bet details on behalf of user"
                />

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-[var(--status-error)] text-sm">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    {/* Game Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                            Game Type
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {gameTypes.map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => {
                                        setGameType(type.value)
                                        setNumber('')
                                    }}
                                    className={`p-4 rounded-xl border transition-all text-center ${gameType === type.value
                                            ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/10'
                                            : 'border-[var(--glass-border)] hover:border-[var(--primary-500)]/50'
                                        }`}
                                >
                                    <p className="font-semibold">{type.label}</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">{type.range}</p>
                                    <Badge variant="info" className="mt-2">
                                        {PAYOUT_MULTIPLIERS[type.value]}x
                                    </Badge>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bet Type Selection */}
                    <Select
                        label="Bet Type"
                        value={betType}
                        onChange={(e) => setBetType(e.target.value as BetType)}
                        options={betTypes}
                    />

                    {/* Number Input */}
                    <div>
                        <Input
                            label={`Enter ${gameType === 'single' ? 'Single' : gameType === 'double' ? 'Jodi' : 'Triple'} Number`}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder={gameType === 'single' ? '0' : gameType === 'double' ? '00' : '000'}
                            value={number}
                            onChange={handleNumberChange}
                            helperText={`Enter a ${maxDigits}-digit number (${gameTypes.find(t => t.value === gameType)?.range})`}
                        />
                    </div>

                    {/* Amount Input */}
                    <div>
                        <Input
                            label="Bet Amount (₹)"
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

                    {/* User Identifier */}
                    <Input
                        label="User Identifier"
                        type="text"
                        placeholder="e.g., User #1234 or Phone Number"
                        value={userIdentifier}
                        onChange={(e) => setUserIdentifier(e.target.value)}
                    />

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
                            <span className="text-[var(--text-muted)]">Game Type:</span>
                            <span className="font-medium">{gameTypes.find(t => t.value === gameType)?.label}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Bet Type:</span>
                            <span className="font-medium capitalize">{betType}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Number:</span>
                            <span className="font-mono font-bold text-[var(--accent-cyan)]">{number}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Amount:</span>
                            <span className="font-medium">₹{Number(amount).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">User:</span>
                            <span className="font-medium">{userIdentifier}</span>
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
                        The bet has been successfully recorded.
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
