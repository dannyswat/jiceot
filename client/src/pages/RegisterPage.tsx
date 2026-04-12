import { useState, type FormEvent } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, isLoading } = useAuth()
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError(t('Passwords do not match'))
      return
    }

    if (password.length < 6) {
      setError(t('Password must be at least 6 characters'))
      return
    }

    try {
      await register(name, email, password)
      navigate('/get-started', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Registration failed'))
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <img src="/jiceot.svg" alt="Jiceot" className="auth-card__logo" />
          <p>{t('Create your account')}</p>
        </div>

        <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
          {error && <p className="form-error">{error}</p>}

          <label>
            <span>{t('Name')}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Morgan"
              autoComplete="name"
              required
            />
          </label>

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
                autoComplete="new-password"
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
            <small className="field-hint">{t('At least 6 characters')}</small>
          </label>

          <label>
            <span>{t('Confirm password')}</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={isLoading}>
            {isLoading ? t('Creating account…') : t('Create account')}
          </button>
        </form>

        <p className="auth-switch">
          {t('Already registered?')}{' '}
          <NavLink to="/login">{t('Sign in')}</NavLink>
        </p>
      </div>
    </main>
  )
}
