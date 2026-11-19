'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction, signupAction, type ActionState } from '@/app/(frontend)/actions'

const initialState: ActionState = { ok: false }

export default function AuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, initialState)
  const [signupState, signupFormAction, signupPending] = useActionState(signupAction, initialState)
  const state = mode === 'login' ? loginState : signupState

  useEffect(() => {
    if (!state.ok) return
    router.push('/pilih-toko')
    router.refresh()
  }, [router, state.ok])

  return (
    <main className="welcome">
      <div className="glow" />
      <section className="auth-card">
        <span className="brand" aria-label="Toko Santri">
          <span />
          <i />
        </span>
        <h1>{mode === 'login' ? 'Masuk' : 'Buat Akun'}</h1>
        <p>{mode === 'login' ? 'Toko Santri' : 'Akun pemilik pertama'}</p>
        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            Masuk
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => setMode('signup')}
          >
            Buat Akun
          </button>
        </div>
        <form className="auth-form" action={mode === 'login' ? loginFormAction : signupFormAction}>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Kata sandi
            <input
              name="password"
              type="password"
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </label>
          {state.error && <p className="auth-error">{state.error}</p>}
          <button className="primary" disabled={loginPending || signupPending}>
            {loginPending || signupPending ? 'Tunggu...' : mode === 'login' ? 'Masuk' : 'Buat Akun'}
          </button>
        </form>
      </section>
    </main>
  )
}
