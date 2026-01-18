'use client'

import { ReactNode, useState, useEffect, createContext, useContext } from 'react'
import { Sidebar, staffSidebarLinks } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// Context to share staff name with child components
const StaffNameContext = createContext<string>('Staff')

export function useStaffName() {
    return useContext(StaffNameContext)
}

export default function StaffLayout({ children }: { children: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [staffName, setStaffName] = useState<string>('Staff')
    const router = useRouter()

    useEffect(() => {
        const fetchStaffName = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('name')
                    .eq('id', user.id)
                    .single()

                if (profile?.name) {
                    setStaffName(profile.name)
                }
            }
        }

        fetchStaffName()
    }, [])

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        toast.success('Logged out successfully')
        router.push('/staff/login')
        router.refresh()
    }

    return (
        <StaffNameContext.Provider value={staffName}>
            <div className="min-h-screen bg-gray-950">
                <Sidebar
                    title="Banaras Matka Play"
                    logoSrc="/logo-1.png"
                    links={staffSidebarLinks}
                    onLogout={handleLogout}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />

                <div className="lg:ml-64 transition-all duration-300 min-h-screen flex flex-col">
                    <Header
                        userName={staffName}
                        onMenuClick={() => setSidebarOpen(true)}
                        showNotifications={false}
                    />

                    <main className="p-4 md:p-6 lg:p-8 flex-1">
                        {children}
                    </main>
                </div>
            </div>
        </StaffNameContext.Provider>
    )
}
