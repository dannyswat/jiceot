import { useState, type FormEvent } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading } = useAuth()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const destination =
    typeof location.state === 'object' &&
    location.state !== null &&
    'from' in location.state &&
    typeof (location.state as { from?: unknown }).from === 'string'
      ? ((location.state as { from: string }).from)
      : '/dashboard'

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
      navigate(destination, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Unable to sign in'))
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <img src="/jiceot.svg" alt="Jiceot" className="auth-card__logo" />
          <p>{t('Sign in to manage your finances')}</p>
        </div>

        <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
          {error && <p className="form-error">{error}</p>}

          <label>
            <span>{t('Email')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            <span>{t('Password')}</span>
            <div className="input-with-toggle">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="input-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          <button className="primary-button" type="submit" disabled={isLoading}>
            {isLoading ? t('Signing in…') : t('Sign in')}
          </button>
        </form>

        <p className="auth-switch">
          {t('Need an account?')}{' '}
          <NavLink to="/register">{t('Register')}</NavLink>
        </p>
      </div>
    </main>
  )
}
