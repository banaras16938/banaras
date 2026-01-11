'use client'

import { CurrentResult } from '@/components/results/CurrentResult'
import { ResultHistory } from '@/components/results/ResultHistory'
import { Card, CardHeader } from '@/components/ui'
import { GameResult } from '@/types/types'

// Mock data (same as public page)
const mockMorningResult: GameResult = {
    id: '1',
    game_date: '2026-01-11',
    slot: 'morning',
    open_triple: '578',
    open_single: 0,
    close_triple: '478',
    close_single: 9,
    jodi: '09',
    is_open_declared: true,
    is_close_declared: true,
    declared_by: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
}

const mockNightResult: GameResult = {
    id: '2',
    game_date: '2026-01-11',
    slot: 'night',
    open_triple: null,
    open_single: null,
    close_triple: null,
    close_single: null,
    jodi: null,
    is_open_declared: false,
    is_close_declared: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
}

const mockHistoricalResults: GameResult[] = [
    mockMorningResult,
    {
        id: '3',
        game_date: '2026-01-10',
        slot: 'morning',
        open_triple: '234',
        open_single: 9,
        close_triple: '567',
        close_single: 8,
        jodi: '98',
        is_open_declared: true,
        is_close_declared: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '4',
        game_date: '2026-01-10',
        slot: 'night',
        open_triple: '890',
        open_single: 7,
        close_triple: '123',
        close_single: 6,
        jodi: '76',
        is_open_declared: true,
        is_close_declared: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
]

export default function StaffResultsPage() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold">Declared Results</h1>
                <p className="text-[var(--text-secondary)]">
                    View today&apos;s and historical game results
                </p>
            </div>

            {/* Today's Results */}
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-sm text-[var(--text-muted)] mb-3 uppercase tracking-wide">
                        Morning Game
                    </h3>
                    <CurrentResult result={mockMorningResult} slot="morning" />
                </div>
                <div>
                    <h3 className="text-sm text-[var(--text-muted)] mb-3 uppercase tracking-wide">
                        Night Game
                    </h3>
                    <CurrentResult result={mockNightResult} slot="night" />
                </div>
            </div>

            {/* Result History */}
            <Card>
                <CardHeader
                    title="Result History"
                    subtitle="Previous game results"
                />
                <ResultHistory results={mockHistoricalResults} />
            </Card>
        </div>
    )
}
