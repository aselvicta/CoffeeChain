import { MONTH_LABELS } from './user-messages';

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Last N calendar months of activity (oldest → newest). */
export function buildMonthlyTrend(items, options = {}) {
  const {
    dateKey = 'date',
    countKeys = { primary: 'count' },
    months = 6,
  } = options;

  const now = new Date();
  const buckets = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const anchor = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({
      key: `${anchor.getFullYear()}-${anchor.getMonth()}`,
      label: MONTH_LABELS[anchor.getMonth()],
      year: anchor.getFullYear(),
      month: anchor.getMonth(),
      ...Object.fromEntries(Object.keys(countKeys).map((key) => [key, 0])),
    });
  }

  items.forEach((item) => {
    const date = parseDate(item[dateKey]);
    if (!date) return;
    const bucket = buckets.find(
      (entry) => entry.year === date.getFullYear() && entry.month === date.getMonth()
    );
    if (!bucket) return;
    Object.entries(countKeys).forEach(([targetKey, sourceKey]) => {
      const increment = typeof sourceKey === 'function' ? sourceKey(item) : Number(item[sourceKey]) || 0;
      bucket[targetKey] += increment;
    });
  });

  return buckets.map(({ label, year, month, key, start, ...counts }) => ({
    month: label,
    ...Object.fromEntries(
      Object.keys(countKeys).map((countKey) => [countKey, Number(counts[countKey]) || 0])
    ),
  }));
}

/** Last N weeks (oldest → newest) for compact charts. */
export function buildWeeklyTrend(items, options = {}) {
  const {
    dateKey = 'date',
    countKeys = { bags: 'bags' },
    weeks = 4,
  } = options;

  const now = new Date();
  const startOfWeek = (date) => {
    const copy = new Date(date);
    const day = copy.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  const buckets = [];
  for (let index = weeks - 1; index >= 0; index -= 1) {
    const start = startOfWeek(new Date(now));
    start.setDate(start.getDate() - index * 7);
    buckets.push({
      start: start.getTime(),
      label: `W${weeks - index}`,
      ...Object.fromEntries(Object.keys(countKeys).map((key) => [key, 0])),
    });
  }

  items.forEach((item) => {
    const date = parseDate(item[dateKey]);
    if (!date) return;
    const weekStart = startOfWeek(date).getTime();
    const bucket = buckets.find((entry) => entry.start === weekStart);
    if (!bucket) return;
    Object.entries(countKeys).forEach(([targetKey, sourceKey]) => {
      const increment = typeof sourceKey === 'function' ? sourceKey(item) : Number(item[sourceKey]) || 0;
      bucket[targetKey] += increment;
    });
  });

  return buckets.map(({ label, ...counts }) => ({ week: label, ...counts }));
}
