'use client'

import { ReactNode, useState } from 'react'
import { Sidebar, adminSidebarLinks } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

export default function AdminLayout({ children }: { children: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        toast.success('Logged out successfully')
        router.push('/admin/login')
        router.refresh()
    }

    const getPageTitle = () => {
        if (pathname === '/admin') return 'Admin Dashboard'
        if (pathname.includes('/admin/staff')) return 'Staff Management'
        if (pathname.includes('/admin/results')) return 'Result Management'
        if (pathname.includes('/admin/analytics')) return 'Hisab-Kitab'
        if (pathname.includes('/admin/games')) return 'Game Settings'
        return 'Admin Portal'
    }

    return (
        <div className="min-h-screen bg-gray-950">
            <Sidebar
                title="Admin Portal"
                logoSrc="/logo-1.png"
                links={adminSidebarLinks}
                onLogout={handleLogout}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Main Content Wrapper */}
            <div className="lg:ml-64 transition-all duration-300 min-h-screen flex flex-col">
                <Header
                    title={getPageTitle()}
                    userName="Administrator"
                    onMenuClick={() => setSidebarOpen(true)}
                    showNotifications={false}
                />

                <main className="p-4 md:p-6 lg:p-8 w-full max-w-[1920px] mx-auto flex-1">
                    {children}
                </main>
            </div>
        </div>
    )
}
