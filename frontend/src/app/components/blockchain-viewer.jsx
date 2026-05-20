import { useState } from 'react';
import { Search, Link, Lock, Clock, CheckCircle, Copy, Check } from 'lucide-react';

const mockBlocks = [
  {
    blockNumber: 1245,
    hash: '0x7a3f9c2e1b4d8f6a2c5e9d3b7f1a4c8e',
    previousHash: '0x6b2e8d1c0a3f7e5d9c4b8a6f2e1d9c7b',
    timestamp: '2025-01-15 14:32:15',
    transactions: 3,
    validator: 'Cooperative Node 1',
    submittedBy: 'Kahawa Farmers Cooperative',
    level: 'cooperative',
    dataType: 'Production Record',
    status: 'confirmed',
  },
  {
    blockNumber: 1244,
    hash: '0x6b2e8d1c0a3f7e5d9c4b8a6f2e1d9c7b',
    previousHash: '0x5c1d7e0b9a2f6d4c8b3a7f1e0d8c6a',
    timestamp: '2025-01-15 13:18:42',
    transactions: 5,
    validator: 'Regional Node - Central',
    submittedBy: 'Central Region Office',
    level: 'regional',
    dataType: 'Payment Validation',
    status: 'confirmed',
  },
  {
    blockNumber: 1243,
    hash: '0x5c1d7e0b9a2f6d4c8b3a7f1e0d8c6a',
    previousHash: '0x4d0c6f9a8b1e5c3d7a2f0e9d7b5a',
    timestamp: '2025-01-15 11:45:28',
    transactions: 2,
    validator: 'Cooperative Node 2',
    submittedBy: 'Kiambu Coffee Cooperative',
    level: 'cooperative',
    dataType: 'Input Distribution',
    status: 'confirmed',
  },
  {
    blockNumber: 1242,
    hash: '0x4d0c6f9a8b1e5c3d7a2f0e9d7b5a',
    previousHash: '0x3e9b5f8a7c0d4b2e6a1f9e8c6a4b',
    timestamp: '2025-01-15 09:22:11',
    transactions: 4,
    validator: 'National Node',
    submittedBy: 'Kenya Coffee Board',
    level: 'national',
    dataType: 'National Verification',
    status: 'confirmed',
  },
  {
    blockNumber: 1241,
    hash: '0x3e9b5f8a7c0d4b2e6a1f9e8c6a4b',
    previousHash: '0x2f8a4e7b6c9d3a1e5b0f8d7c5a3b',
    timestamp: '2025-01-14 16:55:39',
    transactions: 6,
    validator: 'Regional Node - Central',
    submittedBy: 'Central Region Office',
    level: 'regional',
    dataType: 'Regional Validation',
    status: 'confirmed',
  },
];

const mockTransactions = [
  {
    txHash: '0xa7b3f9c2e1d4',
    block: 1245,
    type: 'Production',
    from: 'Farmer-F2401',
    data: 'Recorded 120kg AA grade coffee',
    timestamp: '2025-01-15 14:32:10',
  },
  {
    txHash: '0xb8c4e1a3f2d5',
    block: 1245,
    type: 'Production',
    from: 'Farmer-F2402',
    data: 'Recorded 95kg AB grade coffee',
    timestamp: '2025-01-15 14:32:12',
  },
  {
    txHash: '0xc9d5f2b4e3a6',
    block: 1245,
    type: 'Quality Check',
    from: 'QC-Officer-01',
    data: 'Verified moisture content 10.5%',
    timestamp: '2025-01-15 14:32:14',
  },
];

export function BlockchainViewer() {
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedHash, setCopiedHash] = useState(null);

  const copyToClipboard = (text) => {
    // Fallback method for copying text
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopiedHash(text);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch (err) {
      console.log('Copy failed');
    }
    
    document.body.removeChild(textArea);
  };

  const getLevelBadge = (level) => {
    switch (level) {
      case 'national':
        return { color: 'bg-purple-100 text-purple-800', text: 'National' };
      case 'regional':
        return { color: 'bg-blue-100 text-blue-800', text: 'Regional' };
      case 'cooperative':
        return { color: 'bg-green-100 text-green-800', text: 'Cooperative' };
      default:
        return { color: 'bg-gray-100 text-gray-800', text: 'Unknown' };
    }
  };

  const filteredBlocks = mockBlocks.filter(
    (block) =>
      block.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      block.blockNumber.toString().includes(searchTerm) ||
      block.dataType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Blockchain Explorer</h2>
        <p className="text-gray-600 mt-1">View and verify blockchain transactions and blocks</p>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Link className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Blocks</p>
              <p className="text-2xl font-bold text-gray-900">1,245</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">4,832</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <Lock className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Nodes</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Block Time</p>
              <p className="text-2xl font-bold text-gray-900">2.4s</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by block number, hash, or data type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Blocks List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Recent Blocks</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {filteredBlocks.map((block) => (
              <div
                key={block.blockNumber}
                onClick={() => setSelectedBlock(block)}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center justify-center h-8 w-8 bg-purple-100 text-purple-700 rounded-full font-semibold">
                        {block.blockNumber}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Block #{block.blockNumber}</p>
                        <p className="text-xs text-gray-500">{block.timestamp}</p>
                      </div>
                    </div>
                    <div className="ml-11 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Hash:</span>
                        <span className="text-xs font-mono text-gray-700">{block.hash.substring(0, 20)}...</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(block.hash);
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {copiedHash === block.hash ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-gray-500" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-600">
                          {block.transactions} transactions • {block.dataType}
                        </p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLevelBadge(block.level).color}`}>
                          {getLevelBadge(block.level).text}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Validator: {block.validator}</p>
                      <p className="text-xs text-gray-500">Submitted by: {block.submittedBy}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {block.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Block Details */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Block Details</h3>
          </div>
          {selectedBlock ? (
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Block Information</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Block Number</p>
                    <p className="text-sm font-medium text-gray-900">{selectedBlock.blockNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Timestamp</p>
                    <p className="text-sm font-medium text-gray-900">{selectedBlock.timestamp}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Data Type</p>
                    <p className="text-sm font-medium text-gray-900">{selectedBlock.dataType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Validator Node</p>
                    <p className="text-sm font-medium text-gray-900">{selectedBlock.validator}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Transactions</p>
                    <p className="text-sm font-medium text-gray-900">{selectedBlock.transactions}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Hash Information</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Block Hash</p>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded font-mono text-xs break-all">
                      {selectedBlock.hash}
                      <button
                        onClick={() => copyToClipboard(selectedBlock.hash)}
                        className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
                      >
                        {copiedHash === selectedBlock.hash ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Previous Hash</p>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded font-mono text-xs break-all">
                      {selectedBlock.previousHash}
                      <button
                        onClick={() => copyToClipboard(selectedBlock.previousHash)}
                        className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
                      >
                        {copiedHash === selectedBlock.previousHash ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Transactions in Block</h4>
                <div className="space-y-2">
                  {mockTransactions.map((tx, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-xs font-medium text-gray-900">{tx.type}</span>
                        <span className="text-xs text-gray-500">{tx.timestamp}</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{tx.data}</p>
                      <p className="text-xs text-gray-500">From: {tx.from}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Link className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>Select a block to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}