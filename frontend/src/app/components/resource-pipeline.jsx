import { Package, Leaf, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export function ResourcePipeline({ inputsInjected, yieldsCollected, consensusReached = false }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-6">Resource-to-Yield Pipeline</h3>
      
      <div className="flex items-center justify-between gap-8">
        {/* Left: Inputs Injected (National Level) */}
        <div className="flex-1">
          <div className="bg-purple-50 rounded-lg p-6 border-2 border-purple-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-purple-600 p-2 rounded-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-purple-600 font-medium uppercase">National Level</p>
                <p className="text-sm font-semibold text-gray-900">Inputs Injected</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Fertilizer Bags</span>
                <span className="text-lg font-bold text-gray-900">{inputsInjected?.fertilizer || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Value</span>
                <span className="text-lg font-bold text-gray-900">${inputsInjected?.value || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Pipeline Connection */}
        <div className="flex flex-col items-center gap-2">
          {consensusReached ? (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-green-600"
              >
                <ArrowRight className="h-8 w-8" />
              </motion.div>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                <div className="h-2 w-2 bg-green-600 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-800">Consensus Reached</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <div className="h-0.5 w-8 bg-gray-300"></div>
                <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                <div className="h-0.5 w-8 bg-gray-300"></div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 rounded-full">
                <div className="h-2 w-2 bg-yellow-600 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-yellow-800">Awaiting Validation</span>
              </div>
            </>
          )}
        </div>

        {/* Right: Yields Collected (AMCOS Level) */}
        <div className="flex-1">
          <div className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-green-600 p-2 rounded-lg">
                <Leaf className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-green-600 font-medium uppercase">AMCOS Level</p>
                <p className="text-sm font-semibold text-gray-900">Yields Collected</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Coffee (kg)</span>
                <span className="text-lg font-bold text-gray-900">{yieldsCollected?.coffee || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Quality Grade</span>
                <span className="text-lg font-bold text-gray-900">{yieldsCollected?.grade || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
