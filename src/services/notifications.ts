import { supabase, getFriendlyError } from '../lib/supabase';
import type {
  Notification as DatabaseNotification,
} from '../types/database';

/* =========================================================
   TYPES
========================================================= */

export type NotificationType =
  | 'new_order'
  | 'order_update'
  | 'order_completed'
  | 'order_cancelled'
  | 'invoice'
  | 'payment'
  | 'inventory'
  | 'system'
  | string;

export type Notification =
  DatabaseNotification & {
    type: NotificationType;
    order_id?: string | null;
    invoice_id?: string | null;
    is_read?: boolean;
    read_at?: string | null;
  };

export type NotificationFilters = {
  unreadOnly?: boolean;
  limit?: number;
};

/* =========================================================
   FETCH NOTIFICATIONS
========================================================= */

export async function fetchNotifications(
  userId: string,
  filters: NotificationFilters = {}
): Promise<Notification[]> {
  if (!userId?.trim()) {
    throw new Error('User ID is required.');
  }

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', {
      ascending: false,
    });

  if (filters.unreadOnly) {
    query = query.eq(
      'is_read',
      false
    );
  }

  if (
    filters.limit &&
    filters.limit > 0
  ) {
    query = query.limit(
      filters.limit
    );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }

  return (
    (data || []) as Notification[]
  );
}

/* =========================================================
   GET UNREAD COUNT
========================================================= */

export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  if (!userId?.trim()) {
    return 0;
  }

  const {
    count,
    error,
  } = await supabase
    .from('notifications')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq(
      'user_id',
      userId
    )
    .eq(
      'is_read',
      false
    );

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }

  return count || 0;
}

/* =========================================================
   MARK ONE AS READ
========================================================= */

export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<void> {
  if (!notificationId?.trim()) {
    throw new Error(
      'Notification ID is required.'
    );
  }

  if (!userId?.trim()) {
    throw new Error(
      'User ID is required.'
    );
  }

  const {
    error,
  } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at:
        new Date().toISOString(),
    })
    .eq(
      'id',
      notificationId
    )
    .eq(
      'user_id',
      userId
    );

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }
}

/* =========================================================
   MARK ALL AS READ
========================================================= */

export async function markAllNotificationsAsRead(
  userId: string
): Promise<void> {
  if (!userId?.trim()) {
    throw new Error(
      'User ID is required.'
    );
  }

  const {
    error,
  } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at:
        new Date().toISOString(),
    })
    .eq(
      'user_id',
      userId
    )
    .eq(
      'is_read',
      false
    );

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }
}

/* =========================================================
   DELETE ONE
========================================================= */

export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<void> {
  if (!notificationId?.trim()) {
    throw new Error(
      'Notification ID is required.'
    );
  }

  if (!userId?.trim()) {
    throw new Error(
      'User ID is required.'
    );
  }

  const {
    error,
  } = await supabase
    .from('notifications')
    .delete()
    .eq(
      'id',
      notificationId
    )
    .eq(
      'user_id',
      userId
    );

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }
}

/* =========================================================
   DELETE ALL
========================================================= */

export async function deleteAllNotifications(
  userId: string
): Promise<void> {
  if (!userId?.trim()) {
    throw new Error(
      'User ID is required.'
    );
  }

  const {
    error,
  } = await supabase
    .from('notifications')
    .delete()
    .eq(
      'user_id',
      userId
    );

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }
}

/* =========================================================
   CREATE NOTIFICATION
========================================================= */

export async function createNotification(
  input: {
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    order_id?: string | null;
    invoice_id?: string | null;
  }
): Promise<Notification> {
  if (!input.user_id?.trim()) {
    throw new Error(
      'User ID is required.'
    );
  }

  if (!input.title?.trim()) {
    throw new Error(
      'Notification title is required.'
    );
  }

  if (!input.message?.trim()) {
    throw new Error(
      'Notification message is required.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('notifications')
    .insert({
      user_id:
        input.user_id,

      type:
        input.type,

      title:
        input.title.trim(),

      message:
        input.message.trim(),

      order_id:
        input.order_id || null,

      invoice_id:
        input.invoice_id || null,

      is_read:
        false,

      read_at:
        null,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(
      getFriendlyError(error) ||
        'Unable to create notification.'
    );
  }

  return data as Notification;
}

/* =========================================================
   REALTIME NEW NOTIFICATIONS
========================================================= */

export function subscribeToNotifications(
  userId: string,
  callback: (
    notification: Notification
  ) => void
) {
  if (!userId?.trim()) {
    return () => undefined;
  }

  const channel =
    supabase
      .channel(
        `notifications-${userId}-${Date.now()}`
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter:
            `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(
            payload.new as Notification
          );
        }
      )
      .subscribe();

  return () => {
    void supabase.removeChannel(
      channel
    );
  };
}

/* =========================================================
   REALTIME ALL NOTIFICATION CHANGES
========================================================= */

export function subscribeToNotificationChanges(
  userId: string,
  callback: (
    notification: Notification,
    eventType: string
  ) => void
) {
  if (!userId?.trim()) {
    return () => undefined;
  }

  const channel =
    supabase
      .channel(
        `notification-changes-${userId}-${Date.now()}`
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter:
            `user_id=eq.${userId}`,
        },
        (payload) => {
          if (
            payload.eventType ===
            'DELETE'
          ) {
            callback(
              payload.old as Notification,
              'DELETE'
            );

            return;
          }

          callback(
            payload.new as Notification,
            payload.eventType
          );
        }
      )
      .subscribe();

  return () => {
    void supabase.removeChannel(
      channel
    );
  };
}