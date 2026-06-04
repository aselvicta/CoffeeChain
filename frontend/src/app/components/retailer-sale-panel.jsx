import { useState } from 'react';
import {
  IdCard,
  User,
  Phone,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserX,
} from 'lucide-react';
import { lookupMinistryFarmer, resolveRetailerBuyer } from '../api/client';
import { PanelOutlineButton, PanelPrimaryButton, QuickActionCard } from './ui/dashboard-ui';
import { getUserMessage } from '../utils/user-messages';

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

function VerifiedCustomerCard({
  title,
  subtitle,
  name,
  ministryId,
  phone,
  cooperativeName,
  discountPercent,
  discountEligible = true,
  primaryLabel,
  onPrimary,
  onDismiss,
  primaryLoading = false,
  dismissLabel = 'Search again',
  hidePrimary = false,
  discountEditable = false,
  onDiscountChange,
}) {
  const detailItems = [
    { label: 'Name', value: name },
    ministryId ? { label: 'Ministry ID', value: ministryId } : null,
    phone ? { label: 'Phone', value: phone } : null,
    cooperativeName ? { label: 'AMCOS', value: cooperativeName } : null,
  ].filter(Boolean);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-green-200 bg-green-50/40">
      <div className="flex flex-col gap-4 p-4 xl:flex-row xl:items-center">
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 ring-1 ring-green-200">
            <CheckCircle2 className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{title}</h4>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2 border-y border-green-100 py-3 xl:border-y-0 xl:border-x xl:px-5 xl:py-0">
          {detailItems.map((item) => (
            <div key={item.label} className="min-w-[7rem]">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">{item.label}</p>
              <p className="truncate text-sm font-medium text-gray-900">{item.value}</p>
            </div>
          ))}
          {discountEligible && (
            discountEditable ? (
              <div className="flex items-center gap-2">
                <label className="text-[11px] uppercase tracking-wide text-gray-500">
                  Discount
                </label>
                <div className="flex items-center rounded-lg border border-emerald-200 bg-white">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent ?? 0}
                    onChange={(e) =>
                      onDiscountChange?.(
                        Math.min(100, Math.max(0, Number(e.target.value) || 0))
                      )
                    }
                    className="w-14 rounded-lg border-0 bg-transparent px-2 py-1 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <span className="pr-2 text-sm font-medium text-emerald-800">% off</span>
                </div>
              </div>
            ) : (
              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                {discountPercent ?? 10}% off
              </span>
            )
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
          <button
            type="button"
            onClick={onDismiss}
            disabled={primaryLoading}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {dismissLabel}
          </button>
          {!hidePrimary && (
            <button
              type="button"
              onClick={onPrimary}
              disabled={primaryLoading}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              {primaryLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming…
                </span>
              ) : (
                primaryLabel
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function RetailerSalePanel({ onBuyerResolved, onClear }) {
  const [mode, setMode] = useState('ministry');
  const [ministryIdInput, setMinistryIdInput] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [buyer, setBuyer] = useState(emptyBuyer);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewDiscount, setPreviewDiscount] = useState(10);

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
      setPreviewDiscount(record.discount_percent ?? 10);
    } catch (err) {
      setError(getUserMessage(err, 'Could not verify Ministry ID. Please try again.'));
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
      applyResolved({
        ...data,
        discount_percent: previewDiscount,
        discount_eligible: true,
      });
      setPreview(null);
    } catch (err) {
      setError(getUserMessage(err, 'Could not confirm buyer. Please try again.'));
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
      setError(getUserMessage(err, 'Could not record walk-in buyer. Please try again.'));
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
        <form onSubmit={handleMinistryLookup} className="w-full space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Ministry farmer ID
          </label>
          <div className="flex w-full gap-2">
            <input
              type="text"
              value={ministryIdInput}
              onChange={(e) => setMinistryIdInput(e.target.value)}
              placeholder="e.g. MOA-KAG-031"
              className="min-w-0 flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
            <PanelPrimaryButton
              type="submit"
              icon={isLoading ? Loader2 : Search}
              disabled={isLoading || !ministryIdInput.trim()}
              className={`shrink-0 px-6 ${isLoading ? '[&_svg]:animate-spin' : ''}`}
            >
              Look up
            </PanelPrimaryButton>
          </div>
          {preview && (
            <VerifiedCustomerCard
              title="Farmer verified"
              subtitle="Match found in Ministry registry"
              name={preview.name}
              ministryId={preview.ministry_id}
              phone={preview.phone_number}
              cooperativeName={preview.cooperative_name}
              discountPercent={previewDiscount}
              discountEditable
              onDiscountChange={setPreviewDiscount}
              primaryLabel="Use for sale"
              onPrimary={handleConfirmMinistryBuyer}
              onDismiss={() => setPreview(null)}
              primaryLoading={isLoading}
            />
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
        <VerifiedCustomerCard
          title="Customer selected"
          subtitle={
            buyer.discountEligible
              ? 'Adjust discount below, then choose a batch'
              : 'Walk-in — standard price applies'
          }
          name={buyer.name}
          ministryId={buyer.ministryId.startsWith('WALKIN-') ? 'Walk-in customer' : buyer.ministryId}
          phone={buyer.phone}
          discountPercent={buyer.discountPercent}
          discountEligible={buyer.discountEligible}
          discountEditable={buyer.discountEligible}
          onDiscountChange={(value) => {
            const next = { ...buyer, discountPercent: value };
            setBuyer(next);
            onBuyerResolved?.(next);
          }}
          hidePrimary
          onDismiss={reset}
          dismissLabel="Clear customer"
        />
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
