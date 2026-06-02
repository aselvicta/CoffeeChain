import { useState } from 'react';
import {
  IdCard,
  User,
  Phone,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Percent,
  UserX,
} from 'lucide-react';
import { lookupMinistryFarmer, resolveRetailerBuyer } from '../api/client';
import { PanelOutlineButton, PanelPrimaryButton, QuickActionCard } from './ui/dashboard-ui';

const emptyBuyer = {
  farmerId: null,
  name: '',
  phone: '',
  ministryId: '',
  buyerType: '',
  ministryVerified: false,
  discountPercent: 0,
  discountEligible: false,
  message: '',
};

export function RetailerSalePanel({ onBuyerResolved, onClear }) {
  const [mode, setMode] = useState('ministry');
  const [ministryIdInput, setMinistryIdInput] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [buyer, setBuyer] = useState(emptyBuyer);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const reset = () => {
    setBuyer(emptyBuyer);
    setPreview(null);
    setError('');
    setMinistryIdInput('');
    setWalkInName('');
    setWalkInPhone('');
    onClear?.();
  };

  const applyResolved = (data) => {
    const farmer = data.farmer || {};
    const resolved = {
      farmerId: data.farmer_id || farmer.id,
      name: farmer.name || '',
      phone: farmer.phone_number || '',
      ministryId: farmer.ministry_id || '',
      buyerType: data.buyer_type || '',
      ministryVerified: Boolean(data.ministry_verified),
      discountPercent: Number(data.discount_percent) || 0,
      discountEligible: Boolean(data.discount_eligible),
      message: data.message || '',
    };
    setBuyer(resolved);
    onBuyerResolved?.(resolved);
    return resolved;
  };

  const handleMinistryLookup = async (event) => {
    event?.preventDefault?.();
    const id = ministryIdInput.trim();
    if (!id) return;
    setIsLoading(true);
    setError('');
    setPreview(null);
    try {
      const record = await lookupMinistryFarmer(id);
      setPreview({
        ...record,
        discount_eligible: true,
        discount_percent: record.discount_percent ?? 10,
      });
    } catch (err) {
      setError(err.message || 'Ministry lookup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmMinistryBuyer = async () => {
    if (!preview?.ministry_id) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await resolveRetailerBuyer({ ministry_id: preview.ministry_id });
      applyResolved(data);
      setPreview(null);
    } catch (err) {
      setError(err.message || 'Could not confirm buyer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalkIn = async (event) => {
    event?.preventDefault?.();
    if (!walkInName.trim() || !walkInPhone.trim()) {
      setError('Name and phone are required for walk-in customers.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const data = await resolveRetailerBuyer({
        name: walkInName.trim(),
        phone_number: walkInPhone.trim(),
      });
      applyResolved(data);
    } catch (err) {
      setError(err.message || 'Walk-in buyer could not be recorded');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Customer at counter</h3>
        <p className="text-sm text-gray-600 mt-1">
          Retailers sell fertilizer at point of sale. Farmers with a{' '}
          <strong>Ministry ID</strong> receive the subsidy discount; walk-in customers
          can still purchase at full price.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <QuickActionCard
          icon={IdCard}
          tone="green"
          title="Ministry ID"
          description="Subsidy discount for registered farmers"
          onClick={() => {
            setMode('ministry');
            reset();
          }}
          className={mode === 'ministry' ? 'ring-2 ring-green-500 ring-offset-1' : 'opacity-90'}
        />
        <QuickActionCard
          icon={UserX}
          tone="slate"
          title="Walk-in (no ID)"
          description="Full price sale without Ministry lookup"
          onClick={() => {
            setMode('walkin');
            reset();
          }}
          className={mode === 'walkin' ? 'ring-2 ring-gray-400 ring-offset-1' : 'opacity-90'}
        />
      </div>

      {mode === 'ministry' && (
        <form onSubmit={handleMinistryLookup} className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Ministry farmer ID
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={ministryIdInput}
              onChange={(e) => setMinistryIdInput(e.target.value)}
              placeholder="e.g. MOA-KAG-031"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
            <PanelOutlineButton
              type="submit"
              icon={isLoading ? Loader2 : Search}
              disabled={isLoading || !ministryIdInput.trim()}
              className={isLoading ? '[&_svg]:animate-spin' : ''}
            >
              Look up
            </PanelOutlineButton>
          </div>
          {preview && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">{preview.name}</p>
                  <p className="text-sm text-green-800">{preview.ministry_id}</p>
                  <p className="text-sm text-green-700">{preview.phone_number}</p>
                  {preview.cooperative_name && (
                    <p className="text-xs text-green-700 mt-1">
                      AMCOS on record: {preview.cooperative_name}
                    </p>
                  )}
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
                <Percent className="h-4 w-4" />
                {preview.discount_percent ?? 10}% subsidy discount eligible
              </div>
              <PanelPrimaryButton
                icon={User}
                onClick={handleConfirmMinistryBuyer}
                disabled={isLoading}
                className="w-full justify-center"
              >
                Use this customer for sale
              </PanelPrimaryButton>
            </div>
          )}
        </form>
      )}

      {mode === 'walkin' && (
        <form onSubmit={handleWalkIn} className="space-y-3">
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Walk-in customers are not in the Ministry registry. Sale proceeds at
            standard price with no subsidy discount.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="inline h-4 w-4 mr-1" />
                Customer name
              </label>
              <input
                type="text"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="inline h-4 w-4 mr-1" />
                Phone number
              </label>
              <input
                type="tel"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                placeholder="07XXXXXXXX"
              />
            </div>
          </div>
          <PanelOutlineButton
            type="submit"
            icon={User}
            tone="slate"
            disabled={isLoading}
          >
            {isLoading ? 'Saving…' : 'Record walk-in customer'}
          </PanelOutlineButton>
        </form>
      )}

      {buyer.farmerId && (
        <div
          className={`rounded-lg border p-4 ${
            buyer.discountEligible
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-gray-200 bg-gray-50'
          }`}
        >
          <p className="text-sm font-semibold text-gray-900">Selected for this sale</p>
          <p className="text-gray-800">{buyer.name}</p>
          <p className="text-sm text-gray-600">
            {buyer.ministryId.startsWith('WALKIN-') ? 'Walk-in' : buyer.ministryId} •{' '}
            {buyer.phone}
          </p>
          {buyer.discountEligible ? (
            <p className="text-sm text-emerald-700 mt-2 font-medium">
              {buyer.discountPercent}% discount will apply
            </p>
          ) : (
            <p className="text-sm text-gray-600 mt-2">No subsidy discount (walk-in)</p>
          )}
          <button
            type="button"
            onClick={reset}
            className="mt-3 text-sm text-red-600 hover:text-red-800"
          >
            Clear customer
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
