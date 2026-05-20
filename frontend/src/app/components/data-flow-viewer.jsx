import { ArrowDown, Building2, MapPin, Landmark, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

const flowData = {
  cooperative: {
    name: 'Moshi Farmers Cooperative',
    district: 'Moshi District',
    pendingSubmissions: 3,
    validatedRecords: 127,
    status: 'active',
  },
  regional: {
    name: 'Northern Region Office',
    cooperatives: 12,
    pendingValidations: 8,
    flaggedIssues: 2,
    status: 'active',
  },
  national: {
    name: 'Tanzania Coffee Board',
    regions: 5,
    totalRecords: 4832,
    verifiedBlocks: 1245,
    status: 'active',
  },
};

export function DataFlowViewer({ userRole }) {
  const getLevelColor = (level) => {
    switch (level) {
      case 'cooperative':
        return 'bg-green-100 border-green-500 text-green-800';
      case 'regional':
        return 'bg-blue-100 border-blue-500 text-blue-800';
      case 'national':
        return 'bg-purple-100 border-purple-500 text-purple-800';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Data Flow Hierarchy</h2>
        <p className="text-gray-600 mt-1">View how data flows through the verification system</p>
      </div>

      <div className="bg-white rounded-lg shadow p-8">
        <div className="max-w-2xl mx-auto">
          {/* National Level */}
          <div className={`border-2 rounded-lg p-6 ${getLevelColor('national')}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white p-3 rounded-lg">
                  <Landmark className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">National Level (Node 1)</h3>
                    {getStatusIcon(flowData.national.status)}
                  </div>
                  <p className="text-sm mt-1">{flowData.national.name}</p>
                  <p className="text-xs mt-1 opacity-75">Root Authority - Read-only Verification</p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-white bg-opacity-50 rounded p-3">
                <p className="text-xs opacity-75">Regions</p>
                <p className="text-xl font-bold">{flowData.national.regions}</p>
              </div>
              <div className="bg-white bg-opacity-50 rounded p-3">
                <p className="text-xs opacity-75">Total Records</p>
                <p className="text-xl font-bold">{flowData.national.totalRecords}</p>
              </div>
              <div className="bg-white bg-opacity-50 rounded p-3">
                <p className="text-xs opacity-75">Verified Blocks</p>
                <p className="text-xl font-bold">{flowData.national.verifiedBlocks}</p>
              </div>
            </div>
            {userRole === 'national' && (
              <div className="mt-3 bg-white bg-opacity-50 rounded p-2 text-xs font-medium">
                ✓ Your current level - Full verification access
              </div>
            )}
          </div>

          {/* Arrow Down */}
          <div className="flex justify-center py-4">
            <ArrowDown className="h-8 w-8 text-gray-400" />
          </div>

          {/* Regional Level */}
          <div className={`border-2 rounded-lg p-6 ${getLevelColor('regional')}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white p-3 rounded-lg">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">Regional Level (Node 2)</h3>
                    {getStatusIcon(flowData.regional.status)}
                  </div>
                  <p className="text-sm mt-1">{flowData.regional.name}</p>
                  <p className="text-xs mt-1 opacity-75">Validates Data - Can Flag Issues</p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-white bg-opacity-50 rounded p-3">
                <p className="text-xs opacity-75">Cooperatives</p>
                <p className="text-xl font-bold">{flowData.regional.cooperatives}</p>
              </div>
              <div className="bg-white bg-opacity-50 rounded p-3">
                <p className="text-xs opacity-75">Pending</p>
                <p className="text-xl font-bold">{flowData.regional.pendingValidations}</p>
              </div>
              <div className="bg-white bg-opacity-50 rounded p-3">
                <p className="text-xs opacity-75">Flagged</p>
                <p className="text-xl font-bold text-yellow-700">{flowData.regional.flaggedIssues}</p>
              </div>
            </div>
            {userRole === 'regional' && (
              <div className="mt-3 bg-white bg-opacity-50 rounded p-2 text-xs font-medium">
                ✓ Your current level - Validation & oversight access
              </div>
            )}
          </div>

          {/* Arrow Down */}
          <div className="flex justify-center py-4">
            <ArrowDown className="h-8 w-8 text-gray-400" />
          </div>

          {/* Cooperative Level */}
          <div className={`border-2 rounded-lg p-6 ${getLevelColor('cooperative')}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white p-3 rounded-lg">
                  <MapPin className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">Cooperative Level (Node 3)</h3>
                    {getStatusIcon(flowData.cooperative.status)}
                  </div>
                  <p className="text-sm mt-1">{flowData.cooperative.name}</p>
                  <p className="text-xs mt-1 opacity-75">Data Entry - Records Creation</p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-white bg-opacity-50 rounded p-3">
                <p className="text-xs opacity-75">District</p>
                <p className="text-sm font-bold">{flowData.cooperative.district}</p>
              </div>
              <div className="bg-white bg-opacity-50 rounded p-3">
                <p className="text-xs opacity-75">Pending</p>
                <p className="text-xl font-bold">{flowData.cooperative.pendingSubmissions}</p>
              </div>
              <div className="bg-white bg-opacity-50 rounded p-3">
                <p className="text-xs opacity-75">Validated</p>
                <p className="text-xl font-bold">{flowData.cooperative.validatedRecords}</p>
              </div>
            </div>
            {userRole === 'cooperative' && (
              <div className="mt-3 bg-white bg-opacity-50 rounded p-2 text-xs font-medium">
                ✓ Your current level - Data entry access
              </div>
            )}
          </div>
        </div>

        {/* Flow Legend */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3">Data Flow Process:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-lg">1️⃣</span>
              <div>
                <p className="font-medium text-gray-900">Cooperative Entry</p>
                <p className="text-xs text-gray-600">Records created and timestamped with hash</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">2️⃣</span>
              <div>
                <p className="font-medium text-gray-900">Regional Validation</p>
                <p className="text-xs text-gray-600">Data verified, issues flagged if needed</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">3️⃣</span>
              <div>
                <p className="font-medium text-gray-900">National Verification</p>
                <p className="text-xs text-gray-600">Final verification, records become immutable</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}