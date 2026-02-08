'use client'

import { useState, useEffect, useCallback } from 'react'
import { CurrentResult } from '@/components/results/CurrentResult'
import { JodiChart } from '@/components/results/JodiChart'
import { PanelChart } from '@/components/results/PanelChart'
import { GameTimeline } from '@/components/results/GameTimeline'
import { GameResult, GameSchedule, SessionType, sessionToResult, GameSession } from '@/types/types'
import { Trophy, FileText, Sun, Moon, Menu, X, BarChart3, Grid3X3, HelpCircle, AlertTriangle } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type TabType = 'results' | 'past'
type ChartType = 'jodi' | 'panel'
type PageType = 'home' | 'how-to-play' | 'disclaimer'

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState<TabType>('results')
  const [activeChart, setActiveChart] = useState<ChartType>('jodi')
  const [activePage, setActivePage] = useState<PageType>('home')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [morningResult, setMorningResult] = useState<GameResult | null>(null)
  const [nightResult, setNightResult] = useState<GameResult | null>(null)
  const [historicalResults, setHistoricalResults] = useState<GameResult[]>([])
  const [schedules, setSchedules] = useState<GameSchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDark, setIsDark] = useState(false)

  // Navigation handlers
  const navigateToChart = (chart: ChartType) => {
    setActivePage('home')
    setActiveTab('past')
    setActiveChart(chart)
    setMobileMenuOpen(false)
  }

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
        <div className="header-left">
          <img src="/logo-1.png" alt="Banaras Matka Play" className="header-logo" />

          {/* Desktop Navigation */}
          <nav className="header-nav">
            <button
              onClick={() => navigateToChart('jodi')}
              className="nav-link"
            >
              <Grid3X3 size={16} />
              Jodi Chart
            </button>
            <button
              onClick={() => navigateToChart('panel')}
              className="nav-link"
            >
              <BarChart3 size={16} />
              Panel Chart
            </button>
            <button
              onClick={() => { setActivePage('how-to-play'); setMobileMenuOpen(false) }}
              className="nav-link"
            >
              <HelpCircle size={16} />
              How to Play
            </button>
            <button
              onClick={() => { setActivePage('disclaimer'); setMobileMenuOpen(false) }}
              className="nav-link"
            >
              <AlertTriangle size={16} />
              Disclaimer
            </button>
          </nav>
        </div>

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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="mobile-nav-dropdown">
          <button
            onClick={() => navigateToChart('jodi')}
            className="mobile-nav-link"
          >
            <Grid3X3 size={18} />
            Jodi Chart
          </button>
          <button
            onClick={() => navigateToChart('panel')}
            className="mobile-nav-link"
          >
            <BarChart3 size={18} />
            Panel Chart
          </button>
          <button
            onClick={() => { setActivePage('how-to-play'); setMobileMenuOpen(false) }}
            className="mobile-nav-link"
          >
            <HelpCircle size={18} />
            How to Play
          </button>
          <button
            onClick={() => { setActivePage('disclaimer'); setMobileMenuOpen(false) }}
            className="mobile-nav-link"
          >
            <AlertTriangle size={18} />
            Disclaimer
          </button>
        </div>
      )}

      {/* Main Content */}
      <main>
        {activePage === 'home' ? (
          <>
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
                    <CurrentResult result={morningResult} slot="morning" schedule={getScheduleForSession('morning')} currentTime={currentTime} />
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
                    <CurrentResult result={nightResult} slot="night" schedule={getScheduleForSession('night')} currentTime={currentTime} isLive={!nightResult?.is_close_declared} />
                  )}
                </div>

                {/* Trust Content Section */}
                <div className="mt-8 px-4 md:px-6">
                  <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white text-center mb-6">
                    Why Choose Banaras Matka?
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                    <div className="bg-purple-50 dark:bg-gray-900 border border-purple-200 dark:border-purple-600 rounded-2xl p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-purple-500">
                      <span className="text-4xl block mb-3">🏆</span>
                      <h3 className="text-base font-bold text-purple-700 dark:text-yellow-400 mb-2">Leading Result Provider</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">Banaras is one of India's most trusted Satta Matka result providers with years of reliable service.</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-gray-900 border border-purple-200 dark:border-purple-600 rounded-2xl p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-purple-500">
                      <span className="text-4xl block mb-3">⚡</span>
                      <h3 className="text-base font-bold text-purple-700 dark:text-yellow-400 mb-2">Live & Fast Updates</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">Get real-time matka results, charts, and guessing tips with the fastest updates in the market.</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-gray-900 border border-purple-200 dark:border-purple-600 rounded-2xl p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-purple-500">
                      <span className="text-4xl block mb-3">📊</span>
                      <h3 className="text-base font-bold text-purple-700 dark:text-yellow-400 mb-2">Comprehensive Charts</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">Access detailed Jodi Charts and Panel Charts to analyze patterns and make informed decisions.</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-gray-900 border border-purple-200 dark:border-purple-600 rounded-2xl p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-purple-500">
                      <span className="text-4xl block mb-3">🔒</span>
                      <h3 className="text-base font-bold text-purple-700 dark:text-yellow-400 mb-2">100% Transparent</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">We operate with complete transparency. All results are declared on time with no manipulation.</p>
                    </div>
                  </div>
                </div>

                {/* FAQ Section */}
                <div className="mt-8 px-4 md:px-6 max-w-4xl mx-auto">
                  <div className="mb-10">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-purple-700 dark:text-yellow-400 mb-6">
                      Frequently Asked Questions
                    </h2>
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-purple-600 overflow-hidden">
                        <div className="p-4">
                          <h4 className="font-bold text-gray-900 dark:text-yellow-400 mb-2">🔒 Is Banaras Matka web application safe and secure?</h4>
                          <p className="text-sm text-gray-900 dark:text-white">For more than 10 years in this industry, we serve accurate results, 24×7 customer support, 100% user confidentiality and user safety. You can trust our web application.</p>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-purple-600 overflow-hidden">
                        <div className="p-4">
                          <h4 className="font-bold text-gray-900 dark:text-yellow-400 mb-2">📱 Can I play matka on mobile devices?</h4>
                          <p className="text-sm text-gray-900 dark:text-white">Yes, our website is fully mobile-friendly and works seamlessly on smartphones and tablets for convenient gaming on the go.</p>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-purple-600 overflow-hidden">
                        <div className="p-4">
                          <h4 className="font-bold text-gray-900 dark:text-yellow-400 mb-2">🎲 What is Satta Matka?</h4>
                          <p className="text-sm text-gray-900 dark:text-white">Satta Matka is a popular number-based lottery game that originated in India. It has evolved into a major online market where players predict numbers to win exciting prizes.</p>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-purple-600 overflow-hidden">
                        <div className="p-4">
                          <h4 className="font-bold text-gray-900 dark:text-yellow-400 mb-2">⚡ Why are the results accurate on Banaras Matka?</h4>
                          <p className="text-sm text-gray-900 dark:text-white">We are directly connected to the official matka markets. Our automated system ensures 100% accuracy and the fastest result updates without any manual errors or manipulation.</p>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-purple-600 overflow-hidden">
                        <div className="p-4">
                          <h4 className="font-bold text-gray-900 dark:text-yellow-400 mb-2">📊 How can I check the latest Satta Matka results?</h4>
                          <p className="text-sm text-gray-900 dark:text-white">You can check live results for the Banaras market directly on our homepage. We update our charts instantly as soon as the official results are declared.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Disclaimer Section */}
                <div className="mt-8 mx-4 md:mx-6 p-5 bg-amber-50 dark:bg-gray-900 border-2 border-amber-500 dark:border-yellow-500 rounded-2xl max-w-4xl md:mx-auto">
                  <h3 className="text-base font-extrabold text-amber-900 dark:text-yellow-400 mb-3 flex items-center gap-2">
                    ⚠️ Disclaimer
                  </h3>
                  <p className="text-sm leading-relaxed text-amber-950 dark:text-gray-100">
                    Purchase of online lottery using this website is prohibited in the territories where lotteries are banned.
                    Playing online matka below 18 years is strictly prohibited and not acceptable.
                    If you have any complaints or concerns, please call us on the given phone number.
                    This website is intended for entertainment and informational purposes only.
                    Please gamble responsibly and check your local laws before participating.
                  </p>
                </div>
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
                  <JodiChart results={historicalResults} schedules={schedules} currentTime={currentTime} />
                ) : (
                  <PanelChart results={historicalResults} schedules={schedules} currentTime={currentTime} />
                )}
              </div>
            )}
          </>
        ) : activePage === 'how-to-play' ? (
          <div className="static-page animate-fade-in">
            <button onClick={() => setActivePage('home')} className="back-btn">
              ← Back to Home
            </button>
            <h1>How to Play</h1>
            <div className="static-content">
              <section>
                <h2>🎲 Understanding the Game</h2>
                <p>Banaras Matka is a number-based game where players predict numbers to win prizes. There are two sessions daily: <strong>Morning</strong> and <strong>Night</strong>.</p>
              </section>

              <section>
                <h2>📊 Bet Types</h2>
                <ul>
                  <li><strong>Single (0-9):</strong> Pick a single digit from 0 to 9. Payout: 9x</li>
                  <li><strong>Jodi (00-99):</strong> Pick a two-digit number from 00 to 99. Payout: 90x</li>
                  <li><strong>Triple (000-999):</strong> Pick a three-digit number. Payout: 800x</li>
                </ul>
              </section>

              <section>
                <h2>⏰ Timing</h2>
                <ul>
                  <li><strong>Morning Game:</strong> Open result at 1:00 PM, Close result at 3:00 PM</li>
                  <li><strong>Night Game:</strong> Open result at 6:00 PM, Close result at 8:00 PM</li>
                </ul>
              </section>

              <section>
                <h2>🎯 How Results Work</h2>
                <p>Each session has two results: <strong>Open</strong> and <strong>Close</strong>. The Jodi is formed by combining the last digit of Open Sum with the last digit of Close Sum.</p>
              </section>

              <section>
                <h2>📈 Using Charts</h2>
                <ul>
                  <li><strong>Jodi Chart:</strong> Shows historical Jodi results to help identify patterns</li>
                  <li><strong>Panel Chart:</strong> Shows full Open-Jodi-Close combinations over time</li>
                </ul>
              </section>
            </div>
          </div>
        ) : (
          <div className="static-page animate-fade-in">
            <button onClick={() => setActivePage('home')} className="back-btn">
              ← Back to Home
            </button>
            <h1>Disclaimer</h1>
            <div className="static-content">
              <section>
                <h2>⚠️ Legal Notice</h2>
                <p>This website is for <strong>informational and entertainment purposes only</strong>. We do not encourage or promote gambling in any form.</p>
              </section>

              <section>
                <h2>📋 Terms of Use</h2>
                <ul>
                  <li>Users must be 18 years or older to access this website</li>
                  <li>Gambling may be illegal in your jurisdiction. Please check local laws before participating</li>
                  <li>We are not responsible for any financial losses incurred</li>
                  <li>All results displayed are for informational purposes only</li>
                </ul>
              </section>

              <section>
                <h2>🔒 Responsible Gaming</h2>
                <p>If you or someone you know has a gambling problem, please seek help from a professional counselor or helpline.</p>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation - Only show on home page */}
      {
        activePage === 'home' && (
          <nav className="bottom-nav">
            <button
              onClick={() => setActiveTab('results')}
              className={`bottom-nav-item ${activeTab === 'results' ? 'active' : ''}`}
            >
              <Trophy />
              <span>Results</span>
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`bottom-nav-item ${activeTab === 'past' ? 'active' : ''}`}
            >
              <FileText />
              <span>Past Results</span>
            </button>
          </nav>
        )}
    </div>
  )
}
