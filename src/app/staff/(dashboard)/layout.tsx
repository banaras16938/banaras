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
        <div className="min-h-screen bg-gray-950">
            <Sidebar
                title="Staff Portal"
                subtitle="Bet Management"
                links={staffSidebarLinks}
                onLogout={handleLogout}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="lg:ml-64 transition-all duration-300 min-h-screen flex flex-col">
                <Header
                    title="Staff Dashboard"
                    userName="Staff User"
                    onMenuClick={() => setSidebarOpen(true)}
                />

                <main className="p-4 md:p-6 lg:p-8 flex-1">
                    {children}
                </main>
            </div>
        </div>
    )
}
