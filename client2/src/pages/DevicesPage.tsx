import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

import { deviceAPI } from '../services/api'
import type { UserDevice } from '../types/auth'

export default function DevicesPage() {
  const navigate = useNavigate()
  const [devices, setDevices] = useState<UserDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showDeleteAll, setShowDeleteAll] = useState(false)

  useEffect(() => {
    void loadDevices()
  }, [])

  async function loadDevices(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const res = await deviceAPI.list()
      setDevices(res.devices)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number): Promise<void> {
    setDeletingId(id)
    try {
      await deviceAPI.delete(id)
      await loadDevices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove device')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDeleteAll(): Promise<void> {
    setLoading(true)
    try {
      await deviceAPI.deleteAll()
      setShowDeleteAll(false)
      await loadDevices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove devices')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page__header page__header--with-back">
        <button type="button" className="back-button" onClick={() => navigate('/settings')}>
          <ArrowLeftIcon />
        </button>
        <div>
          <h1>Devices</h1>
          <p>Manage devices with access to your account</p>
        </div>
        {devices.length > 1 && (
          <button
            type="button"
            className="danger-button danger-button--outline"
            onClick={() => setShowDeleteAll(true)}
          >
            Sign Out All Others
          </button>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading && devices.length === 0 && (
        <div className="page__loading">
          <div className="loading-orb" />
        </div>
      )}

      {!loading && devices.length === 0 && (
        <div className="empty-state">
          <ComputerDesktopIcon />
          <p>No devices found</p>
        </div>
      )}

      {devices.length > 0 && (
        <div className="device-list">
          {devices.map((device) => (
            <div
              key={device.id}
              className={`device-card ${device.is_current ? 'device-card--current' : ''}`}
            >
              <div className="device-card__icon">
                <DeviceIconComponent type={device.device_type} />
              </div>
              <div className="device-card__info">
                <div className="device-card__name">
                  <span>{device.device_name}</span>
                  {device.is_current && <span className="badge badge--green">Current</span>}
                </div>
                <small>Last active: {formatRelative(device.last_used_at)}</small>
                {device.ip_address && <small>IP: {device.ip_address}</small>}
              </div>
              {!device.is_current && (
                <button
                  type="button"
                  className="icon-button icon-button--danger"
                  onClick={() => void handleDelete(device.id)}
                  disabled={deletingId === device.id}
                  title="Remove device"
                >
                  {deletingId === device.id ? <ArrowPathIcon className="spin" /> : <TrashIcon />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="info-box">
        <h3>About Devices</h3>
        <ul>
          <li>Each login creates a new device session</li>
          <li>Sessions expire after 30 days of inactivity</li>
          <li>Removing a device requires re-authentication on that device</li>
        </ul>
      </div>

      {/* Delete all dialog */}
      {showDeleteAll && (
        <>
          <div className="modal-backdrop" onClick={() => setShowDeleteAll(false)} />
          <div className="modal-wrap">
            <div className="modal modal--narrow">
              <div className="modal__header">
                <h3>Sign Out All Other Devices?</h3>
              </div>
              <div className="modal__body">
                <p>This removes all sessions except the current one. You'll need to log in again on those devices.</p>
              </div>
              <div className="modal__actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setShowDeleteAll(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => void handleDeleteAll()}
                >
                  Yes, Sign Out All
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function DeviceIconComponent({ type }: { type: string }) {
  switch (type) {
    case 'ios':
    case 'android':
      return <DevicePhoneMobileIcon />
    case 'tablet':
      return <DeviceTabletIcon />
    default:
      return <ComputerDesktopIcon />
  }
}

function formatRelative(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}
