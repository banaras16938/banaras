'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Clock, DollarSign, Save, RefreshCw, Calendar, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface GameSchedule {
    session_name: 'morning' | 'night'
    start_time: string
    open_bet_freeze_time: string
    open_result_time: string
    close_bet_resume_time: string | null
    close_bet_freeze_time: string
    close_result_time: string
}

interface GameConfig {
    payout_single: number
    payout_jodi: number
    payout_triple: number
}

interface Holiday {
    holiday_date: string
    description: string | null
    created_at: string
}

export default function GameSettingsPage() {
    const [loading, setLoading] = useState(true)
    const [schedules, setSchedules] = useState<GameSchedule[]>([])
    const [config, setConfig] = useState<GameConfig>({
        payout_single: 9,
        payout_jodi: 90,
        payout_triple: 800
    })
    const [holidays, setHolidays] = useState<Holiday[]>([])

    // Edit states
    const [editingSingle, setEditingSingle] = useState(90)
    const [editingJodi, setEditingJodi] = useState(900)
    const [editingTriple, setEditingTriple] = useState(8000)
    const [isSaving, setIsSaving] = useState(false)

    // Holiday modal
    const [showHolidayModal, setShowHolidayModal] = useState(false)
    const [newHolidayDate, setNewHolidayDate] = useState('')
    const [newHolidayDesc, setNewHolidayDesc] = useState('')

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [schedulesRes, configRes, holidaysRes] = await Promise.all([
                fetch('/api/analytics?type=schedules'),
                fetch('/api/game-config'),
                fetch('/api/analytics?type=holidays')
            ])

            if (schedulesRes.ok) {
                const { schedules: data } = await schedulesRes.json()
                setSchedules(data || [])
            }

            if (configRes.ok) {
                const { config: data } = await configRes.json()
                if (data) {
                    setConfig(data)
                    setEditingSingle(data.payout_single * 10)
                    setEditingJodi(data.payout_jodi * 10)
                    setEditingTriple(data.payout_triple * 10)
                }
            }

            if (holidaysRes.ok) {
                const { holidays: data } = await holidaysRes.json()
                setHolidays(data || [])
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error)
            toast.error('Failed to load settings')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleSavePayouts = async () => {
        setIsSaving(true)
        try {
            const response = await fetch('/api/game-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payout_single: editingSingle / 10,
                    payout_jodi: editingJodi / 10,
                    payout_triple: editingTriple / 10
                })
            })

            if (!response.ok) {
                throw new Error('Failed to save')
            }

            toast.success('Payout settings saved!')
            await fetchData()
        } catch (error) {
            toast.error('Failed to save payout settings')
        } finally {
            setIsSaving(false)
        }
    }

    const handleResetPayouts = () => {
        setEditingSingle(config.payout_single * 10)
        setEditingJodi(config.payout_jodi * 10)
        setEditingTriple(config.payout_triple * 10)
    }

    const handleAddHoliday = async () => {
        if (!newHolidayDate) {
            toast.error('Please select a date')
            return
        }

        try {
            const response = await fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_holiday',
                    holidayDate: newHolidayDate,
                    description: newHolidayDesc || null
                })
            })

            if (!response.ok) {
                throw new Error('Failed to add holiday')
            }

            toast.success('Holiday added!')
            setShowHolidayModal(false)
            setNewHolidayDate('')
            setNewHolidayDesc('')
            await fetchData()
        } catch (error) {
            toast.error('Failed to add holiday')
        }
    }

    const handleRemoveHoliday = async (date: string) => {
        if (!confirm('Remove this holiday?')) return

        try {
            const response = await fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'remove_holiday',
                    holidayDate: date
                })
            })

            if (!response.ok) {
                throw new Error('Failed to remove holiday')
            }

            toast.success('Holiday removed!')
            await fetchData()
        } catch (error) {
            toast.error('Failed to remove holiday')
        }
    }

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '-'
        const [hours, minutes] = timeStr.split(':')
        const hour = parseInt(hours)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const displayHour = hour % 12 || 12
        return `${displayHour}:${minutes} ${ampm}`
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Game Settings</h1>
                    <p className="text-gray-400">
                        Configure game timings, payouts, and holidays
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="btn btn-secondary flex items-center gap-2"
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {/* Game Schedule */}
            <Card>
                <CardHeader
                    title="Game Schedule"
                    subtitle="Current betting windows and result times"
                    action={<Clock className="text-[var(--primary-400)]" size={20} />}
                />

                <div className="space-y-6">
                    {schedules.map((schedule) => (
                        <div key={schedule.session_name} className="p-4 rounded-lg bg-[var(--bg-surface)]">
                            <h3 className="font-semibold text-lg mb-4 capitalize">
                                {schedule.session_name} Game
                            </h3>

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Betting Starts</p>
                                    <p className="font-mono text-lg">{formatTime(schedule.start_time)}</p>
                                </div>

                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Open Lock Time</p>
                                    <p className="font-mono">
                                        {formatTime(schedule.open_bet_freeze_time)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Open Result Time</p>
                                    <Badge variant="info">{formatTime(schedule.open_result_time)}</Badge>
                                </div>

                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Close Lock Time</p>
                                    <p className="font-mono">
                                        {formatTime(schedule.close_bet_freeze_time)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Close Result Time</p>
                                    <Badge variant="success">{formatTime(schedule.close_result_time)}</Badge>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 p-3 rounded-lg bg-[var(--status-info)]/10 border border-[var(--status-info)]/30">
                    <p className="text-sm text-[var(--status-info)]">
                        ℹ️ Game schedules are configured in the database. Contact system admin for schedule changes.
                    </p>
                </div>
            </Card>

            {/* Payout Multipliers */}
            <Card>
                <CardHeader
                    title="Payout Multipliers"
                    subtitle="Configure payout rates for each game type"
                    action={<DollarSign className="text-[var(--accent-yellow)]" size={20} />}
                />

                <div className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="p-4 rounded-lg bg-[var(--bg-surface)] text-center">
                            <p className="text-sm text-[var(--text-muted)] mb-2">Single (0-9)</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-[var(--text-muted)]">₹10 →</span>
                                <Input
                                    type="number"
                                    value={editingSingle}
                                    onChange={(e) => setEditingSingle(Number(e.target.value))}
                                    className="w-24 text-center font-bold text-lg"
                                />
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-2">
                                Multiplier: {(editingSingle / 10).toFixed(1)}x
                            </p>
                        </div>

                        <div className="p-4 rounded-lg bg-[var(--bg-surface)] text-center">
                            <p className="text-sm text-[var(--text-muted)] mb-2">Jodi (00-99)</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-[var(--text-muted)]">₹10 →</span>
                                <Input
                                    type="number"
                                    value={editingJodi}
                                    onChange={(e) => setEditingJodi(Number(e.target.value))}
                                    className="w-24 text-center font-bold text-lg"
                                />
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-2">
                                Multiplier: {(editingJodi / 10).toFixed(1)}x
                            </p>
                        </div>

                        <div className="p-4 rounded-lg bg-[var(--bg-surface)] text-center">
                            <p className="text-sm text-[var(--text-muted)] mb-2">Triple (000-999)</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-[var(--text-muted)]">₹10 →</span>
                                <Input
                                    type="number"
                                    value={editingTriple}
                                    onChange={(e) => setEditingTriple(Number(e.target.value))}
                                    className="w-24 text-center font-bold text-lg"
                                />
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-2">
                                Multiplier: {(editingTriple / 10).toFixed(1)}x
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={handleResetPayouts}
                            icon={<RefreshCw size={18} />}
                        >
                            Reset
                        </Button>
                        <Button
                            onClick={handleSavePayouts}
                            isLoading={isSaving}
                            icon={<Save size={18} />}
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Holiday Management */}
            <Card>
                <CardHeader
                    title="Holiday Management"
                    subtitle="Days when betting is disabled"
                    action={
                        <Button
                            size="sm"
                            onClick={() => setShowHolidayModal(true)}
                            icon={<Plus size={16} />}
                        >
                            Add Holiday
                        </Button>
                    }
                />

                <div className="space-y-2">
                    {holidays.length === 0 ? (
                        <p className="text-center py-8 text-[var(--text-muted)]">
                            No holidays configured
                        </p>
                    ) : (
                        holidays.map((holiday) => (
                            <div
                                key={holiday.holiday_date}
                                className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface)]"
                            >
                                <div className="flex items-center gap-3">
                                    <Calendar size={18} className="text-[var(--accent-pink)]" />
                                    <div>
                                        <p className="font-medium">{holiday.holiday_date}</p>
                                        {holiday.description && (
                                            <p className="text-xs text-[var(--text-muted)]">{holiday.description}</p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveHoliday(holiday.holiday_date)}
                                    className="p-2 rounded-lg hover:bg-[var(--status-error)]/10 text-[var(--status-error)] transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            {/* System Status */}
            <Card>
                <CardHeader
                    title="System Status"
                    subtitle="Current system health and status"
                />

                <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-[var(--bg-surface)] flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Database</p>
                            <p className="font-medium">Supabase</p>
                        </div>
                        <Badge variant="success" dot>Connected</Badge>
                    </div>

                    <div className="p-4 rounded-lg bg-[var(--bg-surface)] flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Schedules</p>
                            <p className="font-medium">{schedules.length} Sessions</p>
                        </div>
                        <Badge variant="info">Active</Badge>
                    </div>

                    <div className="p-4 rounded-lg bg-[var(--bg-surface)] flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Holidays</p>
                            <p className="font-medium">{holidays.length} Configured</p>
                        </div>
                        <Badge variant="default">{holidays.length > 0 ? 'Set' : 'None'}</Badge>
                    </div>
                </div>
            </Card>

            {/* Add Holiday Modal */}
            <Modal
                isOpen={showHolidayModal}
                onClose={() => setShowHolidayModal(false)}
                title="Add Holiday"
            >
                <div className="space-y-4">
                    <Input
                        label="Date"
                        type="date"
                        value={newHolidayDate}
                        onChange={(e) => setNewHolidayDate(e.target.value)}
                    />
                    <Input
                        label="Description (optional)"
                        value={newHolidayDesc}
                        onChange={(e) => setNewHolidayDesc(e.target.value)}
                        placeholder="e.g., Diwali, Christmas..."
                    />
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => setShowHolidayModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleAddHoliday}
                        >
                            Add Holiday
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
