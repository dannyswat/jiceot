import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  UserCircleIcon, 
  KeyIcon, 
  BellIcon, 
  CogIcon,
  ChevronRightIcon 
} from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const { user } = useAuth();

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          name: 'Profile Information',
          description: 'Update your name and email',
          icon: UserCircleIcon,
          href: '/settings/profile',
          disabled: true, // TODO: Implement later
        },
        {
          name: 'Change Password',
          description: 'Update your account password',
          icon: KeyIcon,
          href: '/change-password',
          disabled: false,
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          name: 'Notifications',
          description: 'Manage bill reminders and alerts',
          icon: BellIcon,
          href: '/settings/notifications',
          disabled: true, // TODO: Implement later
        },
        {
          name: 'General Settings',
          description: 'App preferences and defaults',
          icon: CogIcon,
          href: '/settings/general',
          disabled: true, // TODO: Implement later
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account and application preferences</p>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <UserCircleIcon className="w-10 h-10 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-900">{user?.name}</h2>
            <p className="text-gray-500">{user?.email}</p>
            <p className="text-xs text-gray-400">
              Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      {settingsSections.map((section) => (
        <div key={section.title} className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {section.items.map((item) => (
              <div key={item.name}>
                {item.disabled ? (
                  <div className="px-6 py-4 flex items-center justify-between opacity-50 cursor-not-allowed">
                    <div className="flex items-center space-x-3">
                      <item.icon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        Coming Soon
                      </span>
                      <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ) : (
                  <Link
                    to={item.href}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Danger Zone */}
      <div className="bg-white rounded-lg shadow border border-red-200">
        <div className="px-6 py-4 border-b border-red-200">
          <h3 className="text-lg font-medium text-red-900">Danger Zone</h3>
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-900">Delete Account</p>
              <p className="text-sm text-red-600">
                Permanently delete your account and all associated data
              </p>
            </div>
            <button
              disabled
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg opacity-50 cursor-not-allowed"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
