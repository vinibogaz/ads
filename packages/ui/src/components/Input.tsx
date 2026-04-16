import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className = '', id, ...props }, ref) => {
    const inputId = id ?? `input-${Math.random().toString(36).slice(2)}`

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[#9CA3AF]">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              'w-full bg-[#111827] border rounded-[6px] px-3 py-2',
              'text-[#F9FAFB] placeholder-[#6B7280] text-sm',
              'focus:outline-none focus:ring-2 focus:border-transparent transition-colors',
              error
                ? 'border-[#EF4444] focus:ring-[#EF4444]'
                : 'border-[#1F2937] focus:ring-[#6366F1]',
              leftIcon ? 'pl-9' : '',
              className,
            ].join(' ')}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-[#EF4444]">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-[#6B7280]">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
