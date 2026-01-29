'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Clock, DollarSign, Save, RefreshCw, Calendar, Trash2, Plus, Edit2, Lock } from 'lucide-react'
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

    // Schedule editing
    const [showScheduleModal, setShowScheduleModal] = useState(false)
    const [editingSchedule, setEditingSchedule] = useState<GameSchedule | null>(null)
    const [isSavingSchedule, setIsSavingSchedule] = useState(false)

    // PIN management
    const [currentPin, setCurrentPin] = useState('')
    const [newPin, setNewPin] = useState('')
    const [confirmPin, setConfirmPin] = useState('')
    const [isSavingPin, setIsSavingPin] = useState(false)

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

    const handleEditSchedule = (schedule: GameSchedule) => {
        setEditingSchedule({ ...schedule })
        setShowScheduleModal(true)
    }

    const handleSaveSchedule = async () => {
        if (!editingSchedule) return

        setIsSavingSchedule(true)
        try {
            const response = await fetch('/api/game-schedules', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingSchedule)
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to save schedule')
            }

            toast.success(`${editingSchedule.session_name} schedule updated!`)
            setShowScheduleModal(false)
            setEditingSchedule(null)
            await fetchData()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to save schedule')
        } finally {
            setIsSavingSchedule(false)
        }
    }

    const formatTimeForInput = (timeStr: string) => {
        if (!timeStr) return ''
        // Convert HH:MM:SS to HH:MM for input
        return timeStr.substring(0, 5)
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
                    <p className="text-gray-200">
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
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-lg capitalize text-white">
                                    {schedule.session_name} Game
                                </h3>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleEditSchedule(schedule)}
                                    icon={<Edit2 size={14} />}
                                >
                                    Edit
                                </Button>
                            </div>

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs text-gray-200 mb-1">Betting Starts</p>
                                    <p className="font-mono text-lg text-white">{formatTime(schedule.start_time)}</p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-200 mb-1">Open Lock Time</p>
                                    <p className="font-mono text-white">
                                        {formatTime(schedule.open_bet_freeze_time)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-200 mb-1">Open Result Time</p>
                                    <Badge variant="info">{formatTime(schedule.open_result_time)}</Badge>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-200 mb-1">Close Lock Time</p>
                                    <p className="font-mono text-white">
                                        {formatTime(schedule.close_bet_freeze_time)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-200 mb-1">Close Result Time</p>
                                    <Badge variant="success">{formatTime(schedule.close_result_time)}</Badge>
                                </div>
                            </div>
                        </div>
                    ))}
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
                            <p className="text-sm text-gray-200 mb-2">Single (0-9)</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-gray-200">₹10 →</span>
                                <Input
                                    type="number"
                                    value={editingSingle}
                                    onChange={(e) => setEditingSingle(Number(e.target.value))}
                                    className="w-24 text-center font-bold text-lg text-white"
                                />
                            </div>
                            <p className="text-xs text-gray-200 mt-2">
                                Multiplier: {(editingSingle / 10).toFixed(1)}x
                            </p>
                        </div>

                        <div className="p-4 rounded-lg bg-[var(--bg-surface)] text-center">
                            <p className="text-sm text-gray-200 mb-2">Jodi (00-99)</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-gray-200">₹10 →</span>
                                <Input
                                    type="number"
                                    value={editingJodi}
                                    onChange={(e) => setEditingJodi(Number(e.target.value))}
                                    className="w-24 text-center font-bold text-lg text-white"
                                />
                            </div>
                            <p className="text-xs text-gray-200 mt-2">
                                Multiplier: {(editingJodi / 10).toFixed(1)}x
                            </p>
                        </div>

                        <div className="p-4 rounded-lg bg-[var(--bg-surface)] text-center">
                            <p className="text-sm text-gray-200 mb-2">Triple (000-999)</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-gray-200">₹10 →</span>
                                <Input
                                    type="number"
                                    value={editingTriple}
                                    onChange={(e) => setEditingTriple(Number(e.target.value))}
                                    className="w-24 text-center font-bold text-lg text-white"
                                />
                            </div>
                            <p className="text-xs text-gray-200 mt-2">
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
                        <p className="text-center py-8 text-gray-400">
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
                                        <p className="font-medium text-white">{holiday.holiday_date}</p>
                                        {holiday.description && (
                                            <p className="text-xs text-gray-300">{holiday.description}</p>
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

            {/* PIN Management */}
            <Card>
                <CardHeader
                    title="Hisab-Kitab PIN"
                    subtitle="Change the PIN used to view sensitive financial data"
                    action={<Lock className="text-purple-400" size={20} />}
                />

                <div className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-200">Current PIN</label>
                            <Input
                                type="password"
                                value={currentPin}
                                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="****"
                                maxLength={4}
                                className="text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-200">New PIN</label>
                            <Input
                                type="password"
                                value={newPin}
                                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="****"
                                maxLength={4}
                                className="text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-200">Confirm New PIN</label>
                            <Input
                                type="password"
                                value={confirmPin}
                                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="****"
                                maxLength={4}
                                className="text-white"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={async () => {
                                if (newPin.length !== 4) {
                                    toast.error('PIN must be 4 digits')
                                    return
                                }
                                if (newPin !== confirmPin) {
                                    toast.error('New PINs do not match')
                                    return
                                }
                                setIsSavingPin(true)
                                try {
                                    const response = await fetch('/api/analytics', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            action: 'update_pin',
                                            currentPin,
                                            newPin
                                        })
                                    })
                                    const data = await response.json()
                                    if (!response.ok) {
                                        throw new Error(data.error || 'Failed to update PIN')
                                    }
                                    toast.success('PIN updated successfully!')
                                    setCurrentPin('')
                                    setNewPin('')
                                    setConfirmPin('')
                                } catch (error) {
                                    toast.error(error instanceof Error ? error.message : 'Failed to update PIN')
                                } finally {
                                    setIsSavingPin(false)
                                }
                            }}
                            isLoading={isSavingPin}
                            icon={<Save size={16} />}
                            disabled={!currentPin || !newPin || !confirmPin}
                        >
                            Change PIN
                        </Button>
                        <p className="text-xs text-gray-200">
                            Default PIN is 6747. Change it to something secure.
                        </p>
                    </div>
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
                            <p className="text-sm text-gray-200">Database</p>
                            <p className="font-medium text-white">Supabase</p>
                        </div>
                        <Badge variant="success" dot>Connected</Badge>
                    </div>

                    <div className="p-4 rounded-lg bg-[var(--bg-surface)] flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-200">Schedules</p>
                            <p className="font-medium text-white">{schedules.length} Sessions</p>
                        </div>
                        <Badge variant="info">Active</Badge>
                    </div>

                    <div className="p-4 rounded-lg bg-[var(--bg-surface)] flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-200">Holidays</p>
                            <p className="font-medium text-white">{holidays.length} Configured</p>
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

            {/* Edit Schedule Modal */}
            <Modal
                isOpen={showScheduleModal}
                onClose={() => {
                    setShowScheduleModal(false)
                    setEditingSchedule(null)
                }}
                title={`Edit ${editingSchedule?.session_name ? editingSchedule.session_name.charAt(0).toUpperCase() + editingSchedule.session_name.slice(1) : ''} Schedule`}
            >
                {editingSchedule && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Betting Starts"
                                type="time"
                                value={formatTimeForInput(editingSchedule.start_time)}
                                onChange={(e) => setEditingSchedule({
                                    ...editingSchedule,
                                    start_time: e.target.value
                                })}
                            />
                            <Input
                                label="Open Lock Time"
                                type="time"
                                value={formatTimeForInput(editingSchedule.open_bet_freeze_time)}
                                onChange={(e) => setEditingSchedule({
                                    ...editingSchedule,
                                    open_bet_freeze_time: e.target.value
                                })}
                            />
                            <Input
                                label="Open Result Time"
                                type="time"
                                value={formatTimeForInput(editingSchedule.open_result_time)}
                                onChange={(e) => setEditingSchedule({
                                    ...editingSchedule,
                                    open_result_time: e.target.value
                                })}
                            />
                            <Input
                                label="Close Resume Time (optional)"
                                type="time"
                                value={formatTimeForInput(editingSchedule.close_bet_resume_time || '')}
                                onChange={(e) => setEditingSchedule({
                                    ...editingSchedule,
                                    close_bet_resume_time: e.target.value || null
                                })}
                            />
                            <Input
                                label="Close Lock Time"
                                type="time"
                                value={formatTimeForInput(editingSchedule.close_bet_freeze_time)}
                                onChange={(e) => setEditingSchedule({
                                    ...editingSchedule,
                                    close_bet_freeze_time: e.target.value
                                })}
                            />
                            <Input
                                label="Close Result Time"
                                type="time"
                                value={formatTimeForInput(editingSchedule.close_result_time)}
                                onChange={(e) => setEditingSchedule({
                                    ...editingSchedule,
                                    close_result_time: e.target.value
                                })}
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => {
                                    setShowScheduleModal(false)
                                    setEditingSchedule(null)
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleSaveSchedule}
                                isLoading={isSavingSchedule}
                                icon={<Save size={16} />}
                            >
                                Save Schedule
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
