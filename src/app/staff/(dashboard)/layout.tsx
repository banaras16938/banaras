'use client'

import { ReactNode, useState } from 'react'
import { Sidebar, staffSidebarLinks } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function StaffLayout({ children }: { children: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const router = useRouter()

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        toast.success('Logged out successfully')
        router.push('/staff/login')
        router.refresh()
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
