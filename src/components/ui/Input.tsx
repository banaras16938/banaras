'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, className = '', ...props }, ref) => {
        return (
            <div className="flex flex-col gap-2">
                {label && (
                    <label className="text-sm font-medium text-[var(--text-secondary)]">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={`input ${error ? 'border-[var(--status-error)]' : ''} ${className}`}
                    {...props}
                />
                {error && (
                    <p className="text-xs text-[var(--status-error)]">{error}</p>
                )}
                {helperText && !error && (
                    <p className="text-xs text-[var(--text-muted)]">{helperText}</p>
                )}
            </div>
        )
    }
)

Input.displayName = 'Input'

interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
    label?: string
    error?: string
    options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, options, className = '', ...props }, ref) => {
        return (
            <div className="flex flex-col gap-2">
                {label && (
                    <label className="text-sm font-medium text-[var(--text-secondary)]">
                        {label}
                    </label>
                )}
                <select
                    ref={ref}
                    className={`input cursor-pointer ${error ? 'border-[var(--status-error)]' : ''} ${className}`}
                    {...props}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {error && (
                    <p className="text-xs text-[var(--status-error)]">{error}</p>
                )}
            </div>
        )
    }
)

Select.displayName = 'Select'
