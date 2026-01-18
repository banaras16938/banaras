'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background gradient effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
                {/* Large Logo */}
                <div className="mb-8 animate-float">
                    <Image
                        src="/logo-1.png"
                        alt="Banaras Matka Play"
                        width={300}
                        height={300}
                        className="w-64 h-64 md:w-80 md:h-80 object-contain drop-shadow-2xl"
                        priority
                    />
                </div>

                {/* 404 Text with gradient */}
                <h1 className="text-8xl md:text-9xl font-black bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4 animate-gradient">
                    404
                </h1>

                {/* Message */}
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                    Page Not Found
                </h2>
                <p className="text-gray-400 mb-8 text-lg">
                    Oops! The page you&apos;re looking for seems to have vanished into thin air.
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-lg"
                    >
                        <Home size={20} />
                        Go to Homepage
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-800 text-white font-semibold rounded-xl hover:bg-gray-700 transition-all border border-gray-700"
                    >
                        <ArrowLeft size={20} />
                        Go Back
                    </button>
                </div>
            </div>

            {/* Floating particles effect */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-white/10 rounded-full animate-float-particle"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${5 + Math.random() * 10}s`,
                        }}
                    />
                ))}
            </div>

            {/* Custom animations */}
            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes gradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                @keyframes float-particle {
                    0%, 100% { 
                        transform: translateY(0) translateX(0);
                        opacity: 0;
                    }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { 
                        transform: translateY(-100vh) translateX(20px);
                        opacity: 0;
                    }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                .animate-gradient {
                    background-size: 200% 200%;
                    animation: gradient 3s ease infinite;
                }
                .animate-float-particle {
                    animation: float-particle 10s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}
