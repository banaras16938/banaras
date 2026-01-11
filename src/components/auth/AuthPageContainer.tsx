import { ReactNode } from 'react'

interface AuthLayoutProps {
    children: ReactNode
    title: string
    subtitle: string
    icon: ReactNode
}

export function AuthPageContainer({ children, title, subtitle, icon }: AuthLayoutProps) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[var(--bg-dark)] relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-[var(--primary-600)] rounded-full blur-[120px] opacity-10 animate-pulse-slow" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-[var(--accent-purple)] rounded-full blur-[120px] opacity-10 animate-pulse-slow delay-1000" />
            </div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />

            <div className="w-full max-w-md relative z-10 animate-fade-in-up">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--glass-surface)] to-[var(--glass-border)] border border-[var(--glass-border)] shadow-xl mb-6 backdrop-blur-md">
                        {icon}
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-[var(--text-secondary)]">
                        {title}
                    </h1>
                    <p className="text-[var(--text-muted)] mt-2 text-lg">
                        {subtitle}
                    </p>
                </div>

                {/* Main Card */}
                <div className="glass-card p-8 shadow-2xl border border-[var(--glass-border)]/50 backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                        {children}
                    </div>
                </div>

                {/* Footer Branding */}
                <div className="text-center mt-8 space-y-2">
                    <p className="text-sm text-[var(--text-muted)] opacity-60">
                        Secure System Access
                    </p>
                    <div className="flex justify-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse" />
                        <span className="text-xs text-[var(--text-muted)]">System Operational</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
