import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../lib/auth';

import {
  deleteAllNotifications,
  deleteNotification,
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotificationChanges,
  type Notification,
} from '../services/notifications';

type FilterType = 'all' | 'unread';

function formatNotificationTime(
  date: string
): string {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return '';
  }

  const now = new Date();

  const difference =
    now.getTime() - value.getTime();

  const minutes = Math.floor(
    difference / 60000
  );

  if (minutes < 1) {
    return 'Just now';
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(
    hours / 24
  );

  if (days < 7) {
    return `${days}d ago`;
  }

  return value.toLocaleDateString();
}

function getNotificationIcon(
  type: string
) {
  switch (type) {
    case 'new_order':
      return Bell;

    case 'order_update':
      return RefreshCw;

    case 'order_completed':
      return CheckCheck;

    case 'order_cancelled':
      return X;

    case 'invoice':
      return Check;

    case 'payment':
      return CheckCheck;

    case 'inventory':
      return Bell;

    default:
      return Bell;
  }
}

function getNotificationIconClass(
  type: string
): string {
  switch (type) {
    case 'new_order':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';

    case 'order_update':
      return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400';

    case 'order_completed':
      return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';

    case 'order_cancelled':
      return 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400';

    case 'invoice':
      return 'bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400';

    case 'payment':
      return 'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400';

    case 'inventory':
      return 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';

    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }
}

