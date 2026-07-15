/**
 * Canonical order status labels and filters — keep all panels in sync.
 *
 * Flow: PENDING → ACCEPTED → DISPATCHED → READY → DELIVERED
 */

export const ORDER_STATUS = {
  PENDING: {
    label: 'Pending Review',
    badge: 'bg-amber-100 text-amber-700',
  },
  ACCEPTED: {
    label: 'Accepted',
    badge: 'bg-blue-100 text-blue-700',
  },
  PROCESSING: {
    label: 'Processing',
    badge: 'bg-purple-100 text-purple-700',
  },
  DISPATCHED: {
    label: 'Awaiting Verification',
    badge: 'bg-blue-100 text-blue-700',
  },
  READY: {
    label: 'En Route',
    badge: 'bg-green-100 text-green-700',
  },
  DELIVERED: {
    label: 'Delivered',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  REJECTED: {
    label: 'Rejected',
    badge: 'bg-red-100 text-red-600',
  },
  CANCELLED: {
    label: 'Cancelled',
    badge: 'bg-gray-100 text-gray-500',
  },
};

export function orderStatusLabel(status) {
  return ORDER_STATUS[status]?.label || status || 'Unknown';
}

export function orderStatusBadge(status) {
  return ORDER_STATUS[status]?.badge || 'bg-gray-100 text-gray-500';
}

export const BRANCH_ACTIVE_STATUSES = ['PENDING', 'ACCEPTED', 'PROCESSING', 'DISPATCHED', 'READY'];
export const BRANCH_DONE_STATUSES = ['DELIVERED', 'CANCELLED', 'REJECTED'];

export const SUPPLIER_ACTION_STATUSES = ['PENDING', 'ACCEPTED'];
export const SUPPLIER_DONE_STATUSES = ['DISPATCHED', 'READY', 'DELIVERED', 'REJECTED', 'CANCELLED'];

export const WM_ACTION_STATUSES = ['PENDING', 'DISPATCHED'];
export const WM_DONE_STATUSES = ['READY', 'DELIVERED'];

export function branchCanCancel(status) {
  return ['PENDING', 'ACCEPTED'].includes(status);
}

export function branchCanConfirmDelivery(status) {
  return status === 'READY';
}

export function supplierCanDispatch(status) {
  return ['PENDING', 'ACCEPTED'].includes(status);
}
