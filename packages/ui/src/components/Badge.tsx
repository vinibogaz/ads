import React from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'primary' | 'secondary'

export interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[#374151] text-[#9CA3AF]',
  success: 'bg-[#10B981]/10 text-[#10B981]',
  warning: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  error: 'bg-[#EF4444]/10 text-[#EF4444]',
  primary: 'bg-[#6366F1]/10 text-[#6366F1]',
  secondary: 'bg-[#8B5CF6]/10 text-[#8B5CF6]',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
