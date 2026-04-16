import React, { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const variantConfig: Record<ToastVariant, { bg: string; icon: string }> = {
  success: { bg: 'bg-[#10B981]/10 border-[#10B981]/20', icon: '✓' },
  error: { bg: 'bg-[#EF4444]/10 border-[#EF4444]/20', icon: '✕' },
  warning: { bg: 'bg-[#F59E0B]/10 border-[#F59E0B]/20', icon: '!' },
  info: { bg: 'bg-[#6366F1]/10 border-[#6366F1]/20', icon: 'i' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={[
                'flex items-center gap-3 px-4 py-3 rounded-[8px] border',
                'text-sm text-[#F9FAFB] min-w-[280px] max-w-[380px]',
                'shadow-[0_4px_12px_rgba(0,0,0,0.4)]',
                variantConfig[t.variant].bg,
              ].join(' ')}
            >
              <span className="font-bold shrink-0">{variantConfig[t.variant].icon}</span>
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
