const ROLE_ALIASES = {
  national: 'admin',
};

function normalizeRole(role) {
  return ROLE_ALIASES[role] || role;
}

function splitPathname(pathname) {
  return String(pathname || '')
    .split('/')
    .filter(Boolean);
}

export function buildDashboardPath(role, tab = 'overview') {
  return `/app/${normalizeRole(role)}/${tab}`;
}

export function resolveDashboardTab(pathname, role, { defaultTab = 'overview', aliases = {}, validTabs = [] } = {}) {
  const normalizedRole = normalizeRole(role);
  const segments = splitPathname(pathname);
  const appIndex = segments.indexOf('app');

  if (appIndex === -1) {
    return defaultTab;
  }

  const routeParts = segments.slice(appIndex + 1);
  if (routeParts.length === 0) {
    return defaultTab;
  }

  const routeTab = routeParts.length === 1
    ? routeParts[0]
    : (routeParts[0] === normalizedRole ? routeParts[1] : defaultTab);

  const resolvedTab = aliases[routeTab] || routeTab || defaultTab;

  if (validTabs.length > 0 && !validTabs.includes(resolvedTab)) {
    return defaultTab;
  }

  return resolvedTab;
}