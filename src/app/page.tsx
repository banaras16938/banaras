'use client'

import { useState, useEffect, useCallback } from 'react'
import { CurrentResult } from '@/components/results/CurrentResult'
import { JodiChart } from '@/components/results/JodiChart'
import { PanelChart } from '@/components/results/PanelChart'
import { GameTimeline } from '@/components/results/GameTimeline'
import { GameResult, GameSchedule, SessionType, sessionToResult, GameSession } from '@/types/types'
import { Trophy, Calendar, FileText, Sun, Moon } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type TabType = 'results' | 'schedule' | 'past'
type ChartType = 'jodi' | 'panel'

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState<TabType>('results')
  const [activeChart, setActiveChart] = useState<ChartType>('jodi')
  const [morningResult, setMorningResult] = useState<GameResult | null>(null)
  const [nightResult, setNightResult] = useState<GameResult | null>(null)
  const [historicalResults, setHistoricalResults] = useState<GameResult[]>([])
  const [schedules, setSchedules] = useState<GameSchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDark, setIsDark] = useState(false)

  // Get schedule for a specific session
  const getScheduleForSession = useCallback((session: SessionType): GameSchedule | undefined => {
    return schedules.find(s => s.session_name === session)
  }, [schedules])

  // Theme toggle effect
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
    setIsDark(shouldBeDark)
    document.documentElement.classList.toggle('dark', shouldBeDark)
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    document.documentElement.classList.toggle('dark', newTheme)
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
  }

  // Fetch schedules from database
  const fetchSchedules = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('game_schedules')
        .select('*')

      if (error) {
        console.error('Failed to fetch schedules:', error)
        return
      }

      if (data && data.length > 0) {
        setSchedules(data)
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error)
    }
  }, [])

  const fetchResults = useCallback(async () => {
    try {
      const response = await fetch('/api/results?limit=30')
      const data = await response.json()

      if (data.results) {
        const today = new Date().toISOString().split('T')[0]

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

  // Handle real-time updates with payload data for instant updates
  const handleRealtimeUpdate = useCallback((payload: {
    eventType: string
    new: GameSession
    old: GameSession | null
  }) => {
    const today = new Date().toISOString().split('T')[0]

    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      const session = payload.new
      const result = sessionToResult(session)

      // Update today's results instantly if applicable
      if (session.game_date === today) {
        if (session.session_name === 'morning') {
          setMorningResult(result)
        } else if (session.session_name === 'night') {
          setNightResult(result)
        }
      }

      // Update historical results
      setHistoricalResults(prev => {
        const existingIndex = prev.findIndex(r => r.id === session.id)
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = result
          return updated
        } else {
          // New result - add to beginning and maintain sort order
          return [result, ...prev].sort((a, b) =>
            new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
          )
        }
      })
    }
  }, [])

  useEffect(() => {
    // Initial data fetch
    fetchResults()
    fetchSchedules()

    // Update clock every second
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Set up real-time subscription with optimistic updates
    const supabase = createClient()
    const channel = supabase
      .channel('results-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_sessions' },
        (payload) => {
          // Handle the update with payload data for instant UI update
          // Type narrowing for Supabase realtime payload
          const realtimePayload = payload as unknown as {
            eventType: string
            new: GameSession
            old: GameSession | null
          }
          if (realtimePayload.new && realtimePayload.eventType) {
            handleRealtimeUpdate(realtimePayload)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Real-time subscription active')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Real-time subscription error, falling back to polling')
          // Fallback: refetch on error
          fetchResults()
        }
      })

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [fetchResults, fetchSchedules, handleRealtimeUpdate])


  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <img src="/logo-1.png" alt="Banaras Matka Play" className="header-logo" />
        <div className="header-right">
          <div className="header-time">
            <span className="time-display">
              {currentTime.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })}
            </span>
            <span className="date-display">
              {currentTime.toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="animate-fade-in">
            <div className="results-grid">
              {/* Morning Result Card */}
              {isLoading ? (
                <div className="result-card">
                  <div className="result-card-header">
                    <span className="time">--:--</span>
                    <span className="title">LOADING...</span>
                    <span className="time">--:--</span>
                  </div>
                  <div className="result-card-body">
                    <span className="result-value">***</span>
                    <span className="result-value jodi">**</span>
                    <span className="result-value">***</span>
                  </div>
                </div>
              ) : (
                <CurrentResult result={morningResult} slot="morning" schedule={getScheduleForSession('morning')} />
              )}

              {/* Night Result Card */}
              {isLoading ? (
                <div className="result-card">
                  <div className="result-card-header">
                    <span className="time">--:--</span>
                    <span className="title">LOADING...</span>
                    <span className="time">--:--</span>
                  </div>
                  <div className="result-card-body">
                    <span className="result-value">***</span>
                    <span className="result-value jodi">**</span>
                    <span className="result-value">***</span>
                  </div>
                </div>
              ) : (
                <CurrentResult result={nightResult} slot="night" schedule={getScheduleForSession('night')} isLive={!nightResult?.is_close_declared} />
              )}
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="animate-fade-in p-4">
            <h2 className="section-title">
              <Calendar size={20} className="text-[var(--primary-600)]" />
              Game Schedule
            </h2>
            <GameTimeline currentTime={currentTime} />
          </div>
        )}

        {/* Past Results Tab */}
        {activeTab === 'past' && (
          <div className="animate-fade-in">
            {/* Chart Type Tabs */}
            <div className="chart-tabs">
              <button
                onClick={() => setActiveChart('jodi')}
                className={`chart-tab ${activeChart === 'jodi' ? 'active' : ''}`}
              >
                Jodi Chart
              </button>
              <button
                onClick={() => setActiveChart('panel')}
                className={`chart-tab ${activeChart === 'panel' ? 'active' : ''}`}
              >
                Panel Chart
              </button>
            </div>

            {/* Chart Content */}
            {activeChart === 'jodi' ? (
              <JodiChart results={historicalResults} />
            ) : (
              <PanelChart results={historicalResults} />
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button
          onClick={() => setActiveTab('results')}
          className={`bottom-nav-item ${activeTab === 'results' ? 'active' : ''}`}
        >
          <Trophy />
          <span>Results</span>
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`bottom-nav-item ${activeTab === 'schedule' ? 'active' : ''}`}
        >
          <Calendar />
          <span>Schedule</span>
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`bottom-nav-item ${activeTab === 'past' ? 'active' : ''}`}
        >
          <FileText />
          <span>Past Results</span>
        </button>
      </nav>
    </div>
  )
}
