'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '@/components/ui'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { BetCategory, BetTarget, SessionType, PAYOUT_MULTIPLIERS } from '@/types/types'
import { Check, Search, Plus, User, Trash2, ShoppingCart, Clock, AlertTriangle, CalendarX } from 'lucide-react'
import { toast } from 'sonner'
import { useSchedules, formatScheduleTime } from '@/hooks/useSchedules'
import { createClient } from '@/utils/supabase/client'

interface Player {
    id: string
    name: string
    phone: string | null
}

interface CartItem {
    id: string
    category: BetCategory
    target: BetTarget
    number: string
    amount: number
}

interface BettingStatus {
    openBetting: boolean
    closeBetting: boolean
    jodiBetting: boolean
    openMessage: string
    closeMessage: string
}

const quickAmounts = [10, 20, 50, 100, 200, 500]

// Helper to compare times (HH:MM format)
function timeToMinutes(timeStr: string): number {
    const parts = timeStr.split(':').map(Number)
    return parts[0] * 60 + parts[1]
}

export default function PlaceBetPage() {
    // Player & Session
    const [players, setPlayers] = useState<Player[]>([])
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
    const [playerSearch, setPlayerSearch] = useState('')
    const [showPlayerModal, setShowPlayerModal] = useState(false)
    const [showNewPlayerForm, setShowNewPlayerForm] = useState(false)
    const [newPlayerName, setNewPlayerName] = useState('')
    const [newPlayerPhone, setNewPlayerPhone] = useState('')
    const [loadingPlayers, setLoadingPlayers] = useState(false)

    const [sessionName, setSessionName] = useState<SessionType>('morning')

    // Category Tab
    const [activeTab, setActiveTab] = useState<BetCategory>('single')

    // Bet Input
    const [target, setTarget] = useState<BetTarget>('open')
    const [number, setNumber] = useState('')
    const [amount, setAmount] = useState('')

    // Cart
    const [cart, setCart] = useState<CartItem[]>([])

    // Submission
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)

    // Time & Schedule
    const { schedules, getScheduleForSession, isLoading: schedulesLoading } = useSchedules()
    const [currentTime, setCurrentTime] = useState(() => {
        const now = new Date()
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    })

    // Holiday check
    const [isHoliday, setIsHoliday] = useState(false)
    const [holidayDesc, setHolidayDesc] = useState('')
    const [holidayLoading, setHolidayLoading] = useState(true)

    // Check for holiday on mount
    useEffect(() => {
        async function checkHoliday() {
            setHolidayLoading(true)
            try {
                const supabase = createClient()
                const today = new Date().toISOString().split('T')[0]
                const { data } = await supabase
                    .from('holidays')
                    .select('*')
                    .eq('holiday_date', today)
                    .single()

                if (data) {
                    setIsHoliday(true)
                    setHolidayDesc(data.description || 'Holiday')
                }
            } catch {
                // No holiday or error - betting allowed
            } finally {
                setHolidayLoading(false)
            }
        }
        checkHoliday()
    }, [])

    // Update current time every minute
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date()
            setCurrentTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
        }, 30000) // Check every 30 seconds for more accurate updates
        return () => clearInterval(interval)
    }, [])

    // Calculate betting status for current session based on DB logic
    const bettingStatus = useMemo((): BettingStatus => {
        const schedule = getScheduleForSession(sessionName)

        if (!schedule || isHoliday) {
            return {
                openBetting: false,
                closeBetting: false,
                jodiBetting: false,
                openMessage: isHoliday ? `Holiday: ${holidayDesc}` : 'Schedule not available',
                closeMessage: isHoliday ? `Holiday: ${holidayDesc}` : 'Schedule not available'
            }
        }

        const now = timeToMinutes(currentTime)
        const startTime = timeToMinutes(schedule.start_time)
        const openFreezeTime = timeToMinutes(schedule.open_bet_freeze_time)
        const openResultTime = timeToMinutes(schedule.open_result_time)
        const closeFreezeTime = timeToMinutes(schedule.close_bet_freeze_time)

        // Open/Jodi betting: start_time <= current < open_bet_freeze_time
        const openBetting = now >= startTime && now < openFreezeTime

        // Close betting: start_time <= current < close_bet_freeze_time
        // BUT NOT during open_bet_freeze_time to open_result_time (result calculation window)
        const inResultWindow = now >= openFreezeTime && now < openResultTime
        const closeBetting = (now >= startTime && now < closeFreezeTime) && !inResultWindow

        // Jodi betting follows Open timing
        const jodiBetting = openBetting

        const openMessage = openBetting
            ? `Open until ${formatScheduleTime(schedule.open_bet_freeze_time)}`
            : now < startTime
                ? `Opens at ${formatScheduleTime(schedule.start_time)}`
                : `Closed at ${formatScheduleTime(schedule.open_bet_freeze_time)}`

        let closeMessage = ''
        if (closeBetting) {
            closeMessage = `Open until ${formatScheduleTime(schedule.close_bet_freeze_time)}`
        } else if (inResultWindow) {
            closeMessage = 'Paused (Open result calculation)'
        } else if (now < startTime) {
            closeMessage = `Opens at ${formatScheduleTime(schedule.start_time)}`
        } else {
            closeMessage = `Closed at ${formatScheduleTime(schedule.close_bet_freeze_time)}`
        }

        return {
            openBetting,
            closeBetting,
            jodiBetting,
            openMessage,
            closeMessage
        }
    }, [sessionName, currentTime, getScheduleForSession, isHoliday, holidayDesc])

    // Check if current bet type is allowed
    const canPlaceBet = useMemo(() => {
        if (isHoliday) return false
        if (activeTab === 'jodi') {
            return bettingStatus.jodiBetting
        }
        return target === 'open' ? bettingStatus.openBetting : bettingStatus.closeBetting
    }, [activeTab, target, bettingStatus, isHoliday])

    const maxDigits = activeTab === 'single' ? 1 : activeTab === 'jodi' ? 2 : 3
    const categoryLabel = activeTab === 'single' ? 'Single' : activeTab === 'jodi' ? 'Jodi' : 'Triple'

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

    useEffect(() => {
        const debounce = setTimeout(() => {
            if (showPlayerModal) {
                fetchPlayers(playerSearch)
            }
        }, 300)
        return () => clearTimeout(debounce)
    }, [playerSearch, showPlayerModal, fetchPlayers])

    // Reset number when tab changes, auto-select available target
    useEffect(() => {
        setNumber('')
        if (activeTab === 'jodi') {
            setTarget('jodi_full')
        } else {
            // Auto-select an available target
            if (bettingStatus.openBetting) {
                setTarget('open')
            } else if (bettingStatus.closeBetting) {
                setTarget('close')
            } else {
                setTarget('open')
            }
        }
    }, [activeTab, bettingStatus.openBetting, bettingStatus.closeBetting])

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
            setSelectedPlayer(data.player)
            setShowPlayerModal(false)
            setShowNewPlayerForm(false)
            setNewPlayerName('')
            setNewPlayerPhone('')
            fetchPlayers()
            toast.success('Player added')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to add player')
        } finally {
            setIsSubmitting(false)
        }
    }

    const addToCart = () => {
        if (!canPlaceBet) {
            toast.error('Betting is closed for this type')
            return
        }
        if (number.length !== maxDigits) {
            toast.error(`Enter a ${maxDigits}-digit number`)
            return
        }
        if (!amount || Number(amount) <= 0) {
            toast.error('Enter a valid amount')
            return
        }

        const betTarget = activeTab === 'jodi' ? 'jodi_full' : target

        const newItem: CartItem = {
            id: `${Date.now()}-${Math.random()}`,
            category: activeTab,
            target: betTarget,
            number: number.padStart(maxDigits, '0'),
            amount: Number(amount)
        }

        setCart([...cart, newItem])
        setNumber('')
        setAmount('')
        toast.success(`Added ${categoryLabel} ${newItem.number}`)
    }

    const removeFromCart = (id: string) => {
        setCart(cart.filter(item => item.id !== id))
    }

    const clearCart = () => {
        setCart([])
    }

    const cartTotal = cart.reduce((sum, item) => sum + item.amount, 0)

    const handleSubmitAll = () => {
        if (!selectedPlayer) {
            toast.error('Please select a player')
            return
        }
        if (cart.length === 0) {
            toast.error('Add at least one bet to submit')
            return
        }
        setShowConfirmModal(true)
    }

    const confirmSubmitAll = async () => {
        if (!selectedPlayer || cart.length === 0) return

        setIsSubmitting(true)
        setShowConfirmModal(false)

        const today = new Date().toISOString().split('T')[0]
        let successCount = 0
        let failCount = 0
        let lastError = ''

        for (const item of cart) {
            try {
                const response = await fetch('/api/bets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gameDate: today,
                        sessionName: sessionName,
                        category: item.category,
                        target: item.target,
                        selectedNumber: item.number,
                        amount: item.amount,
                        playerId: selectedPlayer.id
                    })
                })

                const data = await response.json()

                if (response.ok) {
                    successCount++
                } else {
                    failCount++
                    lastError = data.error || 'Unknown error'
                }
            } catch {
                failCount++
                lastError = 'Network error'
            }
        }

        setIsSubmitting(false)

        if (failCount === 0) {
            toast.success(`All ${successCount} bets placed successfully!`)
            clearCart()
        } else if (successCount > 0) {
            toast.warning(`${successCount} placed, ${failCount} failed: ${lastError}`)
            clearCart()
        } else {
            toast.error(`Failed: ${lastError}`)
        }
    }

    // Loading state
    if (schedulesLoading || holidayLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    // Holiday block
    if (isHoliday) {
        return (
            <div className="max-w-lg mx-auto animate-fade-in">
                <Card className="!bg-red-900/30 !border-red-700">
                    <div className="p-8 text-center">
                        <CalendarX size={64} className="mx-auto text-red-400 mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Betting Closed Today</h2>
                        <p className="text-gray-300 mb-2">Today is a holiday</p>
                        <p className="text-red-400 font-medium">{holidayDesc}</p>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Betting Status Banner */}
            <div className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-xl p-3">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-gray-400" />
                        <span className="text-white font-mono">{currentTime}</span>
                    </div>
                    <span className="text-gray-600">|</span>
                    <div className="flex items-center gap-4">
                        <span className={`flex items-center gap-1 ${bettingStatus.openBetting ? 'text-green-400' : 'text-red-400'}`}>
                            <span className={`w-2 h-2 rounded-full ${bettingStatus.openBetting ? 'bg-green-400' : 'bg-red-400'}`}></span>
                            Open: {bettingStatus.openBetting ? 'Active' : 'Closed'}
                        </span>
                        <span className={`flex items-center gap-1 ${bettingStatus.closeBetting ? 'text-green-400' : 'text-red-400'}`}>
                            <span className={`w-2 h-2 rounded-full ${bettingStatus.closeBetting ? 'bg-green-400' : 'bg-red-400'}`}></span>
                            Close: {bettingStatus.closeBetting ? 'Active' : 'Closed'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Header: Player & Session */}
            <div className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-xl p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Player Selection */}
                    <button
                        type="button"
                        onClick={() => setShowPlayerModal(true)}
                        className={`flex-1 p-3 rounded-xl border transition-all text-left flex items-center gap-3 ${selectedPlayer
                                ? 'border-indigo-500 bg-indigo-500/10'
                                : 'border-gray-600 hover:border-indigo-500/50'
                            }`}
                    >
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                            <User size={20} className="text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            {selectedPlayer ? (
                                <>
                                    <p className="font-medium text-white truncate">{selectedPlayer.name}</p>
                                    {selectedPlayer.phone && (
                                        <p className="text-xs text-gray-400">{selectedPlayer.phone}</p>
                                    )}
                                </>
                            ) : (
                                <p className="text-gray-400">Select Player</p>
                            )}
                        </div>
                    </button>

                    {/* Session Toggle */}
                    <div className="flex rounded-xl overflow-hidden border border-gray-600">
                        <button
                            type="button"
                            onClick={() => setSessionName('morning')}
                            className={`px-6 py-3 font-medium transition-all ${sessionName === 'morning'
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            Morning
                        </button>
                        <button
                            type="button"
                            onClick={() => setSessionName('night')}
                            className={`px-6 py-3 font-medium transition-all ${sessionName === 'night'
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            Night
                        </button>
                    </div>
                </div>
            </div>

            {/* Category Tabs */}
            <div className="flex rounded-xl overflow-hidden border border-gray-700">
                {(['single', 'jodi', 'triple'] as BetCategory[]).map((cat) => {
                    const isDisabled = cat === 'jodi' ? !bettingStatus.jodiBetting : (!bettingStatus.openBetting && !bettingStatus.closeBetting)
                    return (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => !isDisabled && setActiveTab(cat)}
                            className={`flex-1 py-4 font-semibold text-center transition-all relative ${activeTab === cat
                                    ? isDisabled
                                        ? 'bg-gray-700 text-gray-400'
                                        : 'bg-indigo-500 text-white'
                                    : isDisabled
                                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            {cat === 'single' ? 'Single' : cat === 'jodi' ? 'Jodi' : 'Triple'}
                            <span className="block text-xs mt-1 opacity-75">
                                {PAYOUT_MULTIPLIERS[cat]}x
                            </span>
                            {isDisabled && (
                                <span className="absolute top-1 right-2 text-red-400">
                                    <AlertTriangle size={14} />
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Warning if betting closed */}
            {!canPlaceBet && (
                <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
                    <div>
                        <p className="text-red-400 font-medium">Betting Closed</p>
                        <p className="text-sm text-gray-400">
                            {activeTab === 'jodi'
                                ? bettingStatus.openMessage
                                : target === 'open'
                                    ? bettingStatus.openMessage
                                    : bettingStatus.closeMessage
                            }
                        </p>
                    </div>
                </div>
            )}

            {/* Bet Entry Form */}
            <Card className="!bg-gray-800/80 !border-gray-700">
                <div className="p-4 space-y-4">
                    {/* Target (only for Single/Triple) */}
                    {activeTab !== 'jodi' && (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => bettingStatus.openBetting && setTarget('open')}
                                disabled={!bettingStatus.openBetting}
                                className={`flex-1 py-3 rounded-lg font-medium transition-all ${!bettingStatus.openBetting
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : target === 'open'
                                            ? 'bg-cyan-500 text-white'
                                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                    }`}
                            >
                                <div>Open</div>
                                {!bettingStatus.openBetting && <div className="text-xs text-red-400">Closed</div>}
                            </button>
                            <button
                                type="button"
                                onClick={() => bettingStatus.closeBetting && setTarget('close')}
                                disabled={!bettingStatus.closeBetting}
                                className={`flex-1 py-3 rounded-lg font-medium transition-all ${!bettingStatus.closeBetting
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : target === 'close'
                                            ? 'bg-pink-500 text-white'
                                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                    }`}
                            >
                                <div>Close</div>
                                {!bettingStatus.closeBetting && <div className="text-xs text-red-400">Closed</div>}
                            </button>
                        </div>
                    )}

                    {/* Number & Amount in Row */}
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-sm text-gray-400 mb-1">Number</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder={activeTab === 'single' ? '0' : activeTab === 'jodi' ? '00' : '000'}
                                value={number}
                                onChange={handleNumberChange}
                                disabled={!canPlaceBet}
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-center text-2xl font-mono focus:border-indigo-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm text-gray-400 mb-1">Points</label>
                            <input
                                type="number"
                                min="10"
                                placeholder="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                disabled={!canPlaceBet}
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-center text-2xl font-mono focus:border-indigo-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="flex flex-wrap gap-2">
                        {quickAmounts.map((amt) => (
                            <button
                                key={amt}
                                type="button"
                                onClick={() => setAmount(amt.toString())}
                                disabled={!canPlaceBet}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!canPlaceBet
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : amount === amt.toString()
                                            ? 'bg-indigo-500 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                {amt}
                            </button>
                        ))}
                    </div>

                    {/* Add Button */}
                    <Button
                        type="button"
                        className="w-full"
                        onClick={addToCart}
                        disabled={!canPlaceBet || !number || !amount}
                    >
                        <Plus size={18} />
                        Add to Cart
                    </Button>
                </div>
            </Card>

            {/* Cart */}
            {cart.length > 0 && (
                <Card className="!bg-gray-800/80 !border-gray-700">
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <ShoppingCart size={18} />
                                Cart ({cart.length} bets)
                            </h3>
                            <button
                                type="button"
                                onClick={clearCart}
                                className="text-sm text-red-400 hover:text-red-300"
                            >
                                Clear All
                            </button>
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {cart.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded font-semibold uppercase">
                                            {item.category}
                                        </span>
                                        <span className="font-mono text-lg text-white">{item.number}</span>
                                        <span className="text-gray-400 text-xs uppercase">{item.target}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium text-white">{item.amount} pts</span>
                                        <button
                                            type="button"
                                            onClick={() => removeFromCart(item.id)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-gray-400">Total Points:</span>
                                <span className="text-xl font-bold text-white">{cartTotal}</span>
                            </div>
                            <Button
                                type="button"
                                className="w-full"
                                onClick={handleSubmitAll}
                                isLoading={isSubmitting}
                            >
                                Submit All Bets
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

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
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={18} />
                        <input
                            placeholder="Search players..."
                            value={playerSearch}
                            onChange={(e) => setPlayerSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                        />
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {loadingPlayers ? (
                            <div className="py-4 text-center text-gray-400">Loading...</div>
                        ) : players.length === 0 ? (
                            <div className="py-4 text-center text-gray-400">
                                {playerSearch ? 'No players found' : 'No players yet'}
                            </div>
                        ) : (
                            players.map((player) => (
                                <button
                                    key={player.id}
                                    type="button"
                                    onClick={() => handleSelectPlayer(player)}
                                    className={`w-full p-3 rounded-lg text-left flex items-center gap-3 transition-colors ${selectedPlayer?.id === player.id
                                            ? 'bg-indigo-500/20 border border-indigo-500'
                                            : 'bg-gray-800 hover:bg-gray-700 border border-transparent'
                                        }`}
                                >
                                    <User size={18} className="text-indigo-400" />
                                    <div className="flex-1">
                                        <p className="font-medium text-white">{player.name}</p>
                                        {player.phone && (
                                            <p className="text-xs text-gray-400">{player.phone}</p>
                                        )}
                                    </div>
                                    {selectedPlayer?.id === player.id && (
                                        <Check size={18} className="text-indigo-400" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    {!showNewPlayerForm ? (
                        <button
                            type="button"
                            onClick={() => setShowNewPlayerForm(true)}
                            className="w-full p-3 rounded-lg border border-dashed border-gray-600 hover:border-indigo-500 text-gray-400 hover:text-indigo-400 flex items-center justify-center gap-2 transition-colors"
                        >
                            <Plus size={18} />
                            Add New Player
                        </button>
                    ) : (
                        <div className="p-4 rounded-lg bg-gray-800 space-y-3">
                            <p className="font-medium text-sm text-white">New Player</p>
                            <input
                                placeholder="Player name"
                                value={newPlayerName}
                                onChange={(e) => setNewPlayerName(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                            />
                            <input
                                placeholder="Phone (optional)"
                                type="tel"
                                value={newPlayerPhone}
                                onChange={(e) => setNewPlayerPhone(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
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

            {/* Confirm Modal */}
            <Modal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="Confirm Submission"
            >
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Submit <strong className="text-white">{cart.length} bets</strong> for{' '}
                        <strong className="text-white">{selectedPlayer?.name}</strong>?
                    </p>
                    <div className="p-4 bg-gray-800 rounded-lg">
                        <div className="flex justify-between text-sm text-gray-400 mb-2">
                            <span>Session:</span>
                            <span className="text-white capitalize">{sessionName}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-400">
                            <span>Total Points:</span>
                            <span className="text-white font-bold">{cartTotal}</span>
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
                            onClick={confirmSubmitAll}
                            isLoading={isSubmitting}
                        >
                            Confirm
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
