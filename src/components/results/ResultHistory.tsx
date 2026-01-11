'use client'

import { GameResult } from '@/types/types'
import { Badge } from '@/components/ui/Badge'

interface ResultHistoryProps {
    results: GameResult[]
    limit?: number
}

export function ResultHistory({ results, limit }: ResultHistoryProps) {
    const displayResults = limit ? results.slice(0, limit) : results

    if (displayResults.length === 0) {
        return (
            <div className="text-center py-12 text-[var(--text-muted)]">
                No results available
            </div>
        )
    }

    return (
        <div className="table-container">
            <table className="table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Session</th>
                        <th>Open Triple</th>
                        <th>Open Single</th>
                        <th>Jodi</th>
                        <th>Close Single</th>
                        <th>Close Triple</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {displayResults.map((result) => (
                        <tr key={result.id} className="animate-fade-in">
                            <td className="font-medium">{result.game_date}</td>
                            <td>
                                <Badge variant={result.session_name === 'morning' ? 'info' : 'warning'}>
                                    {result.session_name === 'morning' ? 'Morning' : 'Night'}
                                </Badge>
                            </td>
                            <td className="font-mono text-[var(--accent-cyan)]">
                                {result.open_triple || '-'}
                            </td>
                            <td className="font-mono text-white">{result.open_single ?? '-'}</td>
                            <td className="font-mono text-[var(--accent-pink)] font-bold">
                                {result.jodi_result || '-'}
                            </td>
                            <td className="font-mono text-white">{result.close_single ?? '-'}</td>
                            <td className="font-mono text-[var(--accent-green)]">
                                {result.close_triple || '-'}
                            </td>
                            <td>
                                {result.is_close_declared ? (
                                    <Badge variant="success">Complete</Badge>
                                ) : result.is_open_declared ? (
                                    <Badge variant="warning">Partial</Badge>
                                ) : (
                                    <Badge variant="default">Pending</Badge>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

