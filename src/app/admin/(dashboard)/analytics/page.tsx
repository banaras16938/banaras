'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Input } from '@/components/ui/Input'
import {
    Eye,
    EyeOff,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Users,
    Wallet,
    Trophy,
    X
} from 'lucide-react'
import { toast } from 'sonner'

interface StaffData {
    staffId: string
    staffEmail: string
    staffName: string
    morningCollection: number
    morningPayout: number
    morningProfit: number
    nightCollection: number
    nightPayout: number
    nightProfit: number
    totalCollection: number
    totalPayout: number
    totalProfit: number
    totalBets: number
}

interface SummaryData {
    totalCollection: number
    totalPayout: number
    netProfit: number
    totalBets: number
    wonBets: number
    lostBets: number
}

interface HisabKitabData {
    date: string
    isToday: boolean
    summary: SummaryData
    staffBreakdown: StaffData[]
}

export default function HisabKitabPage() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<HisabKitabData | null>(null)
    const [selectedDate, setSelectedDate] = useState<'today' | 'yesterday'>('today')
    const [showCriticalData, setShowCriticalData] = useState(false)
    const [showPinModal, setShowPinModal] = useState(false)
    const [pin, setPin] = useState('')
    const [pinError, setPinError] = useState('')
    const [verifying, setVerifying] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const today = new Date()
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)

            const dateStr = selectedDate === 'today'
                ? today.toISOString().split('T')[0]
                : yesterday.toISOString().split('T')[0]

            const response = await fetch(`/api/analytics?type=hisab-kitab&date=${dateStr}`)
            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch data')
            }

            setData(result)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load data')
            setData(null)
        } finally {
            setLoading(false)
        }
    }, [selectedDate])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handlePinSubmit = async () => {
        if (pin.length !== 4) {
            setPinError('Enter 4-digit PIN')
            return
        }

        setVerifying(true)
        setPinError('')

        try {
            const response = await fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify_pin', pin })
            })

            const result = await response.json()

            if (result.verified) {
                setShowCriticalData(true)
                setShowPinModal(false)
                setPin('')
                toast.success('Critical data unlocked')
            } else {
                setPinError('Wrong PIN')
            }
        } catch {
            setPinError('Verification failed')
        } finally {
            setVerifying(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return `₹${amount.toLocaleString('en-IN')}`
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Hisab-Kitab</h1>
                    <p className="text-gray-400">
                        Daily staff settlement & profit overview
                    </p>
                </div>
                <div className="flex gap-3">
                    {/* Date Toggle */}
                    <div className="flex rounded-lg overflow-hidden border border-gray-700">
                        <button
                            onClick={() => setSelectedDate('today')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${selectedDate === 'today'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setSelectedDate('yesterday')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${selectedDate === 'yesterday'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            Yesterday
                        </button>
                    </div>
                    <button
                        onClick={fetchData}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Date Display */}
            {data && (
                <p className="text-sm text-gray-500">
                    Showing data for: <span className="text-white font-medium">{data.date}</span>
                </p>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Always Visible */}
                <Card className="text-center">
                    <Users className="mx-auto text-blue-400 mb-2" size={24} />
                    <p className="text-xs text-gray-400">Total Bets</p>
                    <p className="text-xl font-bold text-white">{data?.summary.totalBets || 0}</p>
                </Card>
                <Card className="text-center">
                    <Wallet className="mx-auto text-cyan-400 mb-2" size={24} />
                    <p className="text-xs text-gray-400">Total Collection</p>
                    {showCriticalData ? (
                        <p className="text-xl font-bold text-cyan-400">
                            {formatCurrency(data?.summary.totalCollection || 0)}
                        </p>
                    ) : (
                        <button
                            onClick={() => setShowPinModal(true)}
                            className="text-xl font-bold text-gray-600 flex items-center justify-center gap-2 mx-auto hover:text-gray-400 transition-colors"
                        >
                            ****
                            <Eye size={16} />
                        </button>
                    )}
                </Card>

                {/* Critical Data - PIN Protected */}
                <Card className="text-center relative">
                    <TrendingDown className="mx-auto text-red-400 mb-2" size={24} />
                    <p className="text-xs text-gray-400">Total Payout</p>
                    {showCriticalData ? (
                        <p className="text-xl font-bold text-red-400">
                            {formatCurrency(data?.summary.totalPayout || 0)}
                        </p>
                    ) : (
                        <button
                            onClick={() => setShowPinModal(true)}
                            className="text-xl font-bold text-gray-600 flex items-center justify-center gap-2 mx-auto hover:text-gray-400 transition-colors"
                        >
                            ****
                            <Eye size={16} />
                        </button>
                    )}
                </Card>
                <Card className="text-center relative">
                    <TrendingUp className="mx-auto text-green-400 mb-2" size={24} />
                    <p className="text-xs text-gray-400">Net Profit</p>
                    {showCriticalData ? (
                        <p className={`text-xl font-bold ${(data?.summary.netProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(data?.summary.netProfit || 0)}
                        </p>
                    ) : (
                        <button
                            onClick={() => setShowPinModal(true)}
                            className="text-xl font-bold text-gray-600 flex items-center justify-center gap-2 mx-auto hover:text-gray-400 transition-colors"
                        >
                            ****
                            <Eye size={16} />
                        </button>
                    )}
                </Card>
                <Card className="text-center">
                    <Trophy className="mx-auto text-yellow-400 mb-2" size={24} />
                    <p className="text-xs text-gray-400">Won / Lost</p>
                    {showCriticalData ? (
                        <p className="text-xl font-bold text-white">
                            <span className="text-green-400">{data?.summary.wonBets || 0}</span>
                            {' / '}
                            <span className="text-red-400">{data?.summary.lostBets || 0}</span>
                        </p>
                    ) : (
                        <button
                            onClick={() => setShowPinModal(true)}
                            className="text-xl font-bold text-gray-600 flex items-center justify-center gap-2 mx-auto hover:text-gray-400 transition-colors"
                        >
                            ** / **
                            <Eye size={16} />
                        </button>
                    )}
                </Card>
                <Card className="text-center">
                    <p className="text-xs text-gray-400 mb-2">Active Staff</p>
                    <p className="text-2xl font-bold text-purple-400">{data?.staffBreakdown.length || 0}</p>
                </Card>
            </div>

            {/* Critical Data Toggle */}
            {showCriticalData && (
                <div className="flex justify-end">
                    <button
                        onClick={() => setShowCriticalData(false)}
                        className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                    >
                        <EyeOff size={14} />
                        Hide sensitive data
                    </button>
                </div>
            )}

            {/* Staff Performance Table */}
            <Card>
                <CardHeader
                    title="Staff Performance"
                    subtitle="Session-wise collection, payout, and profit"
                />
                <div className="table-container overflow-x-auto">
                    <table className="table min-w-[900px]">
                        <thead>
                            <tr>
                                <th>Staff</th>
                                <th className="text-center" colSpan={2}>Morning</th>
                                <th className="text-center" colSpan={2}>Night</th>
                                <th className="text-center" colSpan={2}>Day Total</th>
                                <th className="text-center">Settlement</th>
                            </tr>
                            <tr className="text-xs text-gray-500">
                                <th></th>
                                <th>Collection</th>
                                <th>Profit</th>
                                <th>Collection</th>
                                <th>Profit</th>
                                <th>Collection</th>
                                <th>Profit</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {!data?.staffBreakdown.length ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-gray-500">
                                        No staff data for this date
                                    </td>
                                </tr>
                            ) : (
                                data.staffBreakdown.map((staff) => {
                                    // Settlement = Profit (what admin takes from staff)
                                    const settlement = staff.totalProfit
                                    return (
                                        <tr key={staff.staffId}>
                                            <td>
                                                <div>
                                                    <p className="font-medium text-white">{staff.staffName}</p>
                                                    <p className="text-xs text-gray-500">{staff.staffEmail}</p>
                                                </div>
                                            </td>
                                            <td className="text-center">{formatCurrency(staff.morningCollection)}</td>
                                            <td className="text-center">
                                                {showCriticalData ? (
                                                    <span className={staff.morningProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                        {formatCurrency(staff.morningProfit)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-600">****</span>
                                                )}
                                            </td>
                                            <td className="text-center">{formatCurrency(staff.nightCollection)}</td>
                                            <td className="text-center">
                                                {showCriticalData ? (
                                                    <span className={staff.nightProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                        {formatCurrency(staff.nightProfit)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-600">****</span>
                                                )}
                                            </td>
                                            <td className="text-center font-medium">{formatCurrency(staff.totalCollection)}</td>
                                            <td className="text-center">
                                                {showCriticalData ? (
                                                    <span className={`font-medium ${staff.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {formatCurrency(staff.totalProfit)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-600">****</span>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                {showCriticalData ? (
                                                    <Badge
                                                        variant={settlement >= 0 ? 'success' : 'error'}
                                                        className="font-mono"
                                                    >
                                                        {settlement >= 0 ? '↑ Take ' : '↓ Give '}
                                                        {formatCurrency(Math.abs(settlement))}
                                                    </Badge>
                                                ) : (
                                                    <button
                                                        onClick={() => setShowPinModal(true)}
                                                        className="text-gray-600 hover:text-gray-400"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* PIN Modal */}
            {showPinModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-gray-900 rounded-xl p-6 w-full max-w-sm mx-4 border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white">Enter PIN</h3>
                            <button
                                onClick={() => {
                                    setShowPinModal(false)
                                    setPin('')
                                    setPinError('')
                                }}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">
                            Enter 4-digit PIN to view critical financial data
                        </p>
                        <Input
                            type="password"
                            placeholder="****"
                            value={pin}
                            onChange={(e) => {
                                setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                                setPinError('')
                            }}
                            className="text-center text-2xl tracking-widest font-mono"
                            maxLength={4}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handlePinSubmit()
                            }}
                        />
                        {pinError && (
                            <p className="text-red-400 text-sm mt-2 text-center">{pinError}</p>
                        )}
                        <button
                            onClick={handlePinSubmit}
                            disabled={verifying || pin.length !== 4}
                            className="w-full mt-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white py-3 rounded-lg font-medium transition-colors"
                        >
                            {verifying ? 'Verifying...' : 'Unlock'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
