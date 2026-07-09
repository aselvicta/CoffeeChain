export const ROLE_LABELS = {
  admin: 'Administrator',
  supplier: 'Supplier',
  warehouse_manager: 'Warehouse Manager',
  retailer: 'Retailer',
  cooperative: 'Cooperative (AMCOS)',
  regulator: 'Regulator',
  user: 'User',
};

export const BRANCH_TYPE_LABELS = {
  RETAILER: 'Retailer',
  COOPERATIVE: 'Cooperative (AMCOS)',
  REGULATOR: 'Regulatory Authority',
};

export const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-800',
  supplier: 'bg-blue-100 text-blue-800',
  warehouse_manager: 'bg-amber-100 text-amber-800',
  retailer: 'bg-emerald-100 text-emerald-800',
  cooperative: 'bg-teal-100 text-teal-800',
  regulator: 'bg-rose-100 text-rose-800',
  user: 'bg-gray-100 text-gray-700',
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || role || 'Unknown';
}

export function getBranchTypeLabel(branchType) {
  return BRANCH_TYPE_LABELS[branchType] || branchType || 'Unknown';
}

export function getRoleColor(role) {
  return ROLE_COLORS[role] || 'bg-gray-100 text-gray-700';
}
