'use client'

import { GameResult, SessionType } from '@/types/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface CurrentResultProps {
    result: GameResult | null
    slot: SessionType
    isLive?: boolean
}

export function CurrentResult({ result, slot, isLive = false }: CurrentResultProps) {
    const slotLabel = slot === 'morning' ? 'Morning Game' : 'Night Game'

    if (!result) {
        return (
            <Card variant="result" className="animate-fade-in">
                <div className="flex flex-col items-center py-8">
                    <Badge variant="info" dot>{slotLabel}</Badge>
                    <p className="text-[var(--text-muted)] mt-4">Waiting for result...</p>
                    <div className="flex gap-4 mt-6">
                        <ResultPlaceholder label="Open" />
                        <ResultPlaceholder label="Jodi" />
                        <ResultPlaceholder label="Close" />
                    </div>
                </div>
            </Card>
        )
    }

    return (
        <Card variant="result" className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <Badge variant={isLive ? 'error' : 'success'} dot>
                    {isLive ? 'LIVE' : slotLabel}
                </Badge>
                <span className="text-sm text-[var(--text-muted)]">{result.game_date}</span>
            </div>

            <div className="flex justify-center items-center gap-4 md:gap-8">
                {/* Open Triple & Single */}
                <div className="text-center">
                    <p className="text-xs text-[var(--text-muted)] mb-2">OPEN</p>
                    <div className="result-number text-[var(--accent-cyan)] animate-number-reveal">
                        {result.is_open_declared ? result.open_triple : '***'}
                    </div>
                    <div className="text-2xl font-bold text-white mt-2">
                        {result.is_open_declared ? result.open_single : '*'}
                    </div>
                </div>

                {/* Jodi */}
                <div className="text-center px-4 md:px-8 border-x border-[var(--glass-border)]">
                    <p className="text-xs text-[var(--text-muted)] mb-2">JODI</p>
                    <div className="result-number text-[var(--accent-pink)] animate-number-reveal">
                        {result.is_close_declared ? result.jodi_result : '**'}
                    </div>
                </div>

                {/* Close Triple & Single */}
                <div className="text-center">
                    <p className="text-xs text-[var(--text-muted)] mb-2">CLOSE</p>
                    <div className="result-number text-[var(--accent-green)] animate-number-reveal">
                        {result.is_close_declared ? result.close_triple : '***'}
                    </div>
                    <div className="text-2xl font-bold text-white mt-2">
                        {result.is_close_declared ? result.close_single : '*'}
                    </div>
                </div>
            </div>
        </Card>
    )
}

function ResultPlaceholder({ label }: { label: string }) {
    return (
        <div className="text-center">
            <p className="text-xs text-[var(--text-muted)] mb-2">{label}</p>
            <div className="text-4xl font-bold text-[var(--text-muted)] animate-pulse">
                {label === 'Jodi' ? '**' : '***'}
            </div>
        </div>
    )
}

