import { Database, Wifi } from 'lucide-react';
import { motion } from 'motion/react';

export function NodeStatus() {
  const nodes = [
    { name: 'National (TCB)', status: 'synced', color: 'purple' },
    { name: 'Regional', status: 'synced', color: 'blue' },
    { name: 'AMCOS', status: 'synced', color: 'green' },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <Wifi className="h-4 w-4 text-gray-600" />
        <h4 className="text-sm font-semibold text-gray-900">Node Status</h4>
      </div>
      
      <div className="space-y-3">
        {nodes.map((node, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className={`h-4 w-4 text-${node.color}-600`} />
              <span className="text-sm text-gray-700">{node.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`h-2 w-2 bg-${node.color}-600 rounded-full`}
              ></motion.div>
              <span className="text-xs text-gray-600 capitalize">{node.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Last Sync:</span>
          <span className="text-gray-900 font-mono">2 mins ago</span>
        </div>
      </div>
    </div>
  );
}
