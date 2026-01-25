'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '@/components/ui'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { BetCategory, BetTarget, SessionType, PAYOUT_MULTIPLIERS } from '@/types/types'
import { Check, Search, Plus, User, Clock, AlertTriangle, CalendarX, UserCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { useSchedules, formatScheduleTime } from '@/hooks/useSchedules'
import { createClient } from '@/utils/supabase/client'
import { useStaffInfo } from '../layout'

interface Player {
    id: string
    name: string
    phone: string | null
}

interface BettingStatus {
    openBetting: boolean
    closeBetting: boolean
    jodiBetting: boolean
    openMessage: string
    closeMessage: string
}

interface BetItem {
    category: BetCategory
    target: BetTarget
    selectedNumber: string
    amount: number
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
    const [useSelfBet, setUseSelfBet] = useState(true)
    const [playerSearch, setPlayerSearch] = useState('')
    const [showPlayerModal, setShowPlayerModal] = useState(false)
    const [showNewPlayerForm, setShowNewPlayerForm] = useState(false)
    const [newPlayerName, setNewPlayerName] = useState('')
    const [newPlayerPhone, setNewPlayerPhone] = useState('')
    const [loadingPlayers, setLoadingPlayers] = useState(false)

    const staffInfo = useStaffInfo()
    const [sessionName, setSessionName] = useState<SessionType>('morning')
    const [activeTab, setActiveTab] = useState<BetCategory>('single')
    const [target, setTarget] = useState<BetTarget>('open')

    // Single Grid: amounts for each digit 0-9
    const [singleAmounts, setSingleAmounts] = useState<Record<number, string>>(
        Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i, '']))
    )

    // Jodi Selection: selected jodis with their amounts
    const [jodiSelections, setJodiSelections] = useState<Record<string, string>>({})

    // Triple Selection: selected triples with their amounts (like jodi)
    const [tripleSelections, setTripleSelections] = useState<Record<string, string>>({})
    const [tripleNumber, setTripleNumber] = useState('')
    const [tripleAmount, setTripleAmount] = useState('')

    // Submission
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [pendingBets, setPendingBets] = useState<BetItem[]>([])

    // Time & Schedule
    const { getScheduleForSession, isLoading: schedulesLoading } = useSchedules()
    const [currentTime, setCurrentTime] = useState(() => {
        const now = new Date()
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    })

    // Holiday check
    const [isHoliday, setIsHoliday] = useState(false)
    const [holidayDesc, setHolidayDesc] = useState('')
    const [holidayLoading, setHolidayLoading] = useState(true)

    useEffect(() => {
        async function checkHoliday() {
            setHolidayLoading(true)
            try {
                const supabase = createClient()
                const now = new Date()
                const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
                const { data, error } = await supabase
                    .from('holidays')
                    .select('*')
                    .eq('holiday_date', today)
                    .maybeSingle()
                if (data && !error) {
                    setIsHoliday(true)
                    setHolidayDesc(data.description || 'Holiday')
                }
            } catch (err) {
                console.error('Holiday check error:', err)
            } finally {
                setHolidayLoading(false)
            }
        }
        checkHoliday()
    }, [])

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date()
            setCurrentTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
        }, 30000)
        return () => clearInterval(interval)
    }, [])

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
        const openBetting = now >= startTime && now < openFreezeTime
        const inResultWindow = now >= openFreezeTime && now < openResultTime
        const closeBetting = (now >= startTime && now < closeFreezeTime) && !inResultWindow
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
        return { openBetting, closeBetting, jodiBetting, openMessage, closeMessage }
    }, [sessionName, currentTime, getScheduleForSession, isHoliday, holidayDesc])

    const canPlaceBet = useMemo(() => {
        if (isHoliday) return false
        if (activeTab === 'jodi') return bettingStatus.jodiBetting
        return target === 'open' ? bettingStatus.openBetting : bettingStatus.closeBetting
    }, [activeTab, target, bettingStatus, isHoliday])

    // Fetch players
    const fetchPlayers = useCallback(async (search?: string) => {
        setLoadingPlayers(true)
        try {
            const params = new URLSearchParams()
            if (search) params.append('search', search)
            const response = await fetch(`/api/players?${params.toString()}`)
            const data = await response.json()
            if (response.ok) setPlayers(data.players || [])
        } catch (error) {
            console.error('Failed to fetch players:', error)
        } finally {
            setLoadingPlayers(false)
        }
    }, [])

    useEffect(() => { fetchPlayers() }, [fetchPlayers])

    useEffect(() => {
        const debounce = setTimeout(() => {
            if (showPlayerModal) fetchPlayers(playerSearch)
        }, 300)
        return () => clearTimeout(debounce)
    }, [playerSearch, showPlayerModal, fetchPlayers])

    useEffect(() => {
        if (activeTab === 'jodi') {
            setTarget('jodi_full')
        } else {
            if (bettingStatus.openBetting) {
                setTarget('open')
            } else if (bettingStatus.closeBetting) {
                setTarget('close')
            } else {
                setTarget('open')
            }
        }
    }, [activeTab, bettingStatus.openBetting, bettingStatus.closeBetting])

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
                body: JSON.stringify({ name: newPlayerName.trim(), phone: newPlayerPhone.trim() || null })
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to add player')
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

    // === Single Grid ===
    const updateSingleAmount = (digit: number, value: string) => {
        setSingleAmounts(prev => ({ ...prev, [digit]: value }))
    }

    const singleGridTotal = useMemo(() => {
        return Object.values(singleAmounts).reduce((sum, val) => sum + (Number(val) || 0), 0)
    }, [singleAmounts])

    const clearSingleGrid = () => {
        setSingleAmounts(Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i, ''])))
    }

    // === Jodi Selection ===
    const toggleJodiSelection = (jodi: string) => {
        setJodiSelections(prev => {
            if (prev[jodi] !== undefined) {
                const { [jodi]: _, ...rest } = prev
                return rest
            }
            return { ...prev, [jodi]: '' }
        })
    }

    const updateJodiAmount = (jodi: string, value: string) => {
        setJodiSelections(prev => ({ ...prev, [jodi]: value }))
    }

    const removeJodiSelection = (jodi: string) => {
        setJodiSelections(prev => {
            const { [jodi]: _, ...rest } = prev
            return rest
        })
    }

    const jodiSelectionTotal = useMemo(() => {
        return Object.values(jodiSelections).reduce((sum, val) => sum + (Number(val) || 0), 0)
    }, [jodiSelections])

    const clearJodiSelections = () => setJodiSelections({})

    const applyAmountToAllJodis = (amt: number) => {
        setJodiSelections(prev => {
            const updated: Record<string, string> = {}
            Object.keys(prev).forEach(jodi => { updated[jodi] = amt.toString() })
            return updated
        })
    }

    // === Triple Selection ===
    const addTripleToSelection = () => {
        if (tripleNumber.length !== 3) {
            toast.error('Enter a 3-digit number')
            return
        }
        if (!tripleAmount || Number(tripleAmount) < 10) {
            toast.error('Minimum amount is 10')
            return
        }
        if (Number(tripleAmount) % 10 !== 0) {
            toast.error('Amount must be multiple of 10')
            return
        }
        setTripleSelections(prev => ({
            ...prev,
            [tripleNumber.padStart(3, '0')]: tripleAmount
        }))
        setTripleNumber('')
        setTripleAmount('')
    }

    const removeTripleSelection = (triple: string) => {
        setTripleSelections(prev => {
            const { [triple]: _, ...rest } = prev
            return rest
        })
    }

    const tripleSelectionTotal = useMemo(() => {
        return Object.values(tripleSelections).reduce((sum, val) => sum + (Number(val) || 0), 0)
    }, [tripleSelections])

    const clearTripleSelections = () => setTripleSelections({})

    // === Place Bets Functions ===
    const prepareSingleBets = (): BetItem[] => {
        const bets: BetItem[] = []
        Object.entries(singleAmounts).forEach(([digit, amt]) => {
            const numAmt = Number(amt)
            if (numAmt >= 10 && numAmt % 10 === 0) {
                bets.push({
                    category: 'single',
                    target: target,
                    selectedNumber: digit,
                    amount: numAmt
                })
            }
        })
        return bets
    }

    const prepareJodiBets = (): BetItem[] => {
        const bets: BetItem[] = []
        Object.entries(jodiSelections).forEach(([jodi, amt]) => {
            const numAmt = Number(amt)
            if (numAmt >= 10 && numAmt % 10 === 0) {
                bets.push({
                    category: 'jodi',
                    target: 'jodi_full',
                    selectedNumber: jodi.padStart(2, '0'),
                    amount: numAmt
                })
            }
        })
        return bets
    }

    const prepareTripleBets = (): BetItem[] => {
        const bets: BetItem[] = []
        Object.entries(tripleSelections).forEach(([triple, amt]) => {
            const numAmt = Number(amt)
            if (numAmt >= 10 && numAmt % 10 === 0) {
                bets.push({
                    category: 'triple',
                    target: target,
                    selectedNumber: triple.padStart(3, '0'),
                    amount: numAmt
                })
            }
        })
        return bets
    }

    const validateAndShowConfirm = (bets: BetItem[]) => {
        if (!useSelfBet && !selectedPlayer?.id) {
            toast.error('Please select a player')
            return
        }
        if (!canPlaceBet) {
            toast.error('Betting is closed')
            return
        }
        if (bets.length === 0) {
            toast.error('Enter amount for at least one bet (min 10, multiples of 10)')
            return
        }
        // Check for invalid amounts
        const invalidCheck = bets.find(b => b.amount < 10 || b.amount % 10 !== 0)
        if (invalidCheck) {
            toast.error('All amounts must be min 10 and multiples of 10')
            return
        }
        setPendingBets(bets)
        setShowConfirmModal(true)
    }

    const handlePlaceSingleBets = () => validateAndShowConfirm(prepareSingleBets())
    const handlePlaceJodiBets = () => validateAndShowConfirm(prepareJodiBets())
    const handlePlaceTripleBets = () => validateAndShowConfirm(prepareTripleBets())

    const confirmPlaceBets = async () => {
        if (pendingBets.length === 0) return
        setIsSubmitting(true)
        setShowConfirmModal(false)
        const today = new Date().toISOString().split('T')[0]
        try {
            const response = await fetch('/api/bets', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameDate: today,
                    sessionName: sessionName,
                    bets: pendingBets,
                    ...(useSelfBet ? { isSelfBet: true } : { playerId: selectedPlayer?.id })
                })
            })
            const data = await response.json()
            if (response.ok) {
                toast.success(`${data.count || pendingBets.length} bets placed successfully!`)
                // Clear the appropriate form
                if (pendingBets[0]?.category === 'single') clearSingleGrid()
                else if (pendingBets[0]?.category === 'jodi') clearJodiSelections()
                else if (pendingBets[0]?.category === 'triple') clearTripleSelections()
            } else {
                toast.error(`Failed: ${data.error || 'Unknown error'}`)
            }
        } catch {
            toast.error('Network error')
        } finally {
            setIsSubmitting(false)
            setPendingBets([])
        }
    }

    const pendingTotal = pendingBets.reduce((sum, b) => sum + b.amount, 0)

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
                <div className="flex flex-col gap-4">
                    {/* Self-Bet Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900/50 border border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                <UserCheck size={20} className="text-green-400" />
                            </div>
                            <div>
                                <p className="font-medium text-white">Use my name</p>
                                <p className="text-xs text-gray-400">Place bet under: {staffInfo.name}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setUseSelfBet(!useSelfBet)
                                if (!useSelfBet) setSelectedPlayer(null)
                            }}
                            className={`relative w-14 h-7 rounded-full transition-colors ${useSelfBet ? 'bg-green-500' : 'bg-gray-600'}`}
                        >
                            <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${useSelfBet ? 'translate-x-7' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                        {!useSelfBet && (
                            <button
                                type="button"
                                onClick={() => setShowPlayerModal(true)}
                                className={`flex-1 p-3 rounded-xl border transition-all text-left flex items-center gap-3 ${selectedPlayer ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-600 hover:border-indigo-500/50'}`}
                            >
                                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                    <User size={20} className="text-indigo-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    {selectedPlayer ? (
                                        <>
                                            <p className="font-medium text-white truncate">{selectedPlayer.name}</p>
                                            {selectedPlayer.phone && <p className="text-xs text-gray-400">{selectedPlayer.phone}</p>}
                                        </>
                                    ) : (
                                        <p className="text-gray-400">Select Player</p>
                                    )}
                                </div>
                            </button>
                        )}

                        <div className={`flex rounded-xl overflow-hidden border border-gray-600 ${useSelfBet ? 'flex-1' : ''}`}>
                            <button
                                type="button"
                                onClick={() => setSessionName('morning')}
                                className={`flex-1 px-6 py-3 font-medium transition-all ${sessionName === 'morning' ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                            >
                                Morning
                            </button>
                            <button
                                type="button"
                                onClick={() => setSessionName('night')}
                                className={`flex-1 px-6 py-3 font-medium transition-all ${sessionName === 'night' ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                            >
                                Night
                            </button>
                        </div>
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
                                ? isDisabled ? 'bg-gray-700 text-gray-400' : 'bg-indigo-500 text-white'
                                : isDisabled ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            {cat === 'single' ? 'Single' : cat === 'jodi' ? 'Jodi' : 'Triple'}
                            <span className="block text-xs mt-1 opacity-75">{PAYOUT_MULTIPLIERS[cat]}x</span>
                            {isDisabled && <span className="absolute top-1 right-2 text-red-400"><AlertTriangle size={14} /></span>}
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
                            {activeTab === 'jodi' ? bettingStatus.openMessage : target === 'open' ? bettingStatus.openMessage : bettingStatus.closeMessage}
                        </p>
                    </div>
                </div>
            )}

            {/* Bet Entry Form */}
            <Card className="!bg-gray-800/80 !border-gray-700">
                <div className="p-3 space-y-3">
                    {/* Target Toggle (for Single/Triple only) */}
                    {activeTab !== 'jodi' && (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => bettingStatus.openBetting && setTarget('open')}
                                disabled={!bettingStatus.openBetting}
                                className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${!bettingStatus.openBetting
                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    : target === 'open' ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-400'
                                    }`}
                            >
                                Open {!bettingStatus.openBetting && <span className="text-red-400 text-xs">(Closed)</span>}
                            </button>
                            <button
                                type="button"
                                onClick={() => bettingStatus.closeBetting && setTarget('close')}
                                disabled={!bettingStatus.closeBetting}
                                className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${!bettingStatus.closeBetting
                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    : target === 'close' ? 'bg-pink-500 text-white' : 'bg-gray-700 text-gray-400'
                                    }`}
                            >
                                Close {!bettingStatus.closeBetting && <span className="text-red-400 text-xs">(Closed)</span>}
                            </button>
                        </div>
                    )}

                    {/* === SINGLE TAB === */}
                    {activeTab === 'single' && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-5 gap-2">
                                {Array.from({ length: 10 }, (_, i) => (
                                    <div key={i} className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-lg mb-1">{i}</div>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min="0"
                                            placeholder="0"
                                            value={singleAmounts[i]}
                                            onChange={(e) => updateSingleAmount(i, e.target.value)}
                                            disabled={!canPlaceBet}
                                            className="w-full px-1 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-center text-sm font-mono focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-1">
                                {quickAmounts.map((amt) => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => {
                                            const firstEmpty = Object.entries(singleAmounts).find(([_, v]) => !v)?.[0]
                                            if (firstEmpty !== undefined) updateSingleAmount(Number(firstEmpty), amt.toString())
                                        }}
                                        disabled={!canPlaceBet}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50"
                                    >
                                        +{amt}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                                <div className="text-gray-400">
                                    Total: <span className="text-white font-bold text-lg">{singleGridTotal}</span> Points
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={clearSingleGrid} className="px-3 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Clear</button>
                                    <Button type="button" size="sm" onClick={handlePlaceSingleBets} disabled={!canPlaceBet || singleGridTotal === 0} isLoading={isSubmitting}>
                                        Place Bets
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === JODI TAB === */}
                    {activeTab === 'jodi' && (
                        <div className="space-y-3">
                            <div className="h-48 overflow-y-auto bg-gray-900 rounded-lg border border-gray-700">
                                {Array.from({ length: 100 }, (_, i) => {
                                    const jodi = i.toString().padStart(2, '0')
                                    const isSelected = jodiSelections[jodi] !== undefined
                                    return (
                                        <button
                                            key={jodi}
                                            type="button"
                                            onClick={() => toggleJodiSelection(jodi)}
                                            disabled={!canPlaceBet}
                                            className={`w-full px-4 py-2.5 text-left border-b border-gray-800 transition-colors ${isSelected ? 'bg-indigo-600 text-white font-medium' : 'text-gray-300 hover:bg-gray-800'} disabled:opacity-50`}
                                        >
                                            {jodi}
                                        </button>
                                    )
                                })}
                            </div>

                            {Object.keys(jodiSelections).length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-400">Selected ({Object.keys(jodiSelections).length})</span>
                                        <div className="flex gap-1">
                                            {quickAmounts.slice(0, 4).map((amt) => (
                                                <button key={amt} type="button" onClick={() => applyAmountToAllJodis(amt)} className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
                                                    All={amt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(jodiSelections).map(([jodi, amt]) => (
                                            <div key={jodi} className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
                                                <span className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white font-bold rounded text-sm">{jodi}</span>
                                                <input
                                                    type="number"
                                                    inputMode="numeric"
                                                    min="0"
                                                    placeholder="0"
                                                    value={amt}
                                                    onChange={(e) => updateJodiAmount(jodi, e.target.value)}
                                                    className="w-14 px-1 py-1 bg-gray-800 border border-gray-600 rounded text-white text-center text-sm font-mono focus:border-indigo-500 focus:outline-none"
                                                />
                                                <button type="button" onClick={() => removeJodiSelection(jodi)} className="w-6 h-6 flex items-center justify-center bg-red-600 text-white rounded hover:bg-red-700">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                                <div className="text-gray-400">
                                    Total: <span className="text-white font-bold text-lg">{jodiSelectionTotal}</span> Points
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={clearJodiSelections} className="px-3 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Clear</button>
                                    <Button type="button" size="sm" onClick={handlePlaceJodiBets} disabled={!canPlaceBet || jodiSelectionTotal === 0} isLoading={isSubmitting}>
                                        Place Bets
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === TRIPLE TAB === */}
                    {activeTab === 'triple' && (
                        <div className="space-y-3">
                            {/* Add Triple Form */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="000"
                                    maxLength={3}
                                    value={tripleNumber}
                                    onChange={(e) => setTripleNumber(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                    disabled={!canPlaceBet}
                                    className="flex-1 px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-center text-xl font-mono focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                                />
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min="10"
                                    placeholder="Points"
                                    value={tripleAmount}
                                    onChange={(e) => setTripleAmount(e.target.value)}
                                    disabled={!canPlaceBet}
                                    className="w-24 px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-center text-xl font-mono focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                                />
                                <button
                                    type="button"
                                    onClick={addTripleToSelection}
                                    disabled={!canPlaceBet || tripleNumber.length !== 3 || !tripleAmount}
                                    className="px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            {/* Quick Amounts */}
                            <div className="flex flex-wrap gap-1">
                                {quickAmounts.map((amt) => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => setTripleAmount(amt.toString())}
                                        disabled={!canPlaceBet}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tripleAmount === amt.toString() ? 'bg-indigo-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} disabled:opacity-50`}
                                    >
                                        {amt}
                                    </button>
                                ))}
                            </div>

                            {/* Selected Triples */}
                            {Object.keys(tripleSelections).length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-sm text-gray-400">Selected ({Object.keys(tripleSelections).length})</span>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(tripleSelections).map(([triple, amt]) => (
                                            <div key={triple} className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
                                                <span className="w-10 h-8 flex items-center justify-center bg-indigo-600 text-white font-bold rounded text-sm">{triple}</span>
                                                <span className="px-2 text-white font-mono text-sm">{amt}</span>
                                                <button type="button" onClick={() => removeTripleSelection(triple)} className="w-6 h-6 flex items-center justify-center bg-red-600 text-white rounded hover:bg-red-700">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                                <div className="text-gray-400">
                                    Total: <span className="text-white font-bold text-lg">{tripleSelectionTotal}</span> Points
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={clearTripleSelections} className="px-3 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Clear</button>
                                    <Button type="button" size="sm" onClick={handlePlaceTripleBets} disabled={!canPlaceBet || tripleSelectionTotal === 0} isLoading={isSubmitting}>
                                        Place Bets
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
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
                            <div className="py-4 text-center text-gray-400">{playerSearch ? 'No players found' : 'No players yet'}</div>
                        ) : (
                            players.map((player) => (
                                <button
                                    key={player.id}
                                    type="button"
                                    onClick={() => handleSelectPlayer(player)}
                                    className={`w-full p-3 rounded-lg text-left flex items-center gap-3 transition-colors ${selectedPlayer?.id === player.id ? 'bg-indigo-500/20 border border-indigo-500' : 'bg-gray-800 hover:bg-gray-700 border border-transparent'}`}
                                >
                                    <User size={18} className="text-indigo-400" />
                                    <div className="flex-1">
                                        <p className="font-medium text-white">{player.name}</p>
                                        {player.phone && <p className="text-xs text-gray-400">{player.phone}</p>}
                                    </div>
                                    {selectedPlayer?.id === player.id && <Check size={18} className="text-indigo-400" />}
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
                                <Button variant="secondary" size="sm" onClick={() => { setShowNewPlayerForm(false); setNewPlayerName(''); setNewPlayerPhone('') }}>
                                    Cancel
                                </Button>
                                <Button size="sm" onClick={handleAddNewPlayer} isLoading={isSubmitting}>
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
                title="Confirm Bets"
            >
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Place <strong className="text-white">{pendingBets.length} bets</strong> for{' '}
                        <strong className="text-white">{useSelfBet ? staffInfo.name : selectedPlayer?.name}</strong>?
                    </p>
                    <div className="p-4 bg-gray-800 rounded-lg">
                        <div className="flex justify-between text-sm text-gray-400 mb-2">
                            <span>Session:</span>
                            <span className="text-white capitalize">{sessionName}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-400 mb-2">
                            <span>Type:</span>
                            <span className="text-white capitalize">{pendingBets[0]?.category || '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-400">
                            <span>Total Points:</span>
                            <span className="text-white font-bold">{pendingTotal}</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="secondary" className="flex-1" onClick={() => setShowConfirmModal(false)}>
                            Cancel
                        </Button>
                        <Button className="flex-1" onClick={confirmPlaceBets} isLoading={isSubmitting}>
                            Confirm
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
