import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/client';

const BADGE_TONES = {
  dispatch: 'bg-blue-600',
  receipt: 'bg-teal-600',
  delivery: 'bg-emerald-600',
  otp: 'bg-violet-600',
  registry: 'bg-amber-600',
  stock: 'bg-sky-600',
  system: 'bg-slate-600',
  expiry: 'bg-amber-500',
};

function formatTimeLabel(iso) {
  if (!iso) return 'Just now';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function mapApiNotification(item) {
  const type = item.notification_type || 'system';
  return {
    id: item.id,
    type,
    title: item.title,
    message: item.message,
    details: item.details || '',
    timeLabel: formatTimeLabel(item.created_at),
    meta: item.transfer_id ? `Transfer #${item.transfer_id}` : '',
    priority: item.priority || 'medium',
    badgeTone: BADGE_TONES[type] || BADGE_TONES.system,
    unread: !item.is_read,
    transferId: item.transfer_id ?? item.transfer ?? null,
    tab: item.metadata?.tab,
    actionLabel: item.metadata?.tab ? 'Go to section' : 'View details',
    source: 'api',
  };
}

export function useNotifications({ pollMs = 45000, enabled = true } = {}) {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setRaw(Array.isArray(data) ? data : []);
    } catch {
      // keep last known notifications on transient errors
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
    if (!enabled || !pollMs) return undefined;
    const timer = setInterval(refresh, pollMs);
    return () => clearInterval(timer);
  }, [refresh, pollMs, enabled]);

  const notifications = useMemo(() => raw.map(mapApiNotification), [raw]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => notification.unread).length,
    [notifications]
  );

  const markRead = useCallback(
    async (notificationId) => {
      const id = Number(notificationId);
      if (!Number.isFinite(id)) return;
      try {
        await markNotificationRead(id);
      } catch {
        return;
      }
      setRaw((current) =>
        current.map((item) =>
          item.id === id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item
        )
      );
    },
    []
  );

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
    } catch {
      return;
    }
    setRaw((current) =>
      current.map((item) => ({
        ...item,
        is_read: true,
        read_at: item.read_at || new Date().toISOString(),
      }))
    );
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
  };
}
