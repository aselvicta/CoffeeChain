import { useState } from 'react';
import { Bell } from 'lucide-react';
import { NotificationPanel } from './notification-panel';

export function NotificationBell({
  notifications = [],
  unreadCount = 0,
  onMarkRead,
  onMarkAllRead,
  onNavigateTab,
  onOpenInventory,
  onOpenDispatch,
  buttonClassName = 'relative p-2 rounded-full hover:bg-green-100',
  iconClassName = 'h-5 w-5 text-gray-700',
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={buttonClassName}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className={iconClassName} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      <NotificationPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
        onNavigateTab={(tab, notification) => {
          onNavigateTab?.(tab, notification);
          setIsOpen(false);
        }}
        onOpenInventory={() => {
          onOpenInventory?.();
          setIsOpen(false);
        }}
        onOpenDispatch={(dispatchId) => {
          onOpenDispatch?.(dispatchId);
          setIsOpen(false);
        }}
      />
    </>
  );
}
