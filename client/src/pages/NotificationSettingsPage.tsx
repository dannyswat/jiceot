import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  BellIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  PlayIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { notificationSettingsApi, type UserNotificationSetting, type CreateOrUpdateNotificationSettingRequest } from '../services/api';

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [triggeringReminder, setTriggeringReminder] = useState(false);
  const [_, setSettings] = useState<UserNotificationSetting | null>(null);
  const [formData, setFormData] = useState<CreateOrUpdateNotificationSettingRequest>({
    bark_api_url: '',
    bark_enabled: false,
    remind_hour: 9,
    remind_days_before: 3
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await notificationSettingsApi.get();
      setSettings(data);
      setFormData({
        bark_api_url: data.bark_api_url,
        bark_enabled: data.bark_enabled,
        remind_hour: data.remind_hour,
        remind_days_before: data.remind_days_before
      });
    } catch (error: any) {
      console.error('Failed to load notification settings:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to load notification settings'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);

      const updated = await notificationSettingsApi.createOrUpdate(formData);
      setSettings(updated);
      setMessage({
        type: 'success',
        text: 'Notification settings saved successfully!'
      });
    } catch (error: any) {
      console.error('Failed to save notification settings:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to save notification settings'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      setTesting(true);
      setMessage(null);

      if (!formData.bark_enabled || !formData.bark_api_url.trim()) {
        setMessage({
          type: 'error',
          text: 'Please enable notifications and set a Bark API URL first'
        });
        return;
      }

      await notificationSettingsApi.test();
      setMessage({
        type: 'success',
        text: 'Test notification sent successfully! Check your Bark app.'
      });
    } catch (error: any) {
      console.error('Failed to send test notification:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to send test notification'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleTriggerManualReminder = async () => {
    try {
      setTriggeringReminder(true);
      setMessage(null);

      if (!formData.bark_enabled || !formData.bark_api_url.trim()) {
        setMessage({
          type: 'error',
          text: 'Please enable notifications and set a Bark API URL first'
        });
        return;
      }

      const result = await notificationSettingsApi.triggerManualReminder();
      setMessage({
        type: result.sent ? 'success' : 'info',
        text: result.message
      });
    } catch (error: any) {
      console.error('Failed to trigger manual reminder:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to trigger manual reminder'
      });
    } finally {
      setTriggeringReminder(false);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${i.toString().padStart(2, '0')}:00`
  }));

  const dayOptions = [
    { value: 0, label: 'Same day' },
    { value: 1, label: '1 day before' },
    { value: 2, label: '2 days before' },
    { value: 3, label: '3 days before' },
    { value: 5, label: '5 days before' },
    { value: 7, label: '1 week before' },
    { value: 14, label: '2 weeks before' },
    { value: 30, label: '1 month before' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/settings"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
          <p className="text-gray-600">Manage bill reminders and alerts</p>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`p-4 rounded-lg flex items-start space-x-3 ${
          message.type === 'success' ? 'bg-green-50 border border-green-200' :
          message.type === 'error' ? 'bg-red-50 border border-red-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          {message.type === 'success' && <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />}
          {message.type === 'error' && <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />}
          {message.type === 'info' && <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />}
          <p className={`text-sm ${
            message.type === 'success' ? 'text-green-800' :
            message.type === 'error' ? 'text-red-800' :
            'text-blue-800'
          }`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <BellIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-medium text-gray-900">Bark Notifications</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Configure Bark app notifications for bill reminders
          </p>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Enable Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Enable Notifications</label>
              <p className="text-sm text-gray-500">Receive bill reminder notifications</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={formData.bark_enabled}
                onChange={(e) => setFormData({ ...formData, bark_enabled: e.target.checked })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Bark API URL */}
          <div>
            <label htmlFor="bark_api_url" className="block text-sm font-medium text-gray-900 mb-2">
              Bark API URL
            </label>
            <input
              type="url"
              id="bark_api_url"
              value={formData.bark_api_url}
              onChange={(e) => setFormData({ ...formData, bark_api_url: e.target.value })}
              placeholder="https://api.day.app/your_device_key"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!formData.bark_enabled}
            />
            <p className="text-xs text-gray-500 mt-1">
              Get this from your Bark app settings. Format: https://api.day.app/YOUR_DEVICE_KEY
            </p>
          </div>

          {/* Reminder Time */}
          <div>
            <label htmlFor="remind_hour" className="block text-sm font-medium text-gray-900 mb-2">
              Reminder Time
            </label>
            <select
              id="remind_hour"
              value={formData.remind_hour}
              onChange={(e) => setFormData({ ...formData, remind_hour: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!formData.bark_enabled}
            >
              {hours.map((hour) => (
                <option key={hour.value} value={hour.value}>
                  {hour.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Time of day when you want to receive reminders (24-hour format)
            </p>
          </div>

          {/* Reminder Days */}
          <div>
            <label htmlFor="remind_days_before" className="block text-sm font-medium text-gray-900 mb-2">
              Reminder Timing
            </label>
            <select
              id="remind_days_before"
              value={formData.remind_days_before}
              onChange={(e) => setFormData({ ...formData, remind_days_before: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!formData.bark_enabled}
            >
              {dayOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How many days before a bill is due should you be reminded
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-between">
          <div className="flex space-x-3">
            {/* Test Notification Button */}
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={testing || !formData.bark_enabled || !formData.bark_api_url.trim()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Test Notification
                </>
              )}
            </button>

            {/* Manual Reminder Button */}
            <button
              type="button"
              onClick={handleTriggerManualReminder}
              disabled={triggeringReminder || !formData.bark_enabled || !formData.bark_api_url.trim()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {triggeringReminder ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                  Checking...
                </>
              ) : (
                <>
                  <ClockIcon className="w-4 h-4 mr-2" />
                  Check Now
                </>
              )}
            </button>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </form>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-2">About Bark Notifications</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                Bark is a simple notification app for iOS and macOS. To set up notifications:
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Download Bark from the App Store</li>
                <li>Open Bark and copy your device key</li>
                <li>Enter the URL format: https://api.day.app/YOUR_DEVICE_KEY</li>
                <li>Use the "Test Notification" button to verify it works</li>
              </ol>
              <p className="mt-3">
                The system will automatically check for bills due according to your settings and send you reminders.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
