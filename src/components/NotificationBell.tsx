import {
  Bell,
  CheckCheck,
  ExternalLink,
  X,
} from 'lucide-react';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../lib/auth';

import {
  fetchNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
  type Notification,
} from '../services/notifications';

function formatNotificationTime(
  date: string
) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return '';
  }

  const now = new Date();

  const difference =
    now.getTime() - value.getTime();

  const minute =
    Math.floor(difference / 60000);

  if (minute < 1) {
    return 'Just now';
  }

  if (minute < 60) {
    return `${minute}m ago`;
  }

  const hour =
    Math.floor(minute / 60);

  if (hour < 24) {
    return `${hour}h ago`;
  }

  const day =
    Math.floor(hour / 24);

  if (day < 7) {
    return `${day}d ago`;
  }

  return value.toLocaleDateString();
}

export function NotificationBell() {
  const { profile } = useAuth();

  const navigate = useNavigate();

  const [open, setOpen] =
    useState(false);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const [markingAll, setMarkingAll] =
    useState(false);

  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const userId = profile?.id;

  const loadNotifications =
    useCallback(async () => {
      if (!userId) {
        return;
      }

      try {
        setLoading(true);

        const [
          notificationData,
          count,
        ] = await Promise.all([
          fetchNotifications(userId, {
            limit: 10,
          }),
          getUnreadNotificationCount(
            userId
          ),
        ]);

        setNotifications(
          notificationData
        );

        setUnreadCount(count);
      } catch (error) {
        console.error(
          'Unable to load notifications:',
          error
        );
      } finally {
        setLoading(false);
      }
    }, [userId]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const unsubscribe =
      subscribeToNotifications(
        userId,
        (notification) => {
          setNotifications(
            (current) => [
              notification,
              ...current.filter(
                (item) =>
                  item.id !==
                  notification.id
              ),
            ].slice(0, 10)
          );

          if (!notification.is_read) {
            setUnreadCount(
              (current) => current + 1
            );
          }
        }
      );

    return unsubscribe;
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent
    ) {
      if (
        !containerRef.current ||
        containerRef.current.contains(
          event.target as Node
        )
      ) {
        return;
      }

      setOpen(false);
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, []);

  const handleNotificationClick =
    async (
      notification: Notification
    ) => {
      if (
        userId &&
        !notification.is_read
      ) {
        try {
          await markNotificationAsRead(
            notification.id,
            userId
          );

          setNotifications(
            (current) =>
              current.map((item) =>
                item.id === notification.id
                  ? {
                      ...item,
                      is_read: true,
                      read_at:
                        new Date().toISOString(),
                    }
                  : item
              )
          );

          setUnreadCount(
            (current) =>
              Math.max(0, current - 1)
          );
        } catch (error) {
          console.error(
            'Unable to mark notification as read:',
            error
          );
        }
      }

      setOpen(false);

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
        return;
      }

      navigate('/notifications');
    };

  const handleMarkAllRead =
    async () => {
      if (!userId || unreadCount === 0) {
        return;
      }

      try {
        setMarkingAll(true);

        await markAllNotificationsAsRead(
          userId
        );

        setNotifications(
          (current) =>
            current.map((notification) => ({
              ...notification,
              is_read: true,
              read_at:
                notification.read_at ||
                new Date().toISOString(),
            }))
        );

        setUnreadCount(0);
      } catch (error) {
        console.error(
          'Unable to mark notifications as read:',
          error
        );
      } finally {
        setMarkingAll(false);
      }
    };

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() =>
          setOpen((value) => !value)
        }
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 99
              ? '99+'
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                Notifications
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : 'All caught up'}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  disabled={markingAll}
                  onClick={
                    handleMarkAllRead
                  }
                  title="Mark all as read"
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary-600 disabled:opacity-50 dark:hover:bg-slate-800"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />

                <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No notifications
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  New order and system updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map(
                (notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() =>
                      void handleNotificationClick(
                        notification
                      )
                    }
                    className={`flex w-full gap-3 border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70 ${
                      !notification.is_read
                        ? 'bg-primary-50/60 dark:bg-primary-500/5'
                        : ''
                    }`}
                  >
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        !notification.is_read
                          ? 'bg-primary-600'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    />

                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {notification.title}
                        </span>

                        {notification.order_id && (
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        )}
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-400">
                        {notification.message}
                      </span>

                      <span className="mt-2 block text-[11px] text-slate-400">
                        {formatNotificationTime(
                          notification.created_at
                        )}
                      </span>
                    </span>
                  </button>
                )
              )
            )}
          </div>

          <div className="border-t border-slate-200 p-2 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/notifications');
              }}
              className="w-full rounded-xl px-3 py-2.5 text-center text-sm font-semibold text-primary-600 transition hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-500/10"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;