'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Slider } from '@/components/ui/Slider'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useDebounce } from '@/hooks/useDebounce'
import {
    DollarSign,
    RefreshCw,
    Target,
    Zap,
    TrendingDown,
    Ghost,
    AlertTriangle,
    Trophy,
    CheckCircle,
    Lock,
    Clock,
    Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { SessionType, BetTarget, ResultOption } from '@/types/types'

interface GameSession {
    id: string
    game_date: string
    session_name: 'morning' | 'night'
    open_triple: string | null
    open_single: string | null
    close_triple: string | null
    close_single: string | null
    jodi_result: string | null
}

interface RecommendationsData {
    totalCollection: number
    targetMatch: ResultOption[]
    systemRecommendations: ResultOption[]
    lowBets: ResultOption[]
    noBets: ResultOption[]
}

// Lock window timings from SRS
interface LockWindow {
    start: string
    end: string
    resultTime: string
}

type DeclarationTarget = 'open' | 'close'

const LOCK_WINDOWS: Record<SessionType, Record<DeclarationTarget, LockWindow>> = {
    morning: {
        open: { start: '12:30', end: '13:00', resultTime: '13:00' },
        close: { start: '14:30', end: '15:00', resultTime: '15:00' }
    },
    night: {
        open: { start: '17:30', end: '18:00', resultTime: '18:00' },
        close: { start: '19:30', end: '20:00', resultTime: '20:00' }
    }
}

// Helper to convert HH:MM to minutes since midnight
function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
}

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true)
    const [loadingRecommendations, setLoadingRecommendations] = useState(false)
    const [selectedSession, setSelectedSession] = useState<SessionType>('morning')
    const [selectedTarget, setSelectedTarget] = useState<BetTarget>('open')
    const [payoutSlider, setPayoutSlider] = useState(10)
    const debouncedPayoutSlider = useDebounce(payoutSlider, 300) // Debounce slider for API calls
    const [morningSession, setMorningSession] = useState<GameSession | null>(null)
    const [nightSession, setNightSession] = useState<GameSession | null>(null)
    const [recommendations, setRecommendations] = useState<RecommendationsData>({
        totalCollection: 0,
        targetMatch: [],
        systemRecommendations: [],
        lowBets: [],
        noBets: []
    })
    const [selectedResult, setSelectedResult] = useState<ResultOption | null>(null)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [activeTab, setActiveTab] = useState<'target' | 'profit' | 'low' | 'ghost'>('target')
    const [currentTime, setCurrentTime] = useState(() => {
        const now = new Date()
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    })

    // Update time every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date()
            setCurrentTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
        }, 30000)
        return () => clearInterval(interval)
    }, [])

    const gameDate = useMemo(() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    }, [])

    const currentSession = selectedSession === 'morning' ? morningSession : nightSession

    // Check if result already declared
    const isOpenDeclared = currentSession?.open_triple != null
    const isCloseDeclared = currentSession?.close_triple != null

    // Check if within lock window for result declaration
    const getLockWindowStatus = useCallback((session: SessionType, target: DeclarationTarget) => {
        const window = LOCK_WINDOWS[session][target]
        const nowMinutes = timeToMinutes(currentTime)
        const startMinutes = timeToMinutes(window.start)
        const endMinutes = timeToMinutes(window.end)

        const isInWindow = nowMinutes >= startMinutes && nowMinutes < endMinutes
        const isPastWindow = nowMinutes >= endMinutes
        const isBeforeWindow = nowMinutes < startMinutes

        return { isInWindow, isPastWindow, isBeforeWindow, window }
    }, [currentTime])

    const openLockStatus = getLockWindowStatus(selectedSession, 'open')
    const closeLockStatus = getLockWindowStatus(selectedSession, 'close')

    // Can declare based on both time and declaration status
    const canDeclareOpen = !isOpenDeclared && (openLockStatus.isInWindow || openLockStatus.isPastWindow)
    const canDeclareClose = isOpenDeclared && !isCloseDeclared && (closeLockStatus.isInWindow || closeLockStatus.isPastWindow)

    // Fetch sessions - only on mount and after declaring result
    const fetchSessions = useCallback(async () => {
        try {
            const response = await fetch(`/api/results?date=${gameDate}`)
            if (response.ok) {
                const { results } = await response.json()
                if (results) {
                    const morning = results.find((s: GameSession) => s.session_name === 'morning')
                    const night = results.find((s: GameSession) => s.session_name === 'night')
                    setMorningSession(morning || null)
                    setNightSession(night || null)
                }
            }
        } catch (error) {
            console.error('Failed to fetch sessions:', error)
        }
    }, [gameDate])

    // Fetch recommendations - on debounced slider/session/target change
    const fetchRecommendations = useCallback(async () => {
        setLoadingRecommendations(true)
        try {
            const response = await fetch(`/api/analytics?type=recommendations&date=${gameDate}&session=${selectedSession}&target=${selectedTarget}&targetPayout=${debouncedPayoutSlider}`)
            if (response.ok) {
                const { recommendations: rec } = await response.json()
                setRecommendations(rec || {
                    totalCollection: 0,
                    targetMatch: [],
                    systemRecommendations: [],
                    lowBets: [],
                    noBets: []
                })
            }
        } catch (error) {
            console.error('Failed to fetch recommendations:', error)
        } finally {
            setLoadingRecommendations(false)
        }
    }, [gameDate, selectedSession, selectedTarget, debouncedPayoutSlider])

    // Initial load - fetch both sessions and recommendations
    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            await Promise.all([fetchSessions(), fetchRecommendations()])
        } catch (error) {
            console.error('Failed to fetch data:', error)
            toast.error('Failed to load data')
        } finally {
            setLoading(false)
        }
    }, [fetchSessions, fetchRecommendations])

    // Initial data load
    useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Refetch recommendations when slider/session/target changes (no loading spinner)
    useEffect(() => {
        fetchRecommendations()
    }, [fetchRecommendations])

    // Calculate single from triple
    const calculateSingle = (triple: string): string => {
        const sum = triple.split('').reduce((acc, d) => acc + parseInt(d), 0)
        return (sum % 10).toString()
    }

    // Handle result selection
    const handleSelectResult = (option: ResultOption) => {
        const targetKey = selectedTarget as DeclarationTarget
        const window = LOCK_WINDOWS[selectedSession][targetKey]

        if (selectedTarget === 'open') {
            // Check if open already declared
            if (isOpenDeclared) {
                toast.error('Open result already declared')
                return
            }
            // Check time window
            if (openLockStatus.isBeforeWindow) {
                toast.error(`Too early! Open result declaration starts at ${window.start}`)
                return
            }
        }

        if (selectedTarget === 'close') {
            // Check if open must be declared first
            if (!isOpenDeclared) {
                toast.error('Declare Open result first')
                return
            }
            // Check if close already declared
            if (isCloseDeclared) {
                toast.error('Close result already declared')
                return
            }
            // Check time window
            if (closeLockStatus.isBeforeWindow) {
                toast.error(`Too early! Close result declaration starts at ${window.start}`)
                return
            }
        }

        setSelectedResult(option)
        setShowConfirmModal(true)
    }

    // Declare result
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

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to declare result')
            }

            toast.success(`${selectedTarget.toUpperCase()} result declared: ${selectedResult.triple}`)
            setShowConfirmModal(false)
            setSelectedResult(null)

            // Auto-switch to close after declaring open
            if (selectedTarget === 'open') {
                setSelectedTarget('close')
            }

            await Promise.all([fetchSessions(), fetchRecommendations()])
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to declare result')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Get active list
    const getActiveList = (): ResultOption[] => {
        switch (activeTab) {
            case 'target': return recommendations.targetMatch
            case 'profit': return recommendations.systemRecommendations
            case 'low': return recommendations.lowBets
            case 'ghost': return recommendations.noBets
            default: return []
        }
    }

    // Estimated payout/profit based on slider
    const estimatedPayout = Math.round(recommendations.totalCollection * payoutSlider / 100)
    const estimatedProfit = recommendations.totalCollection - estimatedPayout

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white">Result Declaration</h1>
                    <p className="text-sm text-gray-400">{gameDate}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
                        <Clock size={16} className="text-cyan-400" />
                        <span className="font-mono text-white">{currentTime}</span>
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg hover:bg-gray-700 transition-all text-sm"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Lock Window Status Banner */}
            <div className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className={`p-3 rounded-lg border ${isOpenDeclared ? 'bg-green-500/10 border-green-500/30' :
                        openLockStatus.isInWindow ? 'bg-cyan-500/10 border-cyan-500/50 animate-pulse' :
                            openLockStatus.isBeforeWindow ? 'bg-gray-700/50 border-gray-600' :
                                'bg-yellow-500/10 border-yellow-500/30'
                        }`}>
                        <p className="text-xs text-gray-400 mb-1">OPEN DECLARATION</p>
                        {isOpenDeclared ? (
                            <p className="text-sm font-medium text-green-400 flex items-center justify-center gap-1">
                                <CheckCircle size={14} /> Declared
                            </p>
                        ) : openLockStatus.isInWindow ? (
                            <p className="text-sm font-bold text-cyan-400">ACTIVE NOW</p>
                        ) : openLockStatus.isBeforeWindow ? (
                            <p className="text-xs text-gray-400">
                                <Lock size={12} className="inline mr-1" />
                                Opens at {LOCK_WINDOWS[selectedSession].open.start}
                            </p>
                        ) : (
                            <p className="text-sm text-yellow-400">Ready to Declare</p>
                        )}
                    </div>
                    <div className={`p-3 rounded-lg border ${isCloseDeclared ? 'bg-green-500/10 border-green-500/30' :
                        !isOpenDeclared ? 'bg-gray-700/50 border-gray-600' :
                            closeLockStatus.isInWindow ? 'bg-cyan-500/10 border-cyan-500/50 animate-pulse' :
                                closeLockStatus.isBeforeWindow ? 'bg-gray-700/50 border-gray-600' :
                                    'bg-yellow-500/10 border-yellow-500/30'
                        }`}>
                        <p className="text-xs text-gray-400 mb-1">CLOSE DECLARATION</p>
                        {isCloseDeclared ? (
                            <p className="text-sm font-medium text-green-400 flex items-center justify-center gap-1">
                                <CheckCircle size={14} /> Declared
                            </p>
                        ) : !isOpenDeclared ? (
                            <p className="text-xs text-gray-500">Waiting for Open</p>
                        ) : closeLockStatus.isInWindow ? (
                            <p className="text-sm font-bold text-cyan-400">ACTIVE NOW</p>
                        ) : closeLockStatus.isBeforeWindow ? (
                            <p className="text-xs text-gray-400">
                                <Lock size={12} className="inline mr-1" />
                                Opens at {LOCK_WINDOWS[selectedSession].close.start}
                            </p>
                        ) : (
                            <p className="text-sm text-yellow-400">Ready to Declare</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Session & Target Selection */}
            <div className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Session Toggle */}
                    <div>
                        <p className="text-xs text-gray-400 mb-2">SELECT SESSION</p>
                        <div className="flex rounded-lg overflow-hidden border border-gray-700">
                            <button
                                onClick={() => setSelectedSession('morning')}
                                className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${selectedSession === 'morning'
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                                    }`}
                            >
                                Morning
                                {morningSession?.close_triple && <CheckCircle size={14} className="inline ml-2" />}
                            </button>
                            <button
                                onClick={() => setSelectedSession('night')}
                                className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${selectedSession === 'night'
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                                    }`}
                            >
                                Night
                                {nightSession?.close_triple && <CheckCircle size={14} className="inline ml-2" />}
                            </button>
                        </div>
                    </div>

                    {/* Target Toggle */}
                    <div>
                        <p className="text-xs text-gray-400 mb-2">SELECT TARGET</p>
                        <div className="flex rounded-lg overflow-hidden border border-gray-700">
                            <button
                                onClick={() => setSelectedTarget('open')}
                                disabled={isOpenDeclared}
                                className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${selectedTarget === 'open'
                                    ? 'bg-cyan-500 text-white'
                                    : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                                    } ${isOpenDeclared ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Open
                                {isOpenDeclared && <Lock size={12} className="inline ml-1" />}
                            </button>
                            <button
                                onClick={() => setSelectedTarget('close')}
                                disabled={!isOpenDeclared || isCloseDeclared}
                                className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${selectedTarget === 'close'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                                    } ${(!isOpenDeclared || isCloseDeclared) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Close
                                {isCloseDeclared && <Lock size={12} className="inline ml-1" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Current Results Display */}
                {currentSession && (isOpenDeclared || isCloseDeclared) && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="flex justify-center gap-6">
                            <div className="text-center">
                                <p className="text-xs text-gray-500">OPEN</p>
                                <p className={`text-2xl font-mono font-bold ${currentSession.open_triple ? 'text-cyan-400' : 'text-gray-600'}`}>
                                    {currentSession.open_triple || '***'}
                                </p>
                                {currentSession.open_single && (
                                    <p className="text-xs text-gray-400">Single: {currentSession.open_single}</p>
                                )}
                            </div>
                            <div className="text-center px-6 border-x border-gray-700">
                                <p className="text-xs text-gray-500">JODI</p>
                                <p className={`text-2xl font-mono font-bold ${currentSession.jodi_result ? 'text-pink-400' : currentSession.open_single ? 'text-pink-400' : 'text-gray-600'}`}>
                                    {currentSession.jodi_result || (currentSession.open_single ? `${currentSession.open_single}*` : '**')}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-gray-500">CLOSE</p>
                                <p className={`text-2xl font-mono font-bold ${currentSession.close_triple ? 'text-green-400' : 'text-gray-600'}`}>
                                    {currentSession.close_triple || '***'}
                                </p>
                                {currentSession.close_single && (
                                    <p className="text-xs text-gray-400">Single: {currentSession.close_single}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-3 text-center">
                    <DollarSign className="mx-auto text-cyan-400 mb-1" size={20} />
                    <p className="text-xs text-gray-400">Collection</p>
                    <p className="text-lg font-bold text-white">₹{recommendations.totalCollection.toLocaleString()}</p>
                </div>
                <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-3 text-center">
                    <TrendingDown className="mx-auto text-red-400 mb-1" size={20} />
                    <p className="text-xs text-gray-400">Est. Payout</p>
                    <p className="text-lg font-bold text-red-400">₹{estimatedPayout.toLocaleString()}</p>
                </div>
                <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-3 text-center">
                    <Trophy className="mx-auto text-green-400 mb-1" size={20} />
                    <p className="text-xs text-gray-400">Est. Profit</p>
                    <p className="text-lg font-bold text-green-400">₹{estimatedProfit.toLocaleString()}</p>
                </div>
            </div>

            {/* Profit Slider */}
            <div className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-xl p-4">
                <Slider
                    label="Desired User Payout %"
                    value={payoutSlider}
                    onChange={setPayoutSlider}
                    min={0}
                    max={30}
                    step={1}
                />
                <div className="flex items-center justify-center gap-2 mt-2">
                    <p className="text-xs text-gray-500">
                        Target: {payoutSlider}% payout → {100 - payoutSlider}% profit
                    </p>
                    {(payoutSlider !== debouncedPayoutSlider || loadingRecommendations) && (
                        <Loader2 size={12} className="animate-spin text-cyan-400" />
                    )}
                </div>
            </div>

            {/* Recommendation Tabs */}
            <div className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-xl overflow-hidden">
                {/* Tab Headers */}
                <div className="flex border-b border-gray-700 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('target')}
                        className={`flex-1 min-w-[80px] py-3 px-2 text-xs font-medium transition-all flex flex-col items-center gap-1 ${activeTab === 'target' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'
                            }`}
                    >
                        <Target size={16} />
                        <span>Target</span>
                        <span className="text-[10px]">({recommendations.targetMatch.length})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('profit')}
                        className={`flex-1 min-w-[80px] py-3 px-2 text-xs font-medium transition-all flex flex-col items-center gap-1 ${activeTab === 'profit' ? 'bg-yellow-500/10 text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400'
                            }`}
                    >
                        <Zap size={16} />
                        <span>Leverage</span>
                        <span className="text-[10px]">({recommendations.systemRecommendations.length})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('low')}
                        className={`flex-1 min-w-[80px] py-3 px-2 text-xs font-medium transition-all flex flex-col items-center gap-1 ${activeTab === 'low' ? 'bg-pink-500/10 text-pink-400 border-b-2 border-pink-400' : 'text-gray-400'
                            }`}
                    >
                        <TrendingDown size={16} />
                        <span>Low</span>
                        <span className="text-[10px]">({recommendations.lowBets.length})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('ghost')}
                        className={`flex-1 min-w-[80px] py-3 px-2 text-xs font-medium transition-all flex flex-col items-center gap-1 ${activeTab === 'ghost' ? 'bg-green-500/10 text-green-400 border-b-2 border-green-400' : 'text-gray-400'
                            }`}
                    >
                        <Ghost size={16} />
                        <span>Ghost</span>
                        <span className="text-[10px]">({recommendations.noBets.length})</span>
                    </button>
                </div>

                {/* Result List */}
                <div className="max-h-[300px] overflow-y-auto relative">
                    {/* Loading Overlay */}
                    {loadingRecommendations && (
                        <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-10">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 size={24} className="animate-spin text-cyan-400" />
                                <span className="text-xs text-gray-400">Calculating...</span>
                            </div>
                        </div>
                    )}

                    {getActiveList().length === 0 ? (
                        <div className="py-12 text-center text-gray-500">
                            <p>{loadingRecommendations ? 'Loading...' : 'No results in this category'}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-700/50">
                            {getActiveList().map((result) => (
                                <button
                                    key={result.triple}
                                    onClick={() => handleSelectResult(result)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <p className="font-mono text-xl font-bold text-cyan-400">{result.triple}</p>
                                            <p className="text-xs text-gray-500">Single: {result.single}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-medium ${result.profitPercentage > 90 ? 'text-green-400' : 'text-white'}`}>
                                            {result.profitPercentage.toFixed(1)}% profit
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Bets: ₹{result.totalBets.toLocaleString()}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            <Modal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="Confirm Result Declaration"
            >
                {selectedResult && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-3">
                            <AlertTriangle className="text-red-400 flex-shrink-0" />
                            <p className="text-sm text-red-400">
                                This action cannot be undone. The result will be immediately visible to all users.
                            </p>
                        </div>

                        <div className="p-6 rounded-lg bg-gray-900 text-center">
                            <p className="text-xs text-gray-500 mb-2">
                                DECLARING {selectedSession.toUpperCase()} {selectedTarget.toUpperCase()} RESULT
                            </p>
                            <p className="text-5xl font-mono font-bold text-cyan-400 mb-2">
                                {selectedResult.triple}
                            </p>
                            <p className="text-lg text-white">
                                Single: <span className="font-bold">{calculateSingle(selectedResult.triple)}</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-gray-900">
                            <div>
                                <p className="text-xs text-gray-500">Estimated Payout</p>
                                <p className="text-lg font-bold text-red-400">
                                    ₹{Math.round(selectedResult.totalLiability).toLocaleString()}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500">Estimated Profit</p>
                                <p className="text-lg font-bold text-green-400">
                                    ₹{Math.round(recommendations.totalCollection - selectedResult.totalLiability).toLocaleString()}
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
        </div>
    )
}
