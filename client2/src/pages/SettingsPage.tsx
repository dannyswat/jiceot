import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronRightIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

import { useAuth } from '../contexts/AuthContext'

const SETTINGS_SECTIONS = [
  {
    title: 'Account',
    items: [
      {
        name: 'Change Password',
        description: 'Update your account password',
        icon: KeyIcon,
        href: '/change-password',
      },
    ],
  },
  {
    title: 'Security',
    items: [
      {
        name: 'Devices',
        description: 'Manage logged-in devices',
        icon: ComputerDesktopIcon,
        href: '/settings/devices',
      },
    ],
  },
]

export default function SettingsPage() {
  const { user, deleteAccount } = useAuth()
  const navigate = useNavigate()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDeleteAccount(): Promise<void> {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteAccount()
      navigate('/login', { replace: true })
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      {/* User card */}
      <div className="settings-user-card">
        <div className="settings-user-card__avatar">
          <UserCircleIcon />
        </div>
        <div>
          <p className="settings-user-card__name">{user?.name ?? 'User'}</p>
          <p className="settings-user-card__email">{user?.email ?? ''}</p>
          {user?.created_at && (
            <p className="settings-user-card__since">
              Member since {new Date(user.created_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Settings sections */}
      {SETTINGS_SECTIONS.map((section) => (
        <div key={section.title} className="settings-section">
          <h2 className="settings-section__title">{section.title}</h2>
          <div className="settings-section__items">
            {section.items.map((item) => (
              <Link key={item.href} to={item.href} className="settings-item">
                <item.icon className="settings-item__icon" />
                <div className="settings-item__text">
                  <span>{item.name}</span>
                  <small>{item.description}</small>
                </div>
                <ChevronRightIcon className="settings-item__chevron" />
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Danger zone */}
      <div className="settings-section settings-section--danger">
        <h2 className="settings-section__title">Danger Zone</h2>
        <div className="settings-danger">
          <div>
            <p>Delete Account</p>
            <small>Permanently delete your account and all data</small>
          </div>
          <button
            type="button"
            className="danger-button"
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <>
          <div className="modal-backdrop" onClick={() => setShowDeleteDialog(false)} />
          <div className="modal-wrap">
            <div className="modal modal--narrow">
              <div className="modal__header">
                <div className="modal__header-icon modal__header-icon--danger">
                  <ExclamationTriangleIcon />
                </div>
                <div>
                  <h3>Delete Account</h3>
                  <p>This action cannot be undone.</p>
                </div>
              </div>

              <div className="modal__body">
                <p>All your data will be permanently removed:</p>
                <ul>
                  <li>Wallets and payment records</li>
                  <li>Expense types and expenses</li>
                  <li>Account information and sessions</li>
                </ul>
              </div>

              {deleteError && <p className="form-error">{deleteError}</p>}

              <div className="modal__actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setShowDeleteDialog(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => void handleDeleteAccount()}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting…' : 'Delete My Account'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
