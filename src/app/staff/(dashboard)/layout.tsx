'use client'

import { ReactNode, useState, useEffect, createContext, useContext } from 'react'
import { Sidebar, staffSidebarLinks } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// Context to share staff info with child components
interface StaffInfo {
    name: string
    id: string | null
}

const StaffContext = createContext<StaffInfo>({ name: 'Staff', id: null })

export function useStaffInfo() {
    return useContext(StaffContext)
}

// Keep for backward compatibility
export function useStaffName() {
    return useContext(StaffContext).name
}

export default function StaffLayout({ children }: { children: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [staffInfo, setStaffInfo] = useState<StaffInfo>({ name: 'Staff', id: null })
    const router = useRouter()

    useEffect(() => {
        const fetchStaffInfo = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, name')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    setStaffInfo({ name: profile.name || 'Staff', id: profile.id })
                }
            }
        }

        fetchStaffInfo()
    }, [])

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        toast.success('Logged out successfully')
        router.push('/staff/login')
        router.refresh()
    }

    return (
        <StaffContext.Provider value={staffInfo}>
            <div className="min-h-screen bg-gray-950 overflow-x-hidden">
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
                        userName={staffInfo.name}
                        onMenuClick={() => setSidebarOpen(true)}
                        showNotifications={false}
                    />

                    <main className="p-4 md:p-6 lg:p-8 flex-1">
                        {children}
                    </main>
                </div>
            </div>
        </StaffContext.Provider>
    )
}
