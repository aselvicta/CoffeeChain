import { Shield, Info } from 'lucide-react';
import { useState } from 'react';

export function HashTrail({ hash, timestamp, blockNumber }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 rounded-b-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-4 w-4 text-purple-600" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Block Hash:</span>
            <code className="text-xs font-mono bg-purple-100 text-purple-800 px-2 py-1 rounded">
              {hash}
            </code>
          </div>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
        >
          <Info className="h-3 w-3" />
          {showDetails ? 'Hide' : 'Verify'}
        </button>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-3 gap-4 text-xs">
          <div>
            <p className="text-gray-600">Block Number</p>
            <p className="font-mono text-gray-900 mt-1">#{blockNumber || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-600">Timestamp</p>
            <p className="font-mono text-gray-900 mt-1">{timestamp || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-600">Verification Status</p>
            <p className="text-green-600 font-medium mt-1">✓ Verified</p>
          </div>
        </div>
      )}
    </div>
  );
}
