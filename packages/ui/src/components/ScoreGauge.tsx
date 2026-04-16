import React from 'react'
import { motion } from 'framer-motion'

export interface ScoreGaugeProps {
  score: number // 0-100
  size?: number
  label?: string
  showTrend?: boolean
  trend?: number
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10B981' // success
  if (score >= 60) return '#6366F1' // primary
  if (score >= 40) return '#F59E0B' // warning
  return '#EF4444' // error
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excelente'
  if (score >= 60) return 'Bom'
  if (score >= 40) return 'Regular'
  return 'Crítico'
}

export function ScoreGauge({ score, size = 120, label, showTrend, trend }: ScoreGaugeProps) {
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (score / 100) * circumference
  const color = getScoreColor(score)

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: size, height: size }} className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1F2937"
            strokeWidth={8}
          />
          {/* Score arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 6px ${color}66)`,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="font-bold text-[#F9FAFB] leading-none"
            style={{ fontSize: size * 0.22, color }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {score}
          </motion.span>
          {showTrend && trend !== undefined && (
            <span
              className="text-xs font-medium mt-0.5"
              style={{ color: trend >= 0 ? '#10B981' : '#EF4444' }}
            >
              {trend >= 0 ? '▲' : '▼'}{Math.abs(trend)}
            </span>
          )}
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="text-xs font-medium" style={{ color }}>
          {getScoreLabel(score)}
        </p>
        {label && <p className="text-xs text-[#9CA3AF] mt-0.5">{label}</p>}
      </div>
    </div>
  )
}
