import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { changePassword } = useAuth()
  const { t } = useI18n()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword !== confirmPassword) {
      setError(t('New passwords do not match'))
      return
    }
    if (newPassword.length < 6) {
      setError(t('New password must be at least 6 characters'))
      return
    }
    if (currentPassword === newPassword) {
      setError(t('New password must differ from current password'))
      return
    }

    setIsLoading(true)
    try {
      await changePassword(currentPassword, newPassword)
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => navigate('/settings'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to change password'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page__header page__header--with-back">
        <button type="button" className="back-button" onClick={() => navigate('/settings')}>
          <ArrowLeftIcon />
        </button>
        <div>
          <h1>{t('Change Password')}</h1>
          <p>{t('Update your account password')}</p>
        </div>
      </div>

      <div className="form-card">
        <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{t('Password changed! Redirecting…')}</p>}

          <label>
            <span>{t('Current password')}</span>
            <div className="input-with-toggle">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="input-toggle"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
              >
                {showCurrent ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          <label>
            <span>{t('New password')}</span>
            <div className="input-with-toggle">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="input-toggle"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
              >
                {showNew ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
            <small className="field-hint">{t('At least 6 characters')}</small>
          </label>

          <label>
            <span>{t('Confirm new password')}</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          {/* Requirements checklist */}
          <ul className="password-checks">
            <li className={newPassword.length >= 6 ? 'pass' : ''}>
              {newPassword.length >= 6 ? '✓' : '•'} {t('At least 6 characters')}
            </li>
            <li className={currentPassword !== newPassword && newPassword ? 'pass' : ''}>
              {currentPassword !== newPassword && newPassword ? '✓' : '•'} {t('Different from current')}
            </li>
            <li className={newPassword === confirmPassword && newPassword ? 'pass' : ''}>
              {newPassword === confirmPassword && newPassword ? '✓' : '•'} {t('Passwords match')}
            </li>
          </ul>

          <div className="form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={isLoading || success}
            >
              {isLoading ? t('Changing…') : t('Change Password')}
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => navigate('/settings')}
            >
              {t('Cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
