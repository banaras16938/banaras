'use client'

interface SliderProps {
    label?: string
    value: number
    onChange: (value: number) => void
    min?: number
    max?: number
    step?: number
    showValue?: boolean
    suffix?: string
}

export function Slider({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    showValue = true,
    suffix = '%',
}: SliderProps) {
    return (
        <div className="slider-container">
            {(label || showValue) && (
                <div className="flex justify-between items-center mb-3">
                    {label && (
                        <label className="text-sm font-medium text-[var(--text-secondary)]">
                            {label}
                        </label>
                    )}
                    {showValue && (
                        <span className="text-lg font-bold text-[var(--primary-400)]">
                            {value}{suffix}
                        </span>
                    )}
                </div>
            )}
            <input
                type="range"
                className="slider"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                min={min}
                max={max}
                step={step}
            />
            <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)]">
                <span>{min}{suffix}</span>
                <span>{max}{suffix}</span>
            </div>
        </div>
    )
}
