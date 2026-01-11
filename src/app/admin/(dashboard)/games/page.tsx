'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PAYOUT_MULTIPLIERS } from '@/types/types'

// Default schedule for display (should be fetched from API in future)
const GAME_SCHEDULE = [
    {
        slot: 'Morning',
        bettingStart: '09:00',
        openStopWindow: { start: '12:45', end: '13:00' },
        openResult: '1:00 PM',
        closeStopWindow: { start: '14:45', end: '15:00' },
        closeResult: '3:00 PM'
    },
    {
        slot: 'Night',
        bettingStart: '16:00',
        openStopWindow: { start: '17:45', end: '18:00' },
        openResult: '6:00 PM',
        closeStopWindow: { start: '19:45', end: '20:00' },
        closeResult: '8:00 PM'
    }
]
import { Clock, DollarSign, Save, RefreshCw } from 'lucide-react'

export default function GameSettingsPage() {
    const [singlePayout, setSinglePayout] = useState<number>(PAYOUT_MULTIPLIERS.single)
    const [jodiPayout, setJodiPayout] = useState<number>(PAYOUT_MULTIPLIERS.jodi)
    const [triplePayout, setTriplePayout] = useState<number>(PAYOUT_MULTIPLIERS.triple)
    const [isSaving, setIsSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const handleSave = async () => {
        setIsSaving(true)
        // TODO: Save to Supabase
        await new Promise(resolve => setTimeout(resolve, 1000))
        setIsSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    const handleReset = () => {
        setSinglePayout(PAYOUT_MULTIPLIERS.single)
        setJodiPayout(PAYOUT_MULTIPLIERS.jodi)
        setTriplePayout(PAYOUT_MULTIPLIERS.triple)
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold">Game Settings</h1>
                <p className="text-[var(--text-secondary)]">
                    Configure game timings and payout multipliers
                </p>
            </div>

            {/* Game Schedule */}
            <Card>
                <CardHeader
                    title="Game Schedule"
                    subtitle="Current betting windows and result times"
                    action={<Clock className="text-[var(--primary-400)]" size={20} />}
                />

                <div className="space-y-6">
                    {GAME_SCHEDULE.map((schedule) => (
                        <div key={schedule.slot} className="p-4 rounded-lg bg-[var(--bg-surface)]">
                            <h3 className="font-semibold text-lg mb-4 capitalize">
                                {schedule.slot} Game
                            </h3>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Betting Starts</p>
                                    <p className="font-mono text-lg">{schedule.bettingStart} AM</p>
                                </div>

                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Open Lock Window</p>
                                    <p className="font-mono">
                                        {schedule.openStopWindow.start} - {schedule.openStopWindow.end}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Open Result Time</p>
                                    <Badge variant="info">{schedule.openResult}</Badge>
                                </div>

                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Close Lock Window</p>
                                    <p className="font-mono">
                                        {schedule.closeStopWindow.start} - {schedule.closeStopWindow.end}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Close Result Time</p>
                                    <Badge variant="success">{schedule.closeResult}</Badge>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 p-3 rounded-lg bg-[var(--status-info)]/10 border border-[var(--status-info)]/30">
                    <p className="text-sm text-[var(--status-info)]">
                        ℹ️ Game schedules are system-controlled and cannot be modified from this interface.
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
                                    value={singlePayout * 10}
                                    onChange={(e) => setSinglePayout(Number(e.target.value) / 10)}
                                    className="w-24 text-center font-bold text-lg"
                                />
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-2">
                                Multiplier: {singlePayout}x
                            </p>
                        </div>

                        <div className="p-4 rounded-lg bg-[var(--bg-surface)] text-center">
                            <p className="text-sm text-[var(--text-muted)] mb-2">Jodi (00-99)</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-[var(--text-muted)]">₹10 →</span>
                                <Input
                                    type="number"
                                    value={jodiPayout * 10}
                                    onChange={(e) => setJodiPayout(Number(e.target.value) / 10)}
                                    className="w-24 text-center font-bold text-lg"
                                />
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-2">
                                Multiplier: {jodiPayout}x
                            </p>
                        </div>

                        <div className="p-4 rounded-lg bg-[var(--bg-surface)] text-center">
                            <p className="text-sm text-[var(--text-muted)] mb-2">Triple (000-999)</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-[var(--text-muted)]">₹10 →</span>
                                <Input
                                    type="number"
                                    value={triplePayout * 10}
                                    onChange={(e) => setTriplePayout(Number(e.target.value) / 10)}
                                    className="w-24 text-center font-bold text-lg"
                                />
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-2">
                                Multiplier: {triplePayout}x
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={handleReset}
                            icon={<RefreshCw size={18} />}
                        >
                            Reset to Defaults
                        </Button>
                        <Button
                            onClick={handleSave}
                            isLoading={isSaving}
                            icon={saved ? <Badge variant="success">Saved!</Badge> : <Save size={18} />}
                        >
                            {saved ? 'Saved!' : 'Save Changes'}
                        </Button>
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
                            <p className="text-sm text-[var(--text-muted)]">Database</p>
                            <p className="font-medium">Supabase</p>
                        </div>
                        <Badge variant="success" dot>Connected</Badge>
                    </div>

                    <div className="p-4 rounded-lg bg-[var(--bg-surface)] flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Active Sessions</p>
                            <p className="font-medium">12 Staff Online</p>
                        </div>
                        <Badge variant="info">Active</Badge>
                    </div>

                    <div className="p-4 rounded-lg bg-[var(--bg-surface)] flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Betting Status</p>
                            <p className="font-medium">Open</p>
                        </div>
                        <Badge variant="success" dot>Live</Badge>
                    </div>
                </div>
            </Card>
        </div>
    )
}
