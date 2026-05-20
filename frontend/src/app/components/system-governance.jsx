import { useState } from 'react';
import { Users, Plus, Edit, Trash2, Shield, UserCog, Building2, MapPin } from 'lucide-react';
import { useLanguage } from './language-context';
import { TrustSeal } from './trust-seal';

export function SystemGovernance() {
  const { t, language } = useLanguage();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    role: '',
    region: '',
    office: '',
    permissions: []
  });

  const [users, setUsers] = useState([
    {
      id: 'USR-001',
      username: 'national_admin',
      fullName: 'Dr. Joseph Mwangi',
      email: 'joseph.mwangi@tcb.go.tz',
      phone: '+255 712 345 678',
      role: 'national',
      office: 'TCB Headquarters',
      region: 'All Regions',
      isAdmin: true,
      status: 'active',
      lastLogin: '2026-02-23 09:15',
      createdDate: '2025-01-15'
    },
    {
      id: 'USR-002',
      username: 'national_user',
      fullName: 'Sarah Kimani',
      email: 'sarah.kimani@tcb.go.tz',
      phone: '+255 713 456 789',
      role: 'national',
      office: 'TCB Headquarters',
      region: 'All Regions',
      isAdmin: false,
      status: 'active',
      lastLogin: '2026-02-23 08:45',
      createdDate: '2025-02-10'
    },
    {
      id: 'USR-003',
      username: 'regional_officer',
      fullName: 'Emmanuel Mbwana',
      email: 'emmanuel.mbwana@kagera.go.tz',
      phone: '+255 714 567 890',
      role: 'regional',
      office: 'Kagera Regional Office',
      region: 'Kagera',
      isAdmin: false,
      status: 'active',
      lastLogin: '2026-02-23 10:20',
      createdDate: '2025-03-01'
    },
    {
      id: 'USR-004',
      username: 'regional_bukoba',
      fullName: 'Grace Makori',
      email: 'grace.makori@kagera.go.tz',
      phone: '+255 715 678 901',
      role: 'regional',
      office: 'Bukoba District Office',
      region: 'Kagera',
      isAdmin: false,
      status: 'active',
      lastLogin: '2026-02-22 16:30',
      createdDate: '2025-04-15'
    },
    {
      id: 'USR-005',
      username: 'coop_manager',
      fullName: 'Peter Ochieng',
      email: 'peter.ochieng@bukobaamcos.co.tz',
      phone: '+255 716 789 012',
      role: 'cooperative',
      office: 'Bukoba AMCOS',
      region: 'Kagera',
      isAdmin: false,
      status: 'active',
      lastLogin: '2026-02-23 07:00',
      createdDate: '2025-05-20'
    }
  ]);

  const roleOptions = [
    { value: 'national', label: language === 'en' ? 'National Level (TCB)' : 'Ngazi ya Taifa (TCB)', color: 'purple' },
    { value: 'regional', label: language === 'en' ? 'Regional Level' : 'Ngazi ya Mkoa', color: 'blue' },
    { value: 'cooperative', label: language === 'en' ? 'AMCOS Level' : 'Ngazi ya AMCOS', color: 'green' }
  ];

  const regionOptions = [
    'All Regions', 'Kagera', 'Kilimanjaro', 'Mbeya', 'Mwanza', 'Arusha', 'Ruvuma'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newUser = {
      id: `USR-${String(users.length + 1).padStart(3, '0')}`,
      username: formData.username,
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      office: formData.office,
      region: formData.region,
      isAdmin: false,
      status: 'active',
      lastLogin: language === 'en' ? 'Never' : 'Kamwe',
      createdDate: new Date().toISOString().split('T')[0]
    };
    
    setUsers([newUser, ...users]);
    setShowAddForm(false);
    setFormData({
      username: '',
      fullName: '',
      email: '',
      phone: '',
      role: '',
      region: '',
      office: '',
      permissions: []
    });
  };

  const handleDeleteUser = (userId) => {
    if (confirm(language === 'en' ? 'Are you sure you want to delete this user?' : 'Una uhakika unataka kufuta mtumiaji huyu?')) {
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const handleToggleStatus = (userId) => {
    setUsers(users.map(u => 
      u.id === userId 
        ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' }
        : u
    ));
  };

  const activeUsers = users.filter(u => u.status === 'active').length;
  const nationalUsers = users.filter(u => u.role === 'national').length;
  const regionalUsers = users.filter(u => u.role === 'regional').length;
  const cooperativeUsers = users.filter(u => u.role === 'cooperative').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {language === 'en' ? 'System Governance' : 'Utawala wa Mfumo'}
          </h2>
          <p className="text-gray-600 mt-1">
            {language === 'en' 
              ? 'Manage users and system access control' 
              : 'Simamia watumiaji na udhibiti wa ufikiaji wa mfumo'}
          </p>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {language === 'en' ? 'Add User' : 'Ongeza Mtumiaji'}
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {language === 'en' ? 'Total Users' : 'Jumla Watumiaji'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {language === 'en' ? 'Active Users' : 'Watumiaji Hai'}
              </p>
              <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
            </div>
            <Shield className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'By Role' : 'Kwa Majukumu'}
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-purple-600">● {language === 'en' ? 'National' : 'Taifa'}</span>
              <span className="font-medium">{nationalUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">● {language === 'en' ? 'Regional' : 'Mkoa'}</span>
              <span className="font-medium">{regionalUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">● AMCOS</span>
              <span className="font-medium">{cooperativeUsers}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {language === 'en' ? 'Admins' : 'Wasimamizi'}
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {users.filter(u => u.isAdmin).length}
              </p>
            </div>
            <UserCog className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Add User Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">
              {language === 'en' ? 'Add New User' : 'Ongeza Mtumiaji Mpya'}
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'en' ? 'Username' : 'Jina la Mtumiaji'}
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'en' ? 'Full Name' : 'Jina Kamili'}
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder={language === 'en' ? 'Full name' : 'Jina kamili'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'en' ? 'Email' : 'Barua Pepe'}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="email@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'en' ? 'Phone' : 'Simu'}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="+255 7XX XXX XXX"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'en' ? 'Role Level' : 'Ngazi ya Jukumu'}
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">
                    {language === 'en' ? 'Select role...' : 'Chagua jukumu...'}
                  </option>
                  {roleOptions.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'en' ? 'Region' : 'Mkoa'}
                </label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({...formData, region: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">
                    {language === 'en' ? 'Select region...' : 'Chagua mkoa...'}
                  </option>
                  {regionOptions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'en' ? 'Office/AMCOS' : 'Ofisi/AMCOS'}
                </label>
                <input
                  type="text"
                  value={formData.office}
                  onChange={(e) => setFormData({...formData, office: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder={language === 'en' ? 'e.g., TCB Headquarters, Bukoba AMCOS' : 'mfano, Makao Makuu TCB, Bukoba AMCOS'}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                {language === 'en' ? 'Create User' : 'Tengeneza Mtumiaji'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {language === 'en' ? 'System Users' : 'Watumiaji wa Mfumo'}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'User' : 'Mtumiaji'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Contact' : 'Mawasiliano'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Role' : 'Jukumu'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Office' : 'Ofisi'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Last Login' : 'Kuingia Mwisho'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Status' : 'Hali'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Actions' : 'Vitendo'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.id}</td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                      <p className="text-xs text-gray-500">@{user.username}</p>
                      {user.isAdmin && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>
                      <p>{user.email}</p>
                      <p className="text-xs text-gray-500">{user.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      user.role === 'national' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'regional' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.role === 'national' ? (language === 'en' ? 'National' : 'Taifa') :
                       user.role === 'regional' ? (language === 'en' ? 'Regional' : 'Mkoa') :
                       'AMCOS'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      {user.role === 'national' ? <Building2 className="w-4 h-4 text-purple-500" /> :
                       user.role === 'regional' ? <MapPin className="w-4 h-4 text-blue-500" /> :
                       <Building2 className="w-4 h-4 text-green-500" />}
                      <div>
                        <p>{user.office}</p>
                        <p className="text-xs text-gray-500">{user.region}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.lastLogin}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleStatus(user.id)}
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.status === 'active' 
                        ? (language === 'en' ? 'Active' : 'Hai')
                        : (language === 'en' ? 'Suspended' : 'Imesitishwa')
                      }
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
