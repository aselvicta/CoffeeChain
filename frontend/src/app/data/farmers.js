// Seeded farmer data for tracking fertilizer distribution
// Farmers don't have accounts - they're identified by their Ministry of Agriculture IDs
// This data will be replaced with real API data from the Ministry

export const FARMERS = [
  // Bukoba Coffee Farmers AMCOS (AMCOS-001)
  {
    farmerId: 'MOA-KAG-001',
    name: 'Juma Abdallah',
    phone: '+255 754 123 001',
    village: 'Maruku',
    district: 'Bukoba Rural',
    region: 'Kagera',
    cooperative: 'AMCOS-001',
    cooperativeName: 'Bukoba Coffee Farmers AMCOS',
    landSize: 2.5, // hectares
    registrationDate: '2024-01-15',
    status: 'active',
  },
  {
    farmerId: 'MOA-KAG-002',
    name: 'Asha Mwita',
    phone: '+255 754 123 002',
    village: 'Maruku',
    district: 'Bukoba Rural',
    region: 'Kagera',
    cooperative: 'AMCOS-001',
    cooperativeName: 'Bukoba Coffee Farmers AMCOS',
    landSize: 1.8,
    registrationDate: '2024-01-20',
    status: 'active',
  },
  {
    farmerId: 'MOA-KAG-003',
    name: 'Hamisi Kassim',
    phone: '+255 754 123 003',
    village: 'Maruku',
    district: 'Bukoba Rural',
    region: 'Kagera',
    cooperative: 'AMCOS-001',
    cooperativeName: 'Bukoba Coffee Farmers AMCOS',
    landSize: 3.2,
    registrationDate: '2024-02-01',
    status: 'active',
  },
  {
    farmerId: 'MOA-KAG-004',
    name: 'Mariam Hassan',
    phone: '+255 754 123 004',
    village: 'Maruku',
    district: 'Bukoba Rural',
    region: 'Kagera',
    cooperative: 'AMCOS-001',
    cooperativeName: 'Bukoba Coffee Farmers AMCOS',
    landSize: 2.0,
    registrationDate: '2024-02-10',
    status: 'active',
  },
  {
    farmerId: 'MOA-KAG-005',
    name: 'Charles Mwakasege',
    phone: '+255 754 123 005',
    village: 'Maruku',
    district: 'Bukoba Rural',
    region: 'Kagera',
    cooperative: 'AMCOS-001',
    cooperativeName: 'Bukoba Coffee Farmers AMCOS',
    landSize: 4.5,
    registrationDate: '2024-02-15',
    status: 'active',
  },

  // Karagwe Coffee Union (AMCOS-002)
  {
    farmerId: 'MOA-KAG-006',
    name: 'Emmanuel Rweyemamu',
    phone: '+255 755 234 001',
    village: 'Kayanga',
    district: 'Karagwe',
    region: 'Kagera',
    cooperative: 'AMCOS-002',
    cooperativeName: 'Karagwe Coffee Union',
    landSize: 3.0,
    registrationDate: '2024-01-18',
    status: 'active',
  },
  {
    farmerId: 'MOA-KAG-007',
    name: 'Grace Nyamwiza',
    phone: '+255 755 234 002',
    village: 'Kayanga',
    district: 'Karagwe',
    region: 'Kagera',
    cooperative: 'AMCOS-002',
    cooperativeName: 'Karagwe Coffee Union',
    landSize: 2.3,
    registrationDate: '2024-01-25',
    status: 'active',
  },
  {
    farmerId: 'MOA-KAG-008',
    name: 'Joseph Mugisha',
    phone: '+255 755 234 003',
    village: 'Kayanga',
    district: 'Karagwe',
    region: 'Kagera',
    cooperative: 'AMCOS-002',
    cooperativeName: 'Karagwe Coffee Union',
    landSize: 5.2,
    registrationDate: '2024-02-05',
    status: 'active',
  },
  {
    farmerId: 'MOA-KAG-009',
    name: 'Amina Bakari',
    phone: '+255 755 234 004',
    village: 'Kayanga',
    district: 'Karagwe',
    region: 'Kagera',
    cooperative: 'AMCOS-002',
    cooperativeName: 'Karagwe Coffee Union',
    landSize: 1.5,
    registrationDate: '2024-02-12',
    status: 'active',
  },
  {
    farmerId: 'MOA-KAG-010',
    name: 'Daniel Kamugisha',
    phone: '+255 755 234 005',
    village: 'Kayanga',
    district: 'Karagwe',
    region: 'Kagera',
    cooperative: 'AMCOS-002',
    cooperativeName: 'Karagwe Coffee Union',
    landSize: 3.8,
    registrationDate: '2024-02-20',
    status: 'active',
  },

  // Muleba Growers Society (AMCOS-003)
  {
    farmerId: 'MOA-KAG-011',
    name: 'Frank Birungi',
    phone: '+255 756 345 001',
    village: 'Nsherekela',
    district: 'Muleba',
    region: 'Kagera',
    cooperative: 'AMCOS-003',
    cooperativeName: 'Muleba Growers Society',
    landSize: 2.7,
    registrationDate: '2024-01-22',
    status: 'active',
  },
  {
    farmerId: 'MOA-KAG-012',
    name: 'Hawa Musa',
    phone: '+255 756 345 002',
    village: 'Nsherekela',
    district: 'Muleba',
    region: 'Kagera',
    cooperative: 'AMCOS-003',
    cooperativeName: 'Muleba Growers Society',
    landSize: 1.9,
    registrationDate: '2024-01-28',
    status: 'active',
  },
  {
    farmerId: 'MOA-KAG-013',
    name: 'Ibrahim Selemani',
    phone: '+255 756 345 003',
    village: 'Nsherekela',
    district: 'Muleba',
    region: 'Kagera',
    cooperative: 'AMCOS-003',
    cooperativeName: 'Muleba Growers Society',
    landSize: 4.1,
    registrationDate: '2024-02-03',
    status: 'active',
  },
  {
    farmerId: 'MOA-KAG-014',
    name: 'Joyce Kamara',
    phone: '+255 756 345 004',
    village: 'Nsherekela',
    district: 'Muleba',
    region: 'Kagera',
    cooperative: 'AMCOS-003',
    cooperativeName: 'Muleba Growers Society',
    landSize: 3.5,
    registrationDate: '2024-02-08',
    status: 'active',
  },
  {
    farmerId: 'MOA-KAG-015',
    name: 'Kennedy Rutatina',
    phone: '+255 756 345 005',
    village: 'Nsherekela',
    district: 'Muleba',
    region: 'Kagera',
    cooperative: 'AMCOS-003',
    cooperativeName: 'Muleba Growers Society',
    landSize: 2.2,
    registrationDate: '2024-02-14',
    status: 'active',
  },
];

// Helper functions
export function getFarmerById(farmerId) {
  return FARMERS.find(f => f.farmerId === farmerId);
}

export function getFarmersByCooperative(cooperativeId) {
  return FARMERS.filter(f => f.cooperative === cooperativeId);
}

export function searchFarmers(query) {
  const lowerQuery = query.toLowerCase();
  return FARMERS.filter(f => 
    f.farmerId.toLowerCase().includes(lowerQuery) ||
    f.name.toLowerCase().includes(lowerQuery) ||
    f.phone.includes(query)
  );
}
