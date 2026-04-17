import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/RegisterForm'

export const metadata: Metadata = { title: 'Criar conta — Synthex' }

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sx-bg px-4">
      <div className="w-full max-w-md">
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
          <h1 className="text-xl font-semibold text-sx-text mb-6">Criar sua conta</h1>
          <RegisterForm />

          <div className="mt-6 text-center text-sm text-sx-text-2">
            Já tem uma conta?{' '}
            <a href="/login" className="text-sx-primary hover:underline">
              Entrar
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
