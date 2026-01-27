'use client'

import { useState, useEffect } from 'react'

/**
 * Debounce a value by a specified delay.
 * Useful for preventing excessive API calls when user is adjusting sliders/inputs.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(timer)
        }
    }, [value, delay])

    return debouncedValue
}
