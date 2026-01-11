'use client'

import { ReactNode, useState } from 'react'
import { Sidebar, staffSidebarLinks } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default function StaffLayout({ children }: { children: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleLogout = () => {
        // TODO: Implement Supabase logout
        window.location.href = '/staff/login'
    }

    return (
        <div className="min-h-screen bg-[var(--bg-dark)]">
            <Sidebar
                title="Staff Portal"
                subtitle="Bet Management"
                links={staffSidebarLinks}
                onLogout={handleLogout}
            />

            <div className="lg:ml-[260px]">
                <Header
                    title="Staff Dashboard"
                    userName="Staff User"
                    onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                />

                <main className="p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
