'use client'

import { Bell, User } from 'lucide-react'
import { MobileMenuButton } from './Sidebar'

interface HeaderProps {
    title?: string
    userName?: string
    onMenuClick?: () => void
    showNotifications?: boolean
}

export function Header({
    title,
    userName,
    onMenuClick,
    showNotifications = true
}: HeaderProps) {
    return (
        <header className="sticky top-0 h-[70px] bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 px-4 md:px-6 flex items-center justify-between z-40">
            <div className="flex items-center gap-4">
                {onMenuClick && <MobileMenuButton onClick={onMenuClick} />}
                {title && <h1 className="text-lg font-semibold text-white">{title}</h1>}
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                {showNotifications && (
                    <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors relative">
                        <Bell size={20} className="text-gray-400" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    </button>
                )}

                {userName && (
                    <div className="flex items-center gap-3 pl-2 md:pl-4 border-l border-gray-700">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                            <User size={18} className="text-white" />
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-sm font-medium text-white">{userName}</p>
                            <p className="text-xs text-gray-500">Online</p>
                        </div>
                    </div>
                )}
            </div>
        </header>
    )
}
