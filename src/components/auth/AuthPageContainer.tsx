import { ReactNode } from 'react'
import Image from 'next/image'

interface AuthLayoutProps {
    children: ReactNode
}

export function AuthPageContainer({ children }: AuthLayoutProps) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gray-950 relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-indigo-600 rounded-full blur-[120px] opacity-10" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-purple-600 rounded-full blur-[120px] opacity-10" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="flex justify-center">
                        <Image
                            src="/logo-1.png"
                            alt="Banaras Matka Play"
                            width={150}
                            height={150}
                            className="object-contain"
                        />
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-gray-800">
                    {children}
                </div>
            </div>
        </div>
    )
}
