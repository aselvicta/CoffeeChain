import { useEffect, useState } from 'react';
import {
  Store,
  Package,
  ShoppingCart,
  Search,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Phone,
  MapPin,
  Plus,
} from 'lucide-react';
import { fetchSupplierCatalog, createOrder, fetchFertilizerTypes } from '../api/client';
import { TANZANIA_REGIONS } from '../data/tanzania-locations';

const REGION_LIST = Object.keys(TANZANIA_REGIONS).sort();

function uid() { return `${Date.now()}-${Math.random()}`; }

function makeEmptyForm(supplier, defaultDelivery) {
  return {
    supplier,
    // unified list: [{ id, kind:'standard'|'custom', ftype, batch, unit_weight_kg, custom_specifications }]
    items: [],
    delivery_address: defaultDelivery || '',
    required_by_date: '',
    notes: '',
  };
}

const EMPTY_DRAFT = { ftype: '', isOther: false, otherName: '', specs: '' };

export function SupplierCatalogPanel({ onOrderPlaced, userProfile }) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [fertilizerTypes, setFertilizerTypes] = useState([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customDraft, setCustomDraft] = useState(EMPTY_DRAFT);

  // Default delivery from the branch profile
  const defaultDelivery =
    userProfile?.location ||
    userProfile?.village ||
    userProfile?.district ||
    userProfile?.region ||
    '';

  useEffect(() => {
    loadCatalog();
    fetchFertilizerTypes().then((data) => setFertilizerTypes(data?.types || []));
  }, []);

  async function loadCatalog(params = {}) {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSupplierCatalog(params);
      setCatalog(data?.results || []);
    } catch (err) {
      setError(err.message || 'Failed to load supplier catalog.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = catalog.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.supplier_name.toLowerCase().includes(q) ||
      s.region?.toLowerCase().includes(q) ||
      s.available_fertilizer_types?.some((t) =>
        t.fertilizer_type.toLowerCase().includes(q)
      );
    const matchRegion =
      !regionFilter ||
      s.region?.toLowerCase().includes(regionFilter.toLowerCase());
    return matchSearch && matchRegion;
  });

  function openOrderModal(supplier) {
    setForm(makeEmptyForm(supplier, defaultDelivery));
    setShowCustomForm(false);
    setCustomDraft(EMPTY_DRAFT);
    setFormError('');
    setSuccessMsg('');
    setShowOrderModal(true);
  }

  function addStockType(ftype) {
    if (!ftype) return;
    const newId = uid();
    setForm((f) => {
      if (f.items.some((i) => i.kind === 'standard' && i.ftype === ftype)) return f;
      return {
        ...f,
        items: [...f.items, { id: newId, kind: 'standard', ftype, batch: null, unit_weight_kg: 50, quantity_bags: '', custom_specifications: '' }],
      };
    });
    // auto-focus the bags input for this new item
    setTimeout(() => document.getElementById(`field-qty-${newId}`)?.focus(), 50);
  }

  function addCustomItem() {
    const ftype = customDraft.isOther ? customDraft.otherName.trim() : customDraft.ftype;
    if (!ftype) return;
    const newId = uid();
    setForm((f) => ({
      ...f,
      items: [...f.items, { id: newId, kind: 'custom', ftype, batch: null, unit_weight_kg: 50, quantity_bags: '', custom_specifications: customDraft.specs }],
    }));
    setCustomDraft(EMPTY_DRAFT);
    setShowCustomForm(false);
    setTimeout(() => document.getElementById(`field-qty-${newId}`)?.focus(), 50);
  }

  function removeItem(id) {
    setForm((f) => ({ ...f, items: f.items.filter((i) => i.id !== id) }));
  }

  function updateItem(id, patch) {
    setForm((f) => ({
      ...f,
      items: f.items.map((i) => i.id === id ? { ...i, ...patch } : i),
    }));
  }

  function focusField(id) {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.supplier) { setFormError('No supplier selected.'); return; }
    if (form.items.length === 0) {
      setFormError('Add at least one fertilizer type to your order.');
      return;
    }
    const customMissingSpecs = form.items.find((i) => i.kind === 'custom' && !i.custom_specifications.trim());
    if (customMissingSpecs) {
      setFormError(`Please add specifications for "${customMissingSpecs.ftype}".`);
      return;
    }
    const missingQty = form.items.find((i) => !i.quantity_bags || Number(i.quantity_bags) < 1);
    if (missingQty) {
      setFormError(`Please enter the number of bags for "${missingQty.ftype}".`);
      focusField(`field-qty-${missingQty.id}`);
      return;
    }
    if (!form.delivery_address.trim()) {
      setFormError('Please enter a delivery address.');
      focusField('field-delivery');
      return;
    }
    if (!form.required_by_date) {
      setFormError('Please select a required-by date.');
      focusField('field-date');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await Promise.all(
        form.items.map((item) =>
          createOrder({
            supplier: form.supplier.supplier_id,
            order_type: item.kind === 'standard' ? 'STANDARD' : 'CUSTOM',
            fertilizer_type: item.ftype,
            quantity_bags: Number(item.quantity_bags),
            unit_weight_kg: Number(item.unit_weight_kg) || 50,
            preferred_batch: item.kind === 'standard' ? (item.batch?.id || null) : null,
            custom_specifications: item.kind === 'custom' ? item.custom_specifications : '',
            delivery_address: form.delivery_address,
            required_by_date: form.required_by_date || null,
            notes: form.notes,
          })
        )
      );
      const n = form.items.length;
      setSuccessMsg(`${n} order${n > 1 ? 's' : ''} placed with ${form.supplier.supplier_name}.`);
      setForm(null);
      onOrderPlaced?.();
      setTimeout(() => { setShowOrderModal(false); setSuccessMsg(''); }, 2200);
    } catch (err) {
      setFormError(err.message || 'Failed to place order.');
    } finally {
      setSubmitting(false);
    }
  }

  // Group available batches by fertilizer_type for the order modal
  const batchesByType = form?.supplier
    ? (form.supplier.available_batches || []).reduce((acc, b) => {
        if (!acc[b.fertilizer_type]) acc[b.fertilizer_type] = [];
        acc[b.fertilizer_type].push(b);
        return acc;
      }, {})
    : {};

  const allFertTypes = form?.supplier
    ? (form.supplier.available_fertilizer_types?.map((t) => t.fertilizer_type) || [])
    : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Supplier Catalog</h2>
        <p className="text-sm text-gray-500">
          Browse registered suppliers and place fertilizer orders.
        </p>
      </div>

      {/* Search & Region filter */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search supplier or fertilizer type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 sm:w-52"
        >
          <option value="">All regions</option>
          {REGION_LIST.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Status */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading catalog…
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-400">
          No suppliers found. Try adjusting your search or region filter.
        </div>
      )}

      {/* Supplier cards */}
      <div className="space-y-3">
        {filtered.map((supplier) => (
          <div
            key={supplier.supplier_id}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
                <Store className="h-5 w-5 text-green-700" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{supplier.supplier_name}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-0.5">
                  {supplier.region && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {supplier.region}
                    </span>
                  )}
                  {supplier.contact_phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {supplier.contact_phone}
                    </span>
                  )}
                  {supplier.available_fertilizer_types?.length > 0 && (
                    <span className="text-green-600 font-medium">
                      {supplier.available_fertilizer_types.length} type
                      {supplier.available_fertilizer_types.length !== 1 ? 's' : ''} in stock
                    </span>
                  )}
                  {supplier.available_fertilizer_types?.length === 0 && (
                    <span className="text-xs font-medium text-amber-600">No certified stock (custom orders only)</span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openOrderModal(supplier)}
              className="ml-4 shrink-0 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <ShoppingCart className="h-4 w-4" />
              Order
            </button>
          </div>
        ))}
      </div>

      {/* ── Order Modal ── */}
      {showOrderModal && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <div>
                <h3 className="font-semibold text-gray-900">Order from {form.supplier.supplier_name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {form.supplier.region && `${form.supplier.region} · `}
                  {form.supplier.available_fertilizer_types?.length
                    ? `${form.supplier.available_fertilizer_types.length} type(s) in stock`
                    : 'Custom orders available'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="rounded-lg p-1.5 hover:bg-gray-100"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="px-6 py-5">
              {successMsg && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  {successMsg}
                </div>
              )}
              {formError && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              {/* Two-column layout */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

              {/* LEFT COLUMN — unified item list */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Fertilizer Types *
                  </label>
                  <p className="mt-0.5 text-xs text-gray-400">Add types, then enter bag count for each.</p>
                </div>

                {/* ── Stock type picker ── */}
                {allFertTypes.length > 0 && allFertTypes.some((ft) => !form.items.find((i) => i.kind === 'standard' && i.ftype === ft)) && (
                  <select
                    value=""
                    onChange={(e) => { addStockType(e.target.value); }}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    <option value="">+ Add from available stock…</option>
                    {allFertTypes
                      .filter((ft) => !form.items.find((i) => i.kind === 'standard' && i.ftype === ft))
                      .map((ft) => {
                        const batches = batchesByType[ft] || [];
                        const totalBags = batches.reduce((s, b) => s + b.available_bags, 0);
                        return <option key={ft} value={ft}>{ft} · {totalBags} bags</option>;
                      })}
                  </select>
                )}

                {/* ── Custom type mini-form ── */}
                {showCustomForm ? (
                  <div className="rounded-xl border border-gray-300 bg-white p-3 space-y-2 shadow-sm">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Custom Request</p>
                    <select
                      value={customDraft.isOther ? 'Other' : customDraft.ftype}
                      onChange={(e) => {
                        if (e.target.value === 'Other') setCustomDraft((d) => ({ ...d, isOther: true, ftype: '' }));
                        else setCustomDraft((d) => ({ ...d, isOther: false, ftype: e.target.value }));
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                      <option value="">Select type…</option>
                      {fertilizerTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                      <option value="Other">Other — type below</option>
                    </select>
                    {customDraft.isOther && (
                      <input
                        type="text"
                        value={customDraft.otherName}
                        onChange={(e) => setCustomDraft((d) => ({ ...d, otherName: e.target.value }))}
                        placeholder="e.g. Sulphate of Potash, Lime…"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        autoFocus
                      />
                    )}
                    <textarea
                      value={customDraft.specs}
                      onChange={(e) => setCustomDraft((d) => ({ ...d, specs: e.target.value }))}
                      rows={2}
                      placeholder="Describe grade, packaging, additives, certification…"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={addCustomItem}
                        disabled={!(customDraft.isOther ? customDraft.otherName.trim() : customDraft.ftype)}
                        className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-30 transition-colors">
                        Add
                      </button>
                      <button type="button" onClick={() => { setShowCustomForm(false); setCustomDraft(EMPTY_DRAFT); }}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowCustomForm(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                    <Plus className="h-4 w-4" />
                    Add custom request
                  </button>
                )}

                {/* ── Unified item chips ── */}
                {form.items.length > 0 && (
                  <div className="space-y-2">
                    {form.items.map((item) => {
                      const batches = item.kind === 'standard' ? (batchesByType[item.ftype] || []) : [];
                      const totalBags = batches.reduce((s, b) => s + b.available_bags, 0);
                      return (
                        <div key={item.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                          <div className="flex items-center gap-3 px-3 py-2">
                            <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.kind === 'standard' ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                              {item.ftype}
                              {item.kind === 'standard' && <span className="ml-1.5 text-xs font-normal text-gray-400">{totalBags} avail.</span>}
                              {item.kind === 'custom' && <span className="ml-1.5 text-xs font-normal text-gray-400">custom</span>}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                id={`field-qty-${item.id}`}
                                type="number"
                                min="1"
                                value={item.quantity_bags}
                                onChange={(e) => updateItem(item.id, { quantity_bags: e.target.value })}
                                placeholder="0"
                                className={`w-20 rounded-lg border px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-400 ${
                                  !item.quantity_bags || Number(item.quantity_bags) < 1
                                    ? 'border-amber-300 bg-amber-50'
                                    : 'border-gray-200 bg-white'
                                }`}
                              />
                              <span className="text-xs text-gray-400">bags</span>
                            </div>
                            <button type="button" onClick={() => removeItem(item.id)}
                              className="rounded-full p-1 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          {item.kind === 'standard' && batches.length > 0 && (
                            <div className="border-t border-gray-100 bg-gray-50 px-3 py-2">
                              <label className="mb-1 block text-xs text-gray-400">Preferred batch (optional)</label>
                              <select
                                value={item.batch?.id || ''}
                                onChange={(e) => {
                                  const b = batches.find((b) => String(b.id) === e.target.value);
                                  updateItem(item.id, { batch: b || null, unit_weight_kg: b ? Number(b.unit_weight_kg) : 50 });
                                }}
                                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                              >
                                <option value="">Any available batch</option>
                                {batches.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.batch_code} · {b.available_bags} bags · {b.unit_weight_kg} kg/bag{b.expiry_date ? ` · exp ${b.expiry_date}` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          {item.kind === 'custom' && (
                            <div className="border-t border-gray-100 bg-gray-50 px-3 py-2">
                              <label className="mb-1 block text-xs text-gray-400">Specifications *</label>
                              <textarea
                                value={item.custom_specifications}
                                onChange={(e) => updateItem(item.id, { custom_specifications: e.target.value })}
                                rows={2}
                                placeholder="Grade, packaging, additives…"
                                className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>{/* end left column */}

              {/* RIGHT COLUMN — order details */}
              <div className="space-y-4">

              {/* Total bags summary */}
              {form.items.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">Total bags ordered</p>
                  <p className="text-xl font-bold text-gray-900">
                    {form.items.reduce((s, i) => s + (Number(i.quantity_bags) || 0), 0).toLocaleString()}
                    <span className="ml-1 text-sm font-normal text-gray-400">bags across {form.items.length} type{form.items.length !== 1 ? 's' : ''}</span>
                  </p>
                </div>
              )}

              {/* Delivery address */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Delivery Address *
                </label>
                <input
                  id="field-delivery"
                  type="text"
                  value={form.delivery_address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, delivery_address: e.target.value }))
                  }
                  placeholder="e.g. Moshi, Kilimanjaro"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* Required by */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Required By Date *
                </label>
                <input
                  id="field-date"
                  type="date"
                  value={form.required_by_date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, required_by_date: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* Notes — only optional field */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Additional Notes{' '}
                  <span className="normal-case font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Anything else the supplier should know…"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* Per-type breakdown */}
              {form.items.some((i) => Number(i.quantity_bags) > 0) && (
                <div className="space-y-1">
                  {form.items.filter((i) => Number(i.quantity_bags) > 0).map((i) => (
                    <div key={i.id} className="flex justify-between text-xs text-gray-500">
                      <span>{i.ftype}</span>
                      <span className="font-medium text-gray-700">{Number(i.quantity_bags).toLocaleString()} bags</span>
                    </div>
                  ))}
                </div>
              )}

              </div>{/* end right column */}
              </div>{/* end two-column grid */}

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-2">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    form.items.length === 0 ||
                    form.items.some((i) => !i.quantity_bags || Number(i.quantity_bags) < 1) ||
                    form.items.some((i) => i.kind === 'custom' && !i.custom_specifications.trim()) ||
                    !form.delivery_address.trim() ||
                    !form.required_by_date
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Place Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
