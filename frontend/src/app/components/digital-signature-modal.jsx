import { useState, useEffect } from 'react';
import { Shield, CheckCircle } from 'lucide-react';
import { useLanguage } from './language-context';
import { motion, AnimatePresence } from 'motion/react';

export function DigitalSignatureModal({ isOpen, onClose, batchData, onSuccess }) {
  const { t, language } = useLanguage();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    { 
      key: 'validating',
      en: 'Validating batch data',
      sw: 'Kuthibitisha data ya kundi'
    },
    { 
      key: 'computing',
      en: 'Computing verification code',
      sw: 'Kukokotoa nambari ya uthibitisho'
    },
    { 
      key: 'broadcasting',
      en: 'Broadcasting to network',
      sw: 'Kutangaza kwenye mtandao'
    }
  ];

  useEffect(() => {
    if (isOpen) {
      setProgress(0);
      setCurrentStep(0);
      
      // Progress animation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      
      // Step progression
      const step1 = setTimeout(() => setCurrentStep(1), 800);
      const step2 = setTimeout(() => setCurrentStep(2), 1600);
      const step3 = setTimeout(() => setCurrentStep(3), 2400);
      
      // Complete and close
      const complete = setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }, 3000);
      
      return () => {
        clearInterval(progressInterval);
        clearTimeout(step1);
        clearTimeout(step2);
        clearTimeout(step3);
        clearTimeout(complete);
      };
    }
  }, [isOpen, onClose, onSuccess]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
        >
          {/* Rotating Shield Icon */}
          <div className="flex justify-center mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="bg-blue-100 p-6 rounded-full"
            >
              <Shield className="w-16 h-16 text-blue-600" />
            </motion.div>
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
            {language === 'en' 
              ? 'Generating Digital Signature' 
              : 'Kutengeneza Saini ya Kidijitali'}
          </h3>
          
          <p className="text-center text-gray-600 mb-6">
            {language === 'en' 
              ? 'Creating cryptographic proof...' 
              : 'Kuunda ushahidi wa kriptografia...'}
          </p>
          
          {/* Steps */}
          <div className="space-y-3 mb-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: currentStep > index ? 1 : 0.3, x: 0 }}
                transition={{ delay: index * 0.2 }}
                className="flex items-center gap-3"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  currentStep > index 
                    ? 'bg-green-500' 
                    : 'bg-gray-200'
                }`}>
                  {currentStep > index && (
                    <CheckCircle className="w-4 h-4 text-white" />
                  )}
                </div>
                <span className={`text-sm ${
                  currentStep > index 
                    ? 'text-gray-900 font-medium' 
                    : 'text-gray-400'
                }`}>
                  {language === 'en' ? step.en : step.sw}
                </span>
              </motion.div>
            ))}
          </div>
          
          {/* Progress Bar */}
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="bg-blue-600 h-full"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          
          <p className="text-center text-xs text-gray-500 mt-4">
            {progress}% {language === 'en' ? 'Complete' : 'Imekamilika'}
          </p>
          
          {/* Batch Info */}
          {batchData && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700 font-medium mb-2">
                {language === 'en' ? 'Verifying Batch' : 'Kuthibitisha Kundi'}:
              </p>
              <p className="text-sm font-mono text-blue-900">{batchData.id}</p>
              <p className="text-xs text-blue-600 mt-1">
                {batchData.totalBags} {language === 'en' ? 'bags' : 'mifuko'} • {batchData.fertilizerType}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
