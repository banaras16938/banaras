'use client'

import { ReactNode } from 'react'

interface BadgeProps {
    variant?: 'success' | 'warning' | 'error' | 'info' | 'default'
    children: ReactNode
    className?: string
    dot?: boolean
}

export function Badge({
    variant = 'default',
    children,
    className = '',
    dot = false,
}: BadgeProps) {
    const variantClasses = {
        success: 'badge-success',
        warning: 'badge-warning',
        error: 'badge-error',
        info: 'badge-info',
        default: 'bg-[var(--bg-surface)] text-[var(--text-secondary)]',
    }

    return (
        <span className={`badge ${variantClasses[variant]} ${className}`}>
            {dot && (
                <span
                    className={`w-2 h-2 rounded-full mr-2 ${variant === 'success'
                            ? 'bg-[var(--status-success)]'
                            : variant === 'warning'
                                ? 'bg-[var(--status-warning)]'
                                : variant === 'error'
                                    ? 'bg-[var(--status-error)]'
                                    : variant === 'info'
                                        ? 'bg-[var(--status-info)]'
                                        : 'bg-[var(--text-muted)]'
                        }`}
                />
            )}
            {children}
        </span>
    )
}
