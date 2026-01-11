'use client'

import { useState, useEffect, useCallback } from 'react'
import { CurrentResult } from '@/components/results/CurrentResult'
import { ResultHistory } from '@/components/results/ResultHistory'
import { GameTimeline } from '@/components/results/GameTimeline'
import { Card, CardHeader } from '@/components/ui'
import { GameResult, SessionType } from '@/types/types'
import { Trophy, Clock, History, Sparkles } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState<'results' | 'schedule' | 'history'>('results')
  const [morningResult, setMorningResult] = useState<GameResult | null>(null)
  const [nightResult, setNightResult] = useState<GameResult | null>(null)
  const [historicalResults, setHistoricalResults] = useState<GameResult[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchResults = useCallback(async () => {
    try {
      const response = await fetch('/api/results?limit=30')
      const data = await response.json()

      if (data.results) {
        const today = new Date().toISOString().split('T')[0]

        // Find today's results (using session_name field from new schema)
        const todayMorning = data.results.find(
          (r: GameResult) => r.game_date === today && r.session_name === 'morning'
        )
        const todayNight = data.results.find(
          (r: GameResult) => r.game_date === today && r.session_name === 'night'
        )

        setMorningResult(todayMorning || createEmptyResult(today, 'morning'))
        setNightResult(todayNight || createEmptyResult(today, 'night'))
        setHistoricalResults(data.results)
      }
    } catch (error) {
      console.error('Failed to fetch results:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Create empty result placeholder
  const createEmptyResult = (date: string, session: SessionType): GameResult => ({
    id: `empty-${session}`,
    game_date: date,
    session_name: session,
    open_triple: null,
    open_single: null,
    close_triple: null,
    close_single: null,
    jodi_result: null,
    is_open_declared: false,
    is_close_declared: false,
    created_at: new Date().toISOString(),
  })

  useEffect(() => {
    fetchResults()

    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    // Set up real-time subscription (new table name: game_sessions)
    const supabase = createClient()
    const channel = supabase
      .channel('results-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_sessions' },
        () => {
          fetchResults() // Refresh when results change
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [fetchResults])


  return (
    <div className="min-h-screen bg-[var(--bg-dark)]">
      {/* Hero Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-600)]/20 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--primary-500)] rounded-full blur-[200px] opacity-20" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="text-[var(--accent-yellow)] animate-pulse" size={32} />
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">
              Game Results
            </h1>
            <Sparkles className="text-[var(--accent-yellow)] animate-pulse" size={32} />
          </div>
          <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto">
            View live game results, historical data, and betting schedules
          </p>

          {/* Current Time Display */}
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--glass-border)]">
            <Clock size={18} className="text-[var(--primary-400)]" />
            <span className="font-mono text-lg">
              {currentTime.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="sticky top-0 z-50 bg-[var(--bg-dark)]/80 backdrop-blur-lg border-b border-[var(--glass-border)]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1">
            <TabButton
              active={activeTab === 'results'}
              onClick={() => setActiveTab('results')}
              icon={<Trophy size={18} />}
            >
              Live Results
            </TabButton>
            <TabButton
              active={activeTab === 'schedule'}
              onClick={() => setActiveTab('schedule')}
              icon={<Clock size={18} />}
            >
              Schedule
            </TabButton>
            <TabButton
              active={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              icon={<History size={18} />}
            >
              History
            </TabButton>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'results' && (
          <div className="space-y-8 animate-fade-in">
            {/* Today's Results */}
            <section>
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <Trophy className="text-[var(--accent-yellow)]" />
                Today&apos;s Results
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Morning Game */}
                <div>
                  <h3 className="text-sm text-[var(--text-muted)] mb-3 uppercase tracking-wide">
                    Morning Game • 1:00 PM & 3:00 PM
                  </h3>
                  {isLoading ? (
                    <Card className="animate-pulse h-48"><div /></Card>
                  ) : morningResult && (
                    <CurrentResult result={morningResult} slot="morning" />
                  )}
                </div>

                {/* Night Game */}
                <div>
                  <h3 className="text-sm text-[var(--text-muted)] mb-3 uppercase tracking-wide">
                    Night Game • 6:00 PM & 8:00 PM
                  </h3>
                  {isLoading ? (
                    <Card className="animate-pulse h-48"><div /></Card>
                  ) : nightResult && (
                    <CurrentResult result={nightResult} slot="night" isLive={!nightResult.is_close_declared} />
                  )}
                </div>
              </div>
            </section>

            {/* Game Info Cards */}
            <section className="grid md:grid-cols-3 gap-4">
              <Card className="text-center">
                <div className="text-3xl font-bold text-[var(--accent-cyan)] mb-2">9x</div>
                <p className="text-sm text-[var(--text-secondary)]">Single Payout</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">₹10 → ₹90</p>
              </Card>
              <Card className="text-center">
                <div className="text-3xl font-bold text-[var(--accent-pink)] mb-2">90x</div>
                <p className="text-sm text-[var(--text-secondary)]">Jodi Payout</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">₹10 → ₹900</p>
              </Card>
              <Card className="text-center">
                <div className="text-3xl font-bold text-[var(--accent-green)] mb-2">800x</div>
                <p className="text-sm text-[var(--text-secondary)]">Triple Payout</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">₹10 → ₹8000</p>
              </Card>
            </section>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <Clock className="text-[var(--primary-400)]" />
              Game Schedule
            </h2>
            <GameTimeline currentTime={currentTime} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-fade-in">
            <Card>
              <CardHeader
                title="Result History"
                subtitle="View all previous game results"
              />
              <ResultHistory results={historicalResults} />
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--glass-border)] py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-[var(--text-muted)] text-sm">
            Results are for viewing only. Contact authorized staff for betting.
          </p>
        </div>
      </footer>
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}

function TabButton({ active, onClick, icon, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-4 font-medium transition-all border-b-2 ${active
        ? 'text-[var(--primary-400)] border-[var(--primary-400)]'
        : 'text-[var(--text-secondary)] border-transparent hover:text-white'
        }`}
    >
      {icon}
      {children}
    </button>
  )
}
