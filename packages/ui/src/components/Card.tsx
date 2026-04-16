import React from 'react'
import { motion } from 'framer-motion'

export interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

const paddingClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ children, className = '', hoverable = false, padding = 'md' }: CardProps) {
  const base = [
    'bg-[#111827] rounded-[16px] border border-[#1F2937]',
    'shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.6)]',
    paddingClasses[padding],
    className,
  ].join(' ')

  if (hoverable) {
    return (
      <motion.div
        className={base}
        whileHover={{
          borderColor: 'rgba(99,102,241,0.4)',
          boxShadow: '0 0 20px rgba(99,102,241,0.1)',
        }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.div>
    )
  }

  return <div className={base}>{children}</div>
}
