'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
    Home,
    Ticket,
    History,
    Trophy,
    TrendingUp,
    LogOut,
    LucideIcon,
    Users,
    X,
    Menu
} from 'lucide-react'

interface SidebarLink {
    href: string
    icon: LucideIcon
    label: string
}

interface SidebarProps {
    title: string
    subtitle?: string
    logoSrc?: string
    links: SidebarLink[]
    onLogout?: () => void
    children?: ReactNode
    isOpen?: boolean
    onClose?: () => void
}

export function Sidebar({ title, subtitle, logoSrc, links, onLogout, isOpen = true, onClose }: SidebarProps) {
    const pathname = usePathname()

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed left-0 top-0 h-screen w-64 
                bg-gray-900 border-r border-gray-800 
                p-6 flex flex-col z-50
                transition-transform duration-300 ease-in-out
                lg:translate-x-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Close button for mobile */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white lg:hidden"
                >
                    <X size={20} />
                </button>

                {/* Logo/Title */}
                <div className="mb-8">
                    {logoSrc ? (
                        <Image
                            src={logoSrc}
                            alt={title}
                            width={500}
                            height={500}
                            className="w-full h-auto object-contain"
                            priority
                        />
                    ) : (
                        <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-indigo-500 to-pink-500 bg-clip-text text-transparent">
                            {title}
                        </h1>
                    )}
                    {subtitle && (
                        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                    )}
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 flex flex-col gap-2">
                    {links.map((link) => {
                        const Icon = link.icon
                        const isActive = pathname === link.href

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={onClose}
                                className={`
                                    flex items-center gap-3 px-4 py-3 rounded-lg
                                    font-medium transition-all duration-200
                                    ${isActive
                                        ? 'bg-indigo-500/15 text-indigo-400'
                                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                    }
                                `}
                            >
                                <Icon size={20} />
                                <span>{link.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                {/* Logout Button */}
                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors mt-auto"
                    >
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                )}
            </aside>
        </>
    )
}

// Mobile menu button component
export function MobileMenuButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg lg:hidden"
        >
            <Menu size={24} />
        </button>
    )
}

// Staff Sidebar Configuration
export const staffSidebarLinks: SidebarLink[] = [
    { href: '/staff', icon: Home, label: 'Dashboard' },
    { href: '/staff/bets', icon: Ticket, label: 'Place Bet' },
    { href: '/staff/bets/history', icon: History, label: 'Bet History' },
    { href: '/staff/players', icon: Users, label: 'Players' },
]

// Admin Sidebar Configuration
export const adminSidebarLinks: SidebarLink[] = [
    { href: '/admin', icon: Home, label: 'Dashboard' },
    { href: '/admin/staff', icon: Users, label: 'Staff Management' },
    { href: '/admin/analytics', icon: TrendingUp, label: 'Analytics' },
    { href: '/admin/games', icon: Ticket, label: 'Game Settings' },
]
