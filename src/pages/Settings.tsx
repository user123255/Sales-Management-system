import { useEffect, useState } from 'react';
import {
  Bell,
  Lock,
  Settings as SettingsIcon,
  User,
  Save,
  CheckCircle,
  Eye,
  EyeOff,
  ChevronRight,
} from 'lucide-react';

import { useAuth } from '../lib/auth';

type SettingsSection =
  | 'profile'
  | 'notifications'
  | 'security'
  | 'application';

export function Settings() {
  const {
    user,
    profile,
    updateProfile,
    changePassword,
  } = useAuth();

  const [activeSection, setActiveSection] =
    useState<SettingsSection>('profile');

  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');

  const [orderUpdates, setOrderUpdates] = useState(true);
  const [newOrders, setNewOrders] = useState(true);
  const [completedOrders, setCompletedOrders] = useState(true);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;

    setFullName(profile.full_name || '');
    setDepartment(profile.department || '');

    setOrderUpdates(
      profile.notification_preferences?.order_updates ?? true
    );

    setNewOrders(
      profile.notification_preferences?.new_orders ?? true
    );

    setCompletedOrders(
      profile.notification_preferences?.completed_orders ?? true
    );
  }, [profile]);

  const clearMessages = () => {
    setMessage('');
    setError('');
  };

  const showSuccess = (text: string) => {
    setError('');
    setMessage(text);

    setTimeout(() => {
      setMessage('');
    }, 3500);
  };

  const showError = (text: string) => {
    setMessage('');
    setError(text);
  };

  const handleProfileSave = async () => {
    clearMessages();

    if (!fullName.trim()) {
      showError('Please enter your full name.');
      return;
    }

    try {
      setSaving(true);

      await updateProfile({
        full_name: fullName.trim(),
      });

      showSuccess('Profile updated successfully.');
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : 'Unable to update profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationSave = async () => {
    clearMessages();

    try {
      setSaving(true);

      await updateProfile({
        notification_preferences: {
          order_updates: orderUpdates,
          new_orders: newOrders,
          completed_orders: completedOrders,
        },
      });

      showSuccess(
        'Notification preferences saved successfully.'
      );
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : 'Unable to save notification preferences.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    clearMessages();

    if (!newPassword) {
      showError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      showError('Password must contain at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('The passwords do not match.');
      return;
    }

    try {
      setSaving(true);

      await changePassword(newPassword);

      setNewPassword('');
      setConfirmPassword('');

      showSuccess('Password changed successfully.');
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : 'Unable to change password.'
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * Small professional notification switch.
   * ON  = blue
   * OFF = light gray
   */
  const renderToggle = (
    enabled: boolean,
    setEnabled: (value: boolean) => void,
    label: string
  ) => (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`${label} notifications`}
      onClick={() => setEnabled(!enabled)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
        enabled
          ? 'bg-blue-600'
          : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled
            ? 'translate-x-[18px]'
            : 'translate-x-[2px]'
        }`}
      />
    </button>
  );

  const navigation = [
    {
      id: 'profile' as const,
      label: 'Profile',
      description: 'Personal information',
      icon: User,
    },
    {
      id: 'notifications' as const,
      label: 'Notifications',
      description: 'Notification preferences',
      icon: Bell,
    },
    {
      id: 'security' as const,
      label: 'Security',
      description: 'Password & account security',
      icon: Lock,
    },
    {
      id: 'application' as const,
      label: 'Application',
      description: 'System preferences',
      icon: SettingsIcon,
    },
  ];

  return (
    <div className="min-h-full bg-slate-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* PAGE HEADER */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Settings
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your account and application preferences.
          </p>
        </div>

        {/* SUCCESS MESSAGE */}
        {message && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle size={18} />
            <span>{message}</span>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">

          {/* SETTINGS MENU */}
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">

            {navigation.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setActiveSection(item.id);
                  }}
                  className={`group mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200 last:mb-0 ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon size={17} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {item.label}
                    </p>

                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {item.description}
                    </p>
                  </div>

                  <ChevronRight
                    size={15}
                    className={`shrink-0 ${
                      active
                        ? 'text-blue-500'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              );
            })}
          </aside>

          {/* CONTENT */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* PROFILE */}
            {activeSection === 'profile' && (
              <div>
                <div className="border-b border-slate-100 px-6 py-5">
                  <h2 className="text-lg font-bold text-slate-900">
                    Profile
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage your personal account information.
                  </p>
                </div>

                <div className="max-w-2xl space-y-5 px-6 py-6">

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Full Name
                    </label>

                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      value={fullName}
                      onChange={(e) =>
                        setFullName(e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Email Address
                    </label>

                    <input
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500"
                      value={user?.email || ''}
                      disabled
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Department
                    </label>

                    <input
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500"
                      value={department}
                      disabled
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleProfileSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={16} />

                    {saving
                      ? 'Saving...'
                      : 'Save Profile'}
                  </button>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS */}
            {activeSection === 'notifications' && (
              <div>
                <div className="border-b border-slate-100 px-6 py-5">
                  <h2 className="text-lg font-bold text-slate-900">
                    Notifications
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Choose which notifications you want to receive.
                  </p>
                </div>

                <div className="px-6 py-5">

                  <div className="divide-y divide-slate-100">

                    {/* ORDER UPDATES */}
                    <div className="flex items-center justify-between gap-6 py-4 first:pt-1">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          Order updates
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Receive notifications when your order changes status.
                        </p>
                      </div>

                      {renderToggle(
                        orderUpdates,
                        setOrderUpdates,
                        'Order updates'
                      )}
                    </div>

                    {/* NEW ORDERS */}
                    <div className="flex items-center justify-between gap-6 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          New orders
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Receive notifications when new orders are submitted.
                        </p>
                      </div>

                      {renderToggle(
                        newOrders,
                        setNewOrders,
                        'New orders'
                      )}
                    </div>

                    {/* COMPLETED ORDERS */}
                    <div className="flex items-center justify-between gap-6 py-4 last:pb-1">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          Completed orders
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Receive notifications when an order is completed.
                        </p>
                      </div>

                      {renderToggle(
                        completedOrders,
                        setCompletedOrders,
                        'Completed orders'
                      )}
                    </div>

                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <button
                      type="button"
                      onClick={handleNotificationSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save size={16} />

                      {saving
                        ? 'Saving...'
                        : 'Save Preferences'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY */}
            {activeSection === 'security' && (
              <div>
                <div className="border-b border-slate-100 px-6 py-5">
                  <h2 className="text-lg font-bold text-slate-900">
                    Security
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Keep your SOMS account secure.
                  </p>
                </div>

                <div className="max-w-xl space-y-5 px-6 py-6">

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      New Password
                    </label>

                    <div className="relative">
                      <input
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        type={
                          showPassword
                            ? 'text'
                            : 'password'
                        }
                        value={newPassword}
                        onChange={(e) =>
                          setNewPassword(e.target.value)
                        }
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(!showPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showPassword ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Confirm New Password
                    </label>

                    <div className="relative">
                      <input
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        type={
                          showConfirmPassword
                            ? 'text'
                            : 'password'
                        }
                        value={confirmPassword}
                        onChange={(e) =>
                          setConfirmPassword(e.target.value)
                        }
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(
                            !showConfirmPassword
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    <Lock size={16} />

                    {saving
                      ? 'Updating...'
                      : 'Change Password'}
                  </button>
                </div>
              </div>
            )}

            {/* APPLICATION */}
            {activeSection === 'application' && (
              <div>
                <div className="border-b border-slate-100 px-6 py-5">
                  <h2 className="text-lg font-bold text-slate-900">
                    Application
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    General Sales & Order Management System preferences.
                  </p>
                </div>

                <div className="px-6 py-6">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                        <SettingsIcon size={18} />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Sales & Order Management System
                        </p>

                        <p className="text-xs text-slate-500">
                          SOMS © 2026
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-500">
                      Configure application-wide preferences
                      and system options from this section.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </section>
        </div>
      </div>
    </div>
  );
}

export default Settings;