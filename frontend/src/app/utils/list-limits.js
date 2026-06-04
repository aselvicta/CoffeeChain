/** Snapshot lists on overview / POS tabs (no page controls). */
export const RECENT_LIST_LIMIT = 20;

/** Full history and long operational lists. */
export const HISTORY_PAGE_SIZE = 10;

/** Supplier dispatched tab (already used a smaller page). */
export const DISPATCHED_PAGE_SIZE = 8;

export function sortByDateDesc(items, dateKey = 'date') {
  return [...items].sort((a, b) =>
    String(b[dateKey] || '').localeCompare(String(a[dateKey] || ''))
  );
}

export function takeRecent(items, limit = RECENT_LIST_LIMIT, dateKey = 'date') {
  return sortByDateDesc(items, dateKey).slice(0, limit);
}
