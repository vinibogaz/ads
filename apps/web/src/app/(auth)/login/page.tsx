import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Entrar — Orffia Ads',
}

export default function LoginPage() {
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
          <h1 className="text-xl font-semibold text-orf-text mb-6">Entrar na sua conta</h1>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          <div className="mt-6 text-center text-sm text-orf-text-2">
            Não tem uma conta?{' '}
            <a href="/register" className="text-orf-primary hover:underline">
              Criar conta grátis
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
