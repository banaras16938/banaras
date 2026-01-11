'use client'

import { Bell, Menu, User } from 'lucide-react'

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
        <header className="header">
            <div className="flex items-center gap-4">
                {onMenuClick && (
                    <button
                        onClick={onMenuClick}
                        className="p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors lg:hidden"
                    >
                        <Menu size={24} />
                    </button>
                )}
                {title && <h1 className="text-lg font-semibold">{title}</h1>}
            </div>

            <div className="flex items-center gap-4">
                {showNotifications && (
                    <button className="p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors relative">
                        <Bell size={20} className="text-[var(--text-secondary)]" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--status-error)] rounded-full" />
                    </button>
                )}

                {userName && (
                    <div className="flex items-center gap-3 pl-4 border-l border-[var(--glass-border)]">
                        <div className="w-9 h-9 rounded-full bg-[var(--gradient-primary)] flex items-center justify-center">
                            <User size={18} className="text-white" />
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-sm font-medium">{userName}</p>
                            <p className="text-xs text-[var(--text-muted)]">Online</p>
                        </div>
                    </div>
                )}
            </div>
        </header>
    )
}
