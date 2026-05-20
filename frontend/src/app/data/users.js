// User accounts for the CoffeeChain system
// Password for all demo accounts: "demo123"

export const USERS = {
  // Admin Account
  admin: {
    username: 'admin',
    password: 'demo123',
    role: 'admin',
    name: 'Dr. Joseph Mwamba',
    level: 'National Administrator',
    organization: 'Tanzania Coffee Board (TCB)',
    email: 'admin@coffeechain.go.tz',
    phone: '+255 28 222 1234',
    permissions: ['all'],
  },
  national1: {
    username: 'national1',
    password: 'demo123',
    role: 'national',
    name: 'Grace Mushi',
    level: 'National Office',
    organization: 'Tanzania Coffee Board (TCB)',
    email: 'national@coffeechain.go.tz',
    phone: '+255 22 555 1200',
    permissions: ['view_reports', 'view_inventory', 'view_distribution'],
  },

  // Supplier Accounts
  supplier1: {
    username: 'supplier1',
    password: 'demo123',
    role: 'supplier',
    name: 'Mbeya Fertilizers Ltd',
    level: 'National Supplier',
    organization: 'Mbeya Fertilizers Ltd',
    email: 'contact@mbeyafert.co.tz',
    phone: '+255 25 250 3456',
    supplierId: 'SUP-001',
    permissions: ['dispatch_batches', 'view_inventory', 'view_reports'],
  },

  supplier2: {
    username: 'supplier2',
    password: 'demo123',
    role: 'supplier',
    name: 'Tanzania Agricultural Inputs',
    level: 'National Supplier',
    organization: 'Tanzania Agricultural Inputs',
    email: 'info@tainputs.co.tz',
    phone: '+255 22 211 5678',
    supplierId: 'SUP-002',
    permissions: ['dispatch_batches', 'view_inventory', 'view_reports'],
  },

  // Retailer/Shop Accounts
  retailer1: {
    username: 'retailer1',
    password: 'demo123',
    role: 'retailer',
    name: 'Bukoba Agro Shop',
    level: 'Registered Retailer',
    organization: 'Bukoba Agro Shop',
    region: 'Kagera',
    district: 'Bukoba Urban',
    location: 'Jamhuri Street, Bukoba',
    email: 'bukobaagro@gmail.com',
    phone: '+255 784 123 456',
    retailerId: 'RET-001',
    permissions: ['receive_batches', 'distribute_fertilizer', 'view_farmers', 'view_stock'],
  },

  retailer2: {
    username: 'retailer2',
    password: 'demo123',
    role: 'retailer',
    name: 'Kagera Farm Supplies',
    level: 'Registered Retailer',
    organization: 'Kagera Farm Supplies',
    region: 'Kagera',
    district: 'Bukoba Rural',
    location: 'Market Area, Bukoba',
    email: 'kagerafarms@yahoo.com',
    phone: '+255 785 234 567',
    retailerId: 'RET-002',
    permissions: ['receive_batches', 'distribute_fertilizer', 'view_farmers', 'view_stock'],
  },

  // Cooperative Accounts (AMCOS)
  cooperative1: {
    username: 'cooperative1',
    password: 'demo123',
    role: 'cooperative',
    name: 'Bukoba Coffee Farmers AMCOS',
    level: 'Primary Cooperative',
    organization: 'Bukoba Coffee Farmers AMCOS',
    region: 'Kagera',
    district: 'Bukoba Rural',
    village: 'Maruku',
    email: 'bukobacoopamcos@gmail.com',
    phone: '+255 786 345 678',
    cooperativeId: 'AMCOS-001',
    memberCount: 250,
    permissions: ['receive_batches', 'distribute_fertilizer', 'verify_distribution', 'farmer_registry', 'view_reports'],
  },

  cooperative2: {
    username: 'cooperative2',
    password: 'demo123',
    role: 'cooperative',
    name: 'Karagwe Coffee Union',
    level: 'Primary Cooperative',
    organization: 'Karagwe Coffee Union',
    region: 'Kagera',
    district: 'Karagwe',
    village: 'Kayanga',
    email: 'karagweunion@gmail.com',
    phone: '+255 787 456 789',
    cooperativeId: 'AMCOS-002',
    memberCount: 180,
    permissions: ['receive_batches', 'distribute_fertilizer', 'verify_distribution', 'farmer_registry', 'view_reports'],
  },

  cooperative3: {
    username: 'cooperative3',
    password: 'demo123',
    role: 'cooperative',
    name: 'Muleba Growers Society',
    level: 'Primary Cooperative',
    organization: 'Muleba Growers Society',
    region: 'Kagera',
    district: 'Muleba',
    village: 'Nsherekela',
    email: 'mulebagrow@yahoo.com',
    phone: '+255 788 567 890',
    cooperativeId: 'AMCOS-003',
    memberCount: 320,
    permissions: ['receive_batches', 'distribute_fertilizer', 'verify_distribution', 'farmer_registry', 'view_reports'],
  },
};

// Helper function to authenticate user
export function authenticateUser(username, password) {
  const user = Object.values(USERS).find(
    u => u.username === username && u.password === password
  );
  
  if (user) {
    // Don't return password in user object
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  
  return null;
}

// Helper function to get user by username
export function getUserByUsername(username) {
  const user = USERS[username];
  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  return null;
}
