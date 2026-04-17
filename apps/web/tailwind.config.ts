import type { Config } from 'tailwindcss'

// ORFFIA Design System — color tokens
const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ORFFIA DS tokens
        'orf-bg': '#0A0F1E',
        'orf-surface': '#111827',
        'orf-surface-2': '#1a2234',
        'orf-primary': '#6366F1',
        'orf-primary-hover': '#4f52d4',
        'orf-secondary': '#8B5CF6',
        'orf-success': '#10B981',
        'orf-warning': '#F59E0B',
        'orf-error': '#EF4444',
        'orf-text': '#F9FAFB',
        'orf-text-2': '#9CA3AF',
        'orf-text-3': '#6B7280',
        'orf-border': '#1F2937',
        'orf-border-2': '#374151',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'orf-sm': '6px',
        'orf-md': '8px',
        'orf-lg': '12px',
        'orf-xl': '16px',
        'orf-2xl': '20px',
      },
      boxShadow: {
        'orf-glow': '0 0 0 2px rgba(99, 102, 241, 0.4)',
        'orf-glow-lg': '0 0 20px rgba(99, 102, 241, 0.2)',
        'orf-card': '0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.6)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'score-fill': 'scoreFill 1s ease-out forwards',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scoreFill: {
          from: { strokeDashoffset: '251.2' },
          to: { strokeDashoffset: 'var(--score-offset)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
