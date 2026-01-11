'use client'

import { ReactNode } from 'react'

interface CardProps {
    children: ReactNode
    className?: string
    variant?: 'default' | 'glass' | 'result'
    hover?: boolean
    onClick?: () => void
}

export function Card({
    children,
    className = '',
    variant = 'default',
    hover = true,
    onClick,
}: CardProps) {
    const variantClasses = {
        default: 'card',
        glass: 'glass-card p-6',
        result: 'result-card',
    }

    const hoverClass = hover ? '' : 'hover:border-[var(--glass-border)] hover:shadow-none hover:transform-none'

    return (
        <div
            className={`${variantClasses[variant]} ${hoverClass} ${className}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {children}
        </div>
    )
}

interface CardHeaderProps {
    title: string
    subtitle?: string
    action?: ReactNode
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
    return (
        <div className="card-header flex items-center justify-between">
            <div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                {subtitle && (
                    <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>
                )}
            </div>
            {action && <div>{action}</div>}
        </div>
    )
}
