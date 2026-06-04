import { Bell, X } from 'lucide-react';

export function NotificationPanel({
  isOpen,
  onClose,
  notifications = [],
  unreadCount = 0,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onOpenInventory,
  onOpenDispatch,
  onNavigateTab,
}) {
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

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close notifications"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/20"
      />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-500">{unreadCount} unread</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && unreadCount > 0 && (
              <button
                type="button"
                onClick={() => onMarkAllRead?.()}
                className="text-xs font-medium text-green-600 hover:text-green-700"
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Bell className="h-8 w-8 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-900">No notifications</p>
              <p className="mt-1 text-sm text-gray-500">You&apos;re all caught up.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`group relative ${notification.unread ? 'bg-green-50/40' : 'bg-white'}`}
                >
                  <button
                    type="button"
                    onClick={() => handleItemClick(notification)}
                    className="w-full px-4 py-3 pr-10 text-left hover:bg-gray-50"
                  >
                    <div className="flex items-start gap-2">
                      {notification.unread && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                      )}
                      <div className={`min-w-0 flex-1 ${notification.unread ? '' : 'pl-4'}`}>
                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="mt-0.5 text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">{notification.timeLabel}</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label="Clear notification"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDismiss?.(notification.id);
                    }}
                    className="absolute right-2 top-2 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
