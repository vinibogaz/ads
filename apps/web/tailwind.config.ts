import type { Config } from 'tailwindcss'

// Synthex Design System — color tokens
const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Synthex DS tokens
        'sx-bg': '#0A0F1E',
        'sx-surface': '#111827',
        'sx-surface-2': '#1a2234',
        'sx-primary': '#6366F1',
        'sx-primary-hover': '#4f52d4',
        'sx-secondary': '#8B5CF6',
        'sx-success': '#10B981',
        'sx-warning': '#F59E0B',
        'sx-error': '#EF4444',
        'sx-text': '#F9FAFB',
        'sx-text-2': '#9CA3AF',
        'sx-text-3': '#6B7280',
        'sx-border': '#1F2937',
        'sx-border-2': '#374151',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'sx-sm': '6px',
        'sx-md': '8px',
        'sx-lg': '12px',
        'sx-xl': '16px',
        'sx-2xl': '20px',
      },
      boxShadow: {
        'sx-glow': '0 0 0 2px rgba(99, 102, 241, 0.4)',
        'sx-glow-lg': '0 0 20px rgba(99, 102, 241, 0.2)',
        'sx-card': '0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.6)',
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