export default function Notifications() {
  const { profile } = useAuth();

  const navigate = useNavigate();

  const userId = profile?.id;

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [filter, setFilter] =
    useState<FilterType>('all');

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [markingAll, setMarkingAll] =
    useState(false);

  const [deletingAll, setDeletingAll] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const loadNotifications =
    useCallback(
      async (showLoading = true) => {
        if (!userId) {
          setNotifications([]);
          setLoading(false);
          return;
        }

        try {
          if (showLoading) {
            setLoading(true);
          }

          setError(null);

          const data =
            await fetchNotifications(
              userId
            );

          setNotifications(data);
        } catch (err) {
          console.error(
            'Unable to load notifications:',
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load notifications.'
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [userId]
    );

  useEffect(() => {
    void loadNotifications(true);
  }, [loadNotifications]);

  /*
   * REALTIME NOTIFICATIONS
   */
  useEffect(() => {
    if (!userId) {
      return;
    }

    const unsubscribe =
      subscribeToNotificationChanges(
        userId,
        (notification, eventType) => {
          if (
            eventType === 'DELETE'
          ) {
            setNotifications(
              (current) =>
                current.filter(
                  (item) =>
                    item.id !==
                    notification.id
                )
            );

            return;
          }

          setNotifications(
            (current) => {
              const exists =
                current.some(
                  (item) =>
                    item.id ===
                    notification.id
                );

              if (exists) {
                return current.map(
                  (item) =>
                    item.id ===
                    notification.id
                      ? notification
                      : item
                );
              }

              return [
                notification,
                ...current,
              ];
            }
          );
        }
      );

    return unsubscribe;
  }, [userId]);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !notification.is_read
      ).length,
    [notifications]
  );

  const filteredNotifications =
    useMemo(() => {
      if (filter === 'unread') {
        return notifications.filter(
          (notification) =>
            !notification.is_read
        );
      }

      return notifications;
    }, [notifications, filter]);

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadNotifications(false);
  };

  const handleMarkAsRead = async (
    notification: Notification
  ) => {
    if (
      !userId ||
      notification.is_read
    ) {
      return;
    }

    try {
      setProcessingId(
        notification.id
      );

      await markNotificationAsRead(
        notification.id,
        userId
      );

      setNotifications(
        (current) =>
          current.map((item) =>
            item.id ===
            notification.id
              ? {
                  ...item,
                  is_read: true,
                  read_at:
                    new Date().toISOString(),
                }
              : item
          )
      );
    } catch (err) {
      console.error(
        'Unable to mark notification as read:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to mark notification as read.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAllAsRead =
    async () => {
      if (
        !userId ||
        unreadCount === 0
      ) {
        return;
      }

      try {
        setMarkingAll(true);

        await markAllNotificationsAsRead(
          userId
        );

        const now =
          new Date().toISOString();

        setNotifications(
          (current) =>
            current.map(
              (notification) => ({
                ...notification,
                is_read: true,
                read_at:
                  notification.read_at ||
                  now,
              })
            )
        );
      } catch (err) {
        console.error(
          'Unable to mark all notifications as read:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to mark notifications as read.'
        );
      } finally {
        setMarkingAll(false);
      }
    };

  const handleDelete = async (
    notification: Notification
  ) => {
    if (!userId) {
      return;
    }

    const confirmed =
      window.confirm(
        'Delete this notification?'
      );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(
        notification.id
      );

      await deleteNotification(
        notification.id,
        userId
      );

      setNotifications(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              notification.id
          )
      );
    } catch (err) {
      console.error(
        'Unable to delete notification:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete notification.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteAll =
    async () => {
      if (
        !userId ||
        notifications.length === 0
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          'Are you sure you want to delete all notifications?'
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeletingAll(true);

        await deleteAllNotifications(
          userId
        );

        setNotifications([]);
      } catch (err) {
        console.error(
          'Unable to delete all notifications:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to delete notifications.'
        );
      } finally {
        setDeletingAll(false);
      }
    };

  const handleOpenNotification =
    async (
      notification: Notification
    ) => {
      await handleMarkAsRead(
        notification
      );

      if (notification.order_id) {
        navigate(
          `/orders/${notification.order_id}`
        );
        return;
      }

      if (notification.invoice_id) {
        navigate(
          `/invoices/${notification.invoice_id}`
        );
      }
    };

  if (!userId) {
    return (
      <div className="min-h-full bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/20">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />

              <div>
                <h2 className="font-bold text-red-800 dark:text-red-300">
                  Authentication required
                </h2>

                <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                  Please log in to view your notifications.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                <Bell className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Notifications
                </h1>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Stay updated with orders, invoices, payments and system activity.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? 'animate-spin'
                    : ''
                }`}
              />

              Refresh
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  void handleMarkAllAsRead()
                }
                disabled={markingAll}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" />

                {markingAll
                  ? 'Marking...'
                  : 'Mark all read'}
              </button>
            )}
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

              <div>
                <p className="font-semibold text-red-800 dark:text-red-300">
                  Notification error
                </p>

                <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setError(null)
              }
              className="rounded-lg p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* SUMMARY */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Total Notifications
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {notifications.length}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-800/50 dark:bg-amber-950/20">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Unread
            </p>

            <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-300">
              {unreadCount}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-950/20">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Read
            </p>

            <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-300">
              {notifications.length -
                unreadCount}
            </p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() =>
                setFilter('all')
              }
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All
            </button>

            <button
              type="button"
              onClick={() =>
                setFilter('unread')
              }
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                filter === 'unread'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={() =>
                void handleDeleteAll()
              }
              disabled={deletingAll}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-4 w-4" />

              {deletingAll
                ? 'Deleting...'
                : 'Delete all'}
            </button>
          )}
        </div>

        {/* LIST */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {loading ? (
            <div className="px-6 py-16 text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary-600" />

              <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                Loading notifications...
              </p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <Bell className="h-7 w-7 text-slate-400 dark:text-slate-500" />
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                {filter === 'unread'
                  ? 'No unread notifications'
                  : 'No notifications yet'}
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                {filter === 'unread'
                  ? 'You have read all your notifications.'
                  : 'New order, invoice, payment and system updates will appear here.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredNotifications.map(
                (notification) => {
                  const Icon =
                    getNotificationIcon(
                      notification.type
                    );

                  const iconClass =
                    getNotificationIconClass(
                      notification.type
                    );

                  const isProcessing =
                    processingId ===
                    notification.id;

                  return (
                    <div
                      key={notification.id}
                      className={`group flex gap-4 p-5 transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        !notification.is_read
                          ? 'bg-primary-50/40 dark:bg-primary-500/5'
                          : ''
                      }`}
                    >
                      {/* ICON */}
                      <button
                        type="button"
                        onClick={() =>
                          void handleOpenNotification(
                            notification
                          )
                        }
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
                      >
                        <Icon className="h-5 w-5" />
                      </button>

                      {/* CONTENT */}
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() =>
                            void handleOpenNotification(
                              notification
                            )
                          }
                          className="text-left"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              className={`font-semibold ${
                                notification.is_read
                                  ? 'text-slate-700 dark:text-slate-300'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {notification.title}
                            </h3>

                            {!notification.is_read && (
                              <span className="rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                NEW
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                            {notification.message}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                            <span>
                              {formatNotificationTime(
                                notification.created_at
                              )}
                            </span>

                            {notification.order_id && (
                              <span className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400">
                                <ExternalLink className="h-3 w-3" />
                                View order
                              </span>
                            )}

                            {notification.invoice_id && (
                              <span className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400">
                                <ExternalLink className="h-3 w-3" />
                                View invoice
                              </span>
                            )}
                          </div>
                        </button>
                      </div>

                      {/* ACTIONS */}
                      <div className="flex shrink-0 items-start gap-1 opacity-100 sm:opacity-70 sm:transition sm:group-hover:opacity-100">
                        {!notification.is_read && (
                          <button
                            type="button"
                            title="Mark as read"
                            disabled={isProcessing}
                            onClick={() =>
                              void handleMarkAsRead(
                                notification
                              )
                            }
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          title="Delete notification"
                          disabled={isProcessing}
                          onClick={() =>
                            void handleDelete(
                              notification
                            )
                          }
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}