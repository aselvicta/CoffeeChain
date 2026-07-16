import { Check, Circle } from 'lucide-react';
import { getPasswordChecks, PASSWORD_REQUIREMENTS } from '../utils/form-validation';

/** Live checklist for password strength rules. */
export function PasswordRequirements({ password, className = '' }) {
  const checks = getPasswordChecks(password);
  if (!password) return null;

  return (
    <ul className={`mt-1.5 space-y-0.5 ${className}`}>
      {PASSWORD_REQUIREMENTS.map(({ key, label }) => {
        const ok = checks[key];
        return (
          <li
            key={key}
            className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}
          >
            {ok ? <Check className="h-3 w-3 shrink-0" /> : <Circle className="h-3 w-3 shrink-0" />}
            {label}
          </li>
        );
      })}
    </ul>
  );
}
