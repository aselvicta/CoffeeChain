import { createContext, useContext, useState } from 'react';

// Bilingual translations for the entire system
export const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    systemGovernance: 'System Governance',
    masterLedger: 'Master Ledger',
    auditTrail: 'Audit Trail',
    globalReports: 'Global Reports',
    batchDispatch: 'Batch Dispatch',
    regionalMonitoring: 'Regional Monitoring',
    stockInventory: 'Stock Inventory',
    incomingBatches: 'Incoming Batches',
    amcosAllocation: 'AMCOS Allocation',
    validationCenter: 'Validation Center',
    kageraReports: 'Kagera Reports',
    farmerRegistry: 'Farmer Registry',
    fertilizerOut: 'Fertilizer Out',
    coffeeIn: 'Coffee In',
    history: 'History',
    
    // Common UI
    search: 'Search',
    notifications: 'Notifications',
    profile: 'Profile',
    settings: 'Settings',
    help: 'Help & Support',
    logout: 'Logout',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    export: 'Export',
    filter: 'Filter',
    
    // Trust & Security
    trustSeal: 'Trust Seal',
    recordSecured: 'Record Secured',
    verifiedBy: 'Verified by Kagera Office & TCB',
    dataIntegrity: 'Data Integrity',
    auditSecure: 'Audit Secure',
    syncStatus: 'Synchronization Status',
    connected: 'Connected',
    synced: 'Synced',
    offline: 'Offline',
    syncing: 'Syncing',
    
    // Levels
    nationalLevel: 'National',
    regionalLevel: 'Kagera Region',
    cooperativeLevel: 'AMCOS',
    
    // Fertilizer & Coffee
    fertilizerType: 'Fertilizer Type',
    totalBags: 'Total Bags',
    bagsDistributed: 'Bags Distributed',
    coffeeCollected: 'Coffee Collected',
    region: 'Region',
    kagera: 'Kagera',
    lockAndDispatch: 'Lock & Dispatch',
    confirmReceipt: 'Confirm Receipt & Authenticate',
    yieldExpectation: 'Yield Expectation',
    fertilizerDistributed: 'Fertilizer Distributed to Farmers',
    coffeeHarvested: 'Coffee Harvested',
    
    // Batch Management
    batchId: 'Batch ID',
    pendingBatch: 'Pending Batch',
    verificationModal: 'Verification Modal',
    truckDetails: 'Truck Details',
    bagCount: 'Bag Count',
    
    // Farmer Management
    farmerName: 'Farmer Name',
    farmerId: 'Farmer ID',
    bagsGiven: 'Bags Given',
    kgCollected: 'Kg Collected',
    selectFarmer: 'Select Farmer',
    enterBags: 'Enter Bags Given',
    enterKg: 'Enter Kg Coffee Collected',
    
    // Dashboard Stats
    totalRegions: 'Total Regions',
    totalCooperatives: 'Total Cooperatives',
    totalProduction: 'Total Production',
    activeFarmers: 'Active Farmers',
    
    // Alerts
    sensitiveData: 'Sensitive Data',
    privacyMode: 'Privacy Mode',
    discrepancyWarning: 'Discrepancy Warning',
    pendingValidation: 'Pending Validation',
    
    // Reconciliation
    reconciliationRule: 'Reconciliation Rule',
    expectedYield: 'Expected Yield',
    actualYield: 'Actual Yield',
    variance: 'Variance',
    
    // Actions
    approve: 'Approve',
    flag: 'Flag',
    resolve: 'Resolve',
    review: 'Review',
    commitToLedger: 'Commit to Ledger',
    dispatch: 'Dispatch',
    authenticate: 'Authenticate',
    
    // OTP Verification
    otpVerification: 'Farmer OTP Verification',
    enterOtp: 'Enter 4-Digit OTP Code',
    otpSentTo: 'OTP code sent to farmer',
    verifyAndDistribute: 'Verify & Distribute',
    resendOtp: 'Resend OTP',
    verifying: 'Verifying',
    verified: 'Verified',
    invalidOtp: 'Invalid OTP code. Please try again.',
    otpSuccess: 'OTP verified successfully!',
    distributionLocked: 'Distribution Secured',
  },
  sw: {
    // Navigation
    dashboard: 'Muhtasari',
    systemGovernance: 'Usimamizi wa Mfumo',
    masterLedger: 'Daftari Kuu',
    auditTrail: 'Ukaguzi',
    globalReports: 'Ripoti za Taifa',
    batchDispatch: 'Tuma Mbolea',
    regionalMonitoring: 'Fuatilia Mikoa',
    stockInventory: 'Ghala la Taifa',
    incomingBatches: 'Mapokezi',
    amcosAllocation: 'Gawio la AMCOS',
    validationCenter: 'Kituo cha Uhakiki',
    kageraReports: 'Ripoti za Mkoa',
    farmerRegistry: 'Daftari la Wakulima',
    fertilizerOut: 'Toa Mbolea',
    coffeeIn: 'Pokea Kahawa',
    history: 'Kumbukumbu',
    
    // Common UI
    search: 'Tafuta',
    notifications: 'Arifa',
    profile: 'Wasifu',
    settings: 'Mipangilio',
    help: 'Msaada',
    logout: 'Toka',
    save: 'Hifadhi',
    cancel: 'Ghairi',
    close: 'Funga',
    confirm: 'Thibitisha',
    delete: 'Futa',
    edit: 'Hariri',
    view: 'Angalia',
    export: 'Hamisha',
    filter: 'Chuja',
    
    // Trust & Security
    trustSeal: 'Muhuri wa Uaminifu',
    recordSecured: 'Kumbukumbu Imelindwa',
    verifiedBy: 'Imethibitishwa na Kagera na TCB',
    dataIntegrity: 'Uadilifu wa Data',
    auditSecure: 'Ukaguzi Salama',
    syncStatus: 'Hali ya Usawazishaji',
    connected: 'Imeunganishwa',
    synced: 'Imesawazishwa',
    offline: 'Nje ya Mtandao',
    syncing: 'Inasawazisha',
    
    // Levels
    nationalLevel: 'Kitaifa',
    regionalLevel: 'Mkoa wa Kagera',
    cooperativeLevel: 'AMCOS',
    
    // Fertilizer & Coffee
    fertilizerType: 'Aina ya Mbolea',
    totalBags: 'Jumla ya Mifuko',
    bagsDistributed: 'Mifuko Iliyogawanywa',
    coffeeCollected: 'Kahawa Iliyokusanywa',
    region: 'Mkoa',
    kagera: 'Kagera',
    lockAndDispatch: 'Funga na Tuma',
    confirmReceipt: 'Thibitisha Mapokezi na Hakiki',
    yieldExpectation: 'Tarajio la Mavuno',
    fertilizerDistributed: 'Mbolea Iliyogawanywa kwa Wakulima',
    coffeeHarvested: 'Mavuno ya Kahawa',
    
    // Batch Management
    batchId: 'Nambari ya Kundi',
    pendingBatch: 'Kundi Linalosubiri',
    verificationModal: 'Dirisha la Uthibitisho',
    truckDetails: 'Maelezo ya Lori',
    bagCount: 'Hesabu ya Mifuko',
    
    // Farmer Management
    farmerName: 'Jina la Mkulima',
    farmerId: 'Nambari ya Mkulima',
    bagsGiven: 'Mifuko Iliyotolewa',
    kgCollected: 'Kg Zilizokusanywa',
    selectFarmer: 'Chagua Mkulima',
    enterBags: 'Weka Mifuko Iliyotolewa',
    enterKg: 'Weka Kg za Kahawa Zilizokusanywa',
    
    // Dashboard Stats
    totalRegions: 'Jumla ya Mikoa',
    totalCooperatives: 'Jumla ya Ushirika',
    totalProduction: 'Jumla ya Uzalishaji',
    activeFarmers: 'Wakulima Hai',
    
    // Alerts
    sensitiveData: 'Data Nyeti',
    privacyMode: 'Hali ya Faragha',
    discrepancyWarning: 'Onyo la Kutofautiana',
    pendingValidation: 'Uthibitisho Unasubiri',
    
    // Reconciliation
    reconciliationRule: 'Kanuni ya Upatanisho',
    expectedYield: 'Mavuno Yanayotarajiwa',
    actualYield: 'Mavuno Halisi',
    variance: 'Tofauti',
    
    // Actions
    approve: 'Kubali',
    flag: 'Weka Alama',
    resolve: 'Tatua',
    review: 'Kagua',
    commitToLedger: 'Wasilisha kwa Daftari',
    dispatch: 'Tuma',
    authenticate: 'Hakiki',
    
    // OTP Verification
    otpVerification: 'Uthibitishaji wa OTP kwa Mkulima',
    enterOtp: 'Weka Nambari ya OTP ya Tarakimu 4',
    otpSentTo: 'Nambari ya OTP imetumwa kwa mkulima',
    verifyAndDistribute: 'Hakiki na Sambaza',
    resendOtp: 'Tuma Tena OTP',
    verifying: 'Inathibitisha',
    verified: 'Imethibitishwa',
    invalidOtp: 'Nambari ya OTP si sahihi. Jaribu tena.',
    otpSuccess: 'OTP imethibitishwa kikamilifu!',
    distributionLocked: 'Usambazaji Umelindwa',
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  
  const t = (key) => {
    return translations[language][key] || key;
  };
  
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'sw' : 'en');
  };
  
  return (
    <LanguageContext.Provider value={{ language, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}