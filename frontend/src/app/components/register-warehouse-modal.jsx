import { useEffect, useState } from 'react';
import { Warehouse, X } from 'lucide-react';
import { getUserMessage } from '../utils/user-messages';

const REGION_OPTIONS = [
  'Kagera', 'Mbeya', 'Mwanza', 'Arusha', 'Kilimanjaro',
  'Morogoro', 'Dodoma', 'Geita', 'Iringa', 'Tabora',
  'Tanga', 'Songwe', 'Ruvuma', 'Dar es Salaam',
];

function buildInitialForm(warehouse) {
  return {
    name: warehouse?.name || '',
    section: warehouse?.section || '',
    address: warehouse?.address || '',
    region: warehouse?.region || '',
    capacityBags: warehouse?.capacity_bags ?? warehouse?.capacity ?? '',
    contactName: warehouse?.contact_name || warehouse?.contactName || '',
    contactPhone: warehouse?.contact_phone || warehouse?.contactPhone || '',
    notes: warehouse?.notes || '',
  };
}

export function RegisterWarehouseModal({ isOpen, warehouse, onClose, onSubmit }) {
  const [formData, setFormData] = useState(buildInitialForm(warehouse));
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(buildInitialForm(warehouse));
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen, warehouse]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = formData.name.trim();
    const trimmedCapacity = Number(formData.capacityBags);
    if (!trimmedName) { setErrorMessage('Warehouse name is required.'); return; }
    if (!trimmedCapacity || Number.isNaN(trimmedCapacity) || trimmedCapacity <= 0) {
      setErrorMessage('Capacity must be greater than zero.'); return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await onSubmit({
        name: trimmedName,
        section: formData.section.trim(),
        address: formData.address.trim(),
        region: formData.region.trim(),
        capacity_bags: trimmedCapacity,
        contact_name: formData.contactName.trim(),
        contact_phone: formData.contactPhone.trim(),
        notes: formData.notes.trim(),
      });
    } catch (error) {
      setErrorMessage(getUserMessage(error, 'Could not save warehouse. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const field = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white';
  const label = 'flex flex-col gap-1';
  const labelText = 'text-xs font-medium text-slate-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" style={{ maxHeight: 'calc(100vh - 3rem)' }}>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <Warehouse className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                {warehouse ? 'Edit Warehouse' : 'Register Warehouse'}
              </p>
              <h3 className="text-sm font-semibold text-slate-900">
                {warehouse ? warehouse.name : 'New warehouse location'}
              </h3>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {errorMessage && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Warehouse name — full width */}
              <label className={`${label} col-span-2`}>
                <span className={labelText}>Warehouse name <span className="text-rose-500">*</span></span>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={field} placeholder="Bukoba Central Store" />
              </label>

              {/* Section and Region side by side */}
              <label className={label}>
                <span className={labelText}>Section / zone</span>
                <input type="text" value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} className={field} placeholder="Block A" />
              </label>

              <label className={label}>
                <span className={labelText}>Region</span>
                <input type="text" list="warehouse-region-options" value={formData.region} onChange={(e) => setFormData({ ...formData, region: e.target.value })} className={field} placeholder="Kagera" />
                <datalist id="warehouse-region-options">
                  {REGION_OPTIONS.map((r) => <option key={r} value={r} />)}
                </datalist>
              </label>

              {/* Address — full width */}
              <label className={`${label} col-span-2`}>
                <span className={labelText}>Physical address</span>
                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className={field} placeholder="Bukoba Road, near the bus terminal" />
              </label>

              {/* Capacity, Contact name, Contact phone — three in a row on md */}
              <label className={label}>
                <span className={labelText}>Capacity (bags) <span className="text-rose-500">*</span></span>
                <input type="number" min="1" value={formData.capacityBags} onChange={(e) => setFormData({ ...formData, capacityBags: e.target.value })} className={field} placeholder="1000" />
              </label>

              <label className={label}>
                <span className={labelText}>Contact person</span>
                <input type="text" value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} className={field} placeholder="Amina Mwalimu" />
              </label>

              <label className={`${label} col-span-2`}>
                <span className={labelText}>Contact phone</span>
                <input type="tel" value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} className={field} placeholder="+255 754 000 001" />
              </label>

              {/* Notes — full width, smaller */}
              <label className={`${label} col-span-2`}>
                <span className={labelText}>Notes</span>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={field}
                  placeholder="Access instructions, security notes, operational details"
                />
              </label>
            </div>
          </div>

          {/* Footer — always visible, never scrolled away */}
          <div className="shrink-0 flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? 'Saving…' : warehouse ? 'Update Warehouse' : 'Register Warehouse'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}