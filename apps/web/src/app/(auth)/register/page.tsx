import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RegisterForm } from '@/components/auth/RegisterForm'

export const metadata: Metadata = { title: 'Criar conta — Orffia Ads' }

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-orf-bg px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-orf-md bg-orf-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-xl font-bold text-orf-text">Orffia Ads</span>
          </div>
          <p className="text-orf-text-2 text-sm">Marketing Intelligence Hub</p>
        </div>

        <div className="orf-card">
          <h1 className="text-xl font-semibold text-orf-text mb-6">Criar sua conta</h1>
          <Suspense fallback={null}><RegisterForm /></Suspense>

          <div className="mt-6 text-center text-sm text-orf-text-2">
            Já tem uma conta?{' '}
            <a href="/login" className="text-orf-primary hover:underline">
              Entrar
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
