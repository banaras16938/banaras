'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Home,
    Ticket,
    History,
    Trophy,
    TrendingUp,
    LogOut,
    LucideIcon
} from 'lucide-react'

interface SidebarLink {
    href: string
    icon: LucideIcon
    label: string
}

interface SidebarProps {
    title: string
    subtitle?: string
    links: SidebarLink[]
    onLogout?: () => void
    children?: ReactNode
}

export function Sidebar({ title, subtitle, links, onLogout }: SidebarProps) {
    const pathname = usePathname()

    return (
        <aside className="sidebar">
            <div className="mb-8">
                <h1 className="text-xl font-bold gradient-text">{title}</h1>
                {subtitle && (
                    <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>
                )}
            </div>

            <nav className="flex-1 flex flex-col gap-2">
                {links.map((link) => {
                    const Icon = link.icon
                    const isActive = pathname === link.href

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <Icon size={20} />
                            <span>{link.label}</span>
                        </Link>
                    )
                })}
            </nav>

            {onLogout && (
                <button
                    onClick={onLogout}
                    className="sidebar-link text-[var(--status-error)] hover:bg-red-500/10 mt-auto"
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            )}
        </aside>
    )
}

// Staff Sidebar Configuration
export const staffSidebarLinks: SidebarLink[] = [
    { href: '/staff', icon: Home, label: 'Dashboard' },
    { href: '/staff/bets', icon: Ticket, label: 'Place Bet' },
    { href: '/staff/bets/history', icon: History, label: 'Bet History' },
    { href: '/staff/results', icon: Trophy, label: 'Results' },
    { href: '/staff/profit-loss', icon: TrendingUp, label: 'Profit & Loss' },
]

// Admin Sidebar Configuration
export const adminSidebarLinks: SidebarLink[] = [
    { href: '/admin', icon: Home, label: 'Dashboard' },
    { href: '/admin/staff', icon: Home, label: 'Staff Management' },
    { href: '/admin/results', icon: Trophy, label: 'Result Selector' },
    { href: '/admin/analytics', icon: TrendingUp, label: 'Analytics' },
    { href: '/admin/games', icon: Ticket, label: 'Game Settings' },
]
