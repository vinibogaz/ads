import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Entrar — Synthex',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sx-bg px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-sx-md bg-sx-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-xl font-bold text-sx-text">Synthex</span>
          </div>
          <p className="text-sx-text-2 text-sm">Marketing Intelligence Hub</p>
        </div>

        <div className="sx-card">
          <h1 className="text-xl font-semibold text-sx-text mb-6">Entrar na sua conta</h1>
          <LoginForm />

          <div className="mt-6 text-center text-sm text-sx-text-2">
            Não tem uma conta?{' '}
            <a href="/register" className="text-sx-primary hover:underline">
              Criar conta grátis
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
