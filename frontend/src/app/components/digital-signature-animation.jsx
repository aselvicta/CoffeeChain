import { motion } from 'motion/react';
import { CheckCircle, Shield } from 'lucide-react';
import { useState } from 'react';

export function DigitalSignatureAnimation({ onComplete }) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSign = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      if (onComplete) onComplete();
    }, 3000);
  };

  if (!isAnimating) {
    return (
      <button
        onClick={handleSign}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
      >
        <Shield className="h-5 w-5" />
        Verify Batch & Sign Block
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-lg p-8 max-w-md w-full mx-4"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block mb-4"
          >
            <Shield className="h-16 w-16 text-blue-600" />
          </motion.div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Generating Digital Signature
          </h3>
          
          <p className="text-sm text-gray-600 mb-6">
            Creating cryptographic proof and committing to blockchain...
          </p>

          <div className="space-y-3 mb-6">
            {['Validating batch data', 'Computing hash', 'Broadcasting to network'].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.8 }}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                <CheckCircle className="h-4 w-4 text-green-600" />
                {step}
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.5 }}
            className="h-2 bg-blue-600 rounded-full"
          ></motion.div>
        </div>
      </motion.div>
    </div>
  );
}
