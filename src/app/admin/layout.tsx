'use client'

import { ReactNode, useState } from 'react'
import { Sidebar, adminSidebarLinks } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default function AdminLayout({ children }: { children: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleLogout = () => {
        // TODO: Implement Supabase logout
        window.location.href = '/admin/login'
    }

    return (
        <div className="min-h-screen bg-[var(--bg-dark)]">
            <Sidebar
                title="Admin Portal"
                subtitle="System Control"
                links={adminSidebarLinks}
                onLogout={handleLogout}
            />

            <div className="lg:ml-[260px]">
                <Header
                    title="Admin Dashboard"
                    userName="Administrator"
                    onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                />

                <main className="p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
