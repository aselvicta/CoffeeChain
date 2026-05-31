import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ChevronRight,
  Clock3,
  Filter,
  Package,
  ShieldCheck,
  Truck,
  UserPlus,
  X,
} from 'lucide-react';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'dispatches', label: 'Activity' },
];

const iconMap = {
  expiry: AlertTriangle,
  stock: Package,
  dispatch: Truck,
  receipt: Package,
  delivery: CheckCheck,
  otp: ShieldCheck,
  registry: UserPlus,
  system: Bell,
  update: Bell,
};

export function NotificationPanel({
  isOpen,
  onClose,
  notifications = [],
  unreadCount = 0,
  onMarkRead,
  onMarkAllRead,
  onOpenInventory,
  onOpenDispatch,
  onNavigateTab,
}) {
  const [filter, setFilter] = useState('all');

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (filter === 'alerts') {
        return ['expiry', 'stock', 'system'].includes(notification.type) || notification.priority === 'high';
      }
      if (filter === 'dispatches') {
        return ['dispatch', 'receipt', 'delivery', 'otp', 'registry'].includes(notification.type);
      }
      return true;
    });
  }, [filter, notifications]);

  if (!isOpen) return null;

  const handleItemClick = (notification) => {
    onMarkRead?.(notification.id);
    if (notification.tab) {
      onNavigateTab?.(notification.tab, notification);
      return;
    }
    if (notification.type === 'expiry' || notification.type === 'stock') {
      onOpenInventory?.();
      return;
    }
    if (['dispatch', 'delivery', 'receipt'].includes(notification.type)) {
      onOpenDispatch?.(
        notification.transferId ||
          notification.transfer_ids?.[0] ||
          notification.dispatchId ||
          notification.id
      );
    }
  };

  const urgentCount = notifications.filter((notification) => notification.priority === 'high').length;
  const dispatchCount = notifications.filter((notification) =>
    ['dispatch', 'receipt', 'delivery', 'otp', 'registry'].includes(notification.type)
  ).length;

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close notifications"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-950/30 backdrop-blur-[2px]"
      />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                <Bell className="h-3.5 w-3.5" />
                Live notifications
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
              <p className="text-sm text-slate-600">Track expiring stock, dispatch updates, and delivery confirmations.</p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs uppercase tracking-wide text-slate-500">Unread</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{unreadCount}</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs uppercase tracking-wide text-slate-500">Urgent</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{urgentCount}</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs uppercase tracking-wide text-slate-500">Activity</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{dispatchCount}</p>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === item.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onMarkAllRead?.()}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4">
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <Clock3 className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-900">No notifications in this view</p>
                <p className="mt-1 text-sm text-slate-500">Try a different filter or wait for new activity.</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const Icon = iconMap[notification.type] || Bell;
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleItemClick(notification)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      notification.unread
                        ? 'border-emerald-200 bg-white shadow-sm'
                        : 'border-slate-200 bg-white/90'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-2xl p-2.5 ${notification.badgeTone}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                            <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                          </div>
                          {notification.unread && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                            <Clock3 className="h-3 w-3" />
                            {notification.timeLabel}
                          </span>
                          {notification.meta && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                              {notification.meta}
                            </span>
                          )}
                          {notification.priority === 'high' && (
                            <span className="rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-700">
                              High priority
                            </span>
                          )}
                        </div>

                        {notification.details && (
                          <p className="mt-3 text-sm text-slate-500">{notification.details}</p>
                        )}

                        <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                          {notification.actionLabel || 'View details'}
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
