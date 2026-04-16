import React from 'react'
import { motion } from 'framer-motion'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#6366F1] hover:bg-[#4f52d4] text-white border-transparent focus-visible:ring-[#6366F1]',
  secondary:
    'bg-transparent hover:bg-[#1a2234] text-[#F9FAFB] border-[#1F2937] hover:border-[#374151] focus-visible:ring-[#6366F1]',
  ghost:
    'bg-transparent hover:bg-[#1a2234] text-[#9CA3AF] hover:text-[#F9FAFB] border-transparent focus-visible:ring-[#6366F1]',
  destructive:
    'bg-[#EF4444] hover:bg-[#dc2626] text-white border-transparent focus-visible:ring-[#EF4444]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-[6px] gap-1.5',
  md: 'px-4 py-2 text-sm rounded-[6px] gap-2',
  lg: 'px-5 py-2.5 text-base rounded-[8px] gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <motion.button
      whileTap={{ scale: isDisabled ? 1 : 0.97 }}
      {...(props as React.ComponentProps<typeof motion.button>)}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-medium border transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1E]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </motion.button>
  )
}
