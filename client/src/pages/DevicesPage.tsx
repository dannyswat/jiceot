import { useState, useEffect } from 'react';
import { deviceAPI, type UserDevice } from '../services/api';
import { 
  ComputerDesktopIcon, 
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  TrashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function DevicesPage() {
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await deviceAPI.list();
      setDevices(response.devices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices');
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevice = async (deviceId: number) => {
    if (!confirm('Are you sure you want to remove this device? You will need to log in again on that device.')) {
      return;
    }

    try {
      setDeletingId(deviceId);
      await deviceAPI.delete(deviceId);
      await loadDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete device');
      console.error('Failed to delete device:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAllOtherDevices = async () => {
    try {
      setLoading(true);
      const response = await deviceAPI.deleteAll();
      setShowDeleteAllDialog(false);
      await loadDevices();
      alert(`Successfully removed ${response.count} device(s)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete devices');
      console.error('Failed to delete devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'ios':
      case 'android':
        return DevicePhoneMobileIcon;
      case 'tablet':
        return DeviceTabletIcon;
      default:
        return ComputerDesktopIcon;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logged In Devices</h1>
          <p className="text-gray-600">Manage devices with access to your account</p>
        </div>
        {devices.length > 1 && (
          <button
            onClick={() => setShowDeleteAllDialog(true)}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors border border-red-300"
          >
            Sign Out All Other Devices
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && devices.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      )}

      {/* Devices List */}
      {!loading && devices.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <ComputerDesktopIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No devices found</p>
        </div>
      )}

      {devices.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
          {devices.map((device) => {
            const DeviceIcon = getDeviceIcon(device.device_type);
            
            return (
              <div
                key={device.id}
                className={`p-4 ${device.is_current ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${device.is_current ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <DeviceIcon className={`h-6 w-6 ${device.is_current ? 'text-blue-600' : 'text-gray-600'}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{device.device_name}</h3>
                        {device.is_current && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            Current Device
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">Last active:</span> {formatDate(device.last_used_at)}
                        </p>
                        {device.ip_address && (
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">IP Address:</span> {device.ip_address}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          Logged in on {new Date(device.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {!device.is_current && (
                    <button
                      onClick={() => handleDeleteDevice(device.id)}
                      disabled={deletingId === device.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                      title="Remove this device"
                    >
                      {deletingId === device.id ? (
                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      ) : (
                        <TrashIcon className="h-5 w-5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Security Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">About Device Management</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Each time you log in, a new device session is created</li>
          <li>Sessions automatically expire after 30 days of inactivity</li>
          <li>Removing a device will require logging in again on that device</li>
          <li>Your current device cannot be removed from this page</li>
        </ul>
      </div>

      {/* Delete All Dialog */}
      {showDeleteAllDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Sign Out All Other Devices?
            </h3>
            <p className="text-gray-600 mb-6">
              This will remove all devices except the current one. You'll need to log in again on those devices.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleDeleteAllOtherDevices}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
              >
                Yes, Sign Out All
              </button>
              <button
                onClick={() => setShowDeleteAllDialog(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
