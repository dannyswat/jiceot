import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

import { notificationAPI } from '../services/api'
import type { NotificationSetting } from '../types/notification'

const COMMON_TIMEZONES = Intl.supportedValuesOf('timeZone')

const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

const REMINDER_HOURS = Array.from({ length: 24 }, (_, i) => ({
  // eslint-disable-next-line prefer-template
  value: String(i).padStart(2, '0') + ':00',
  label: i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`,
}))

export default function NotificationSettingsPage() {
  const navigate = useNavigate()
  const [setting, setSetting] = useState<NotificationSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [barkUrl, setBarkUrl] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState('10:00')
  const [timezone, setTimezone] = useState(BROWSER_TZ)
  const [dueDaysAhead, setDueDaysAhead] = useState(3)

  useEffect(() => {
    void loadSettings()
  }, [])

  async function loadSettings(): Promise<void> {
    try {
      const data = await notificationAPI.getSettings()
      setSetting(data)
      setBarkUrl(data.bark_url || '')
      setEnabled(data.enabled)
      setReminderTime(data.reminder_time || '10:00')
      // Use saved timezone if set, otherwise keep browser-detected value
      setTimezone(data.timezone || BROWSER_TZ)
      setDueDaysAhead(data.due_days_ahead || 3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(): Promise<void> {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const updated = await notificationAPI.updateSettings({
        bark_url: barkUrl,
        enabled,
        reminder_time: reminderTime,
        timezone,
        due_days_ahead: dueDaysAhead,
      })
      setSetting(updated)
      setSuccess('Settings saved successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest(): Promise<void> {
    setTesting(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await notificationAPI.test()
      setSuccess(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test notification')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page__header page__header--with-back">
          <button type="button" className="back-button" onClick={() => navigate('/settings')}>
            <ArrowLeftIcon />
          </button>
          <div>
            <h1>Notification Settings</h1>
          </div>
        </div>
        <div className="page__loading"><p>Loading…</p></div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page__header page__header--with-back">
        <button type="button" className="back-button" onClick={() => navigate('/settings')}>
          <ArrowLeftIcon />
        </button>
        <div>
          <h1>Notification Settings</h1>
          <p>Configure daily push notifications for due items via Bark</p>
        </div>
      </div>

      <div className="form-card">
        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}

        {/* Enable toggle */}
        <div className="field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="field__label" style={{ margin: 0 }}>Enable Notifications</label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
        </div>

        {/* Bark URL */}
        <div className="field">
          <label className="field__label">Bark URL</label>
          <input
            type="url"
            className="field__input"
            placeholder="https://api.day.app/YOUR_KEY"
            value={barkUrl}
            onChange={(e) => setBarkUrl(e.target.value)}
            disabled={!enabled}
          />
          <small>
            Your Bark push URL — get it from the{' '}
            <a href="https://bark.day.app" target="_blank" rel="noopener noreferrer">
              Bark app
            </a>
            .
          </small>
        </div>

        {/* Reminder time */}
        <div className="field">
          <label className="field__label">Daily Reminder Time</label>
          <select
            className="field__input"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            disabled={!enabled}
          >
            {REMINDER_HOURS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <small>A notification is sent at this time whenever there are due items.</small>
        </div>

        {/* Timezone */}
        <div className="field">
          <label className="field__label">
            Timezone{' '}
            <small style={{ fontWeight: 400, opacity: 0.6 }}>(auto-detected from browser)</small>
          </label>
          <select
            className="field__input"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            disabled={!enabled}
          >
            {!COMMON_TIMEZONES.includes(BROWSER_TZ) && (
              <option value={BROWSER_TZ}>{BROWSER_TZ.replace(/_/g, ' ')} (detected)</option>
            )}
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, ' ')}{tz === BROWSER_TZ ? ' (detected)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Due days ahead */}
        <div className="field">
          <label className="field__label">Notify Days Ahead</label>
          <input
            type="number"
            className="field__input"
            min={1}
            max={30}
            value={dueDaysAhead}
            onChange={(e) => setDueDaysAhead(Math.max(1, Math.min(30, Number(e.target.value))))}
            disabled={!enabled}
          />
          <small>Get notified about items due within this many days (1–30). Default: 3.</small>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => void handleTest()}
            disabled={testing || !barkUrl}
          >
            {testing ? 'Sending…' : 'Send Test'}
          </button>
        </div>

        {setting?.last_notified_at && (
          <small>Last notification sent: {new Date(setting.last_notified_at).toLocaleString()}</small>
        )}
      </div>
    </div>
  )
}

