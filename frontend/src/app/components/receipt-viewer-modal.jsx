import { useEffect, useState } from 'react';
import {
  Building2, Calendar, ExternalLink, FileText, Hash, Loader2,
  Package, ShieldCheck, User, X,
} from 'lucide-react';
import { fetchTransferReceipt } from '../api/client';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function DetailRow({ label, value, mono = false }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 py-2.5 border-b border-gray-100 last:border-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 shrink-0">{label}</dt>
      <dd className={`text-sm text-gray-900 text-left sm:text-right break-words ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
        <Icon className="h-4 w-4 text-green-700" />
        <h4 className="text-sm font-bold text-gray-900">{title}</h4>
      </div>
      <dl>{children}</dl>
    </div>
  );
}

export function ReceiptViewerModal({ open, transferId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!open || !transferId) {
      setData(null);
      setError('');
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    fetchTransferReceipt(transferId)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load receipt.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, transferId]);

  if (!open) return null;

  const receipt = data?.receipt || {};
  const batch = receipt.batch || {};
  const farmer = receipt.farmer || {};
  const cooperative = receipt.cooperative || {};
  const integrity = receipt.integrity || {};
  const storage = data?.storage || {};

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200">
        <div className="flex items-start justify-between gap-4 px-6 py-5 bg-white border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-green-100 p-2.5">
              <FileText className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Verification Receipt</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Transfer #{transferId}
                {batch.code ? ` · ${batch.code}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-green-600" />
              Loading receipt…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && data && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Storage</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {storage.is_remote ? 'Storacha (IPFS)' : 'Backend archive'}
                  </p>
                  {storage.cid && (
                    <p className="mt-1 font-mono text-xs text-gray-600 break-all">{storage.cid}</p>
                  )}
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Blockchain</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {integrity.network || receipt.network || 'Polygon Amoy'}
                  </p>
                  {integrity.explorer_url && (
                    <a
                      href={integrity.explorer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline"
                    >
                      View on Polygonscan
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              <Section title="Delivery" icon={Package}>
                <DetailRow label="Batch code" value={batch.code} mono />
                <DetailRow label="Fertilizer" value={batch.fertilizer_type} />
                <DetailRow label="Quantity" value={receipt.quantity_bags != null ? `${receipt.quantity_bags} bags` : null} />
                <DetailRow label="Transfer type" value={receipt.transfer_type} />
                <DetailRow label="Supplier" value={receipt.supplier} />
              </Section>

              {(farmer.name || farmer.ministry_id) && (
                <Section title="Farmer" icon={User}>
                  <DetailRow label="Name" value={farmer.name} />
                  <DetailRow label="Ministry ID" value={farmer.ministry_id} mono />
                  <DetailRow label="Phone" value={farmer.phone_number} />
                  <DetailRow label="District" value={farmer.district} />
                </Section>
              )}

              {cooperative.name && (
                <Section title="Cooperative / Branch" icon={Building2}>
                  <DetailRow label="Name" value={cooperative.name} />
                  <DetailRow label="District" value={cooperative.district} />
                  <DetailRow label="Region" value={cooperative.region} />
                </Section>
              )}

              <Section title="Verification" icon={Calendar}>
                <DetailRow label="Verified at" value={formatDate(receipt.verified_at)} />
                <DetailRow label="Verified by" value={receipt.verified_by} />
                <DetailRow label="OTP attempts" value={receipt.otp_attempts} />
              </Section>

              {(integrity.data_hash || integrity.tx_hash || receipt.data_hash) && (
                <Section title="Integrity anchors" icon={ShieldCheck}>
                  <DetailRow label="Data hash" value={integrity.data_hash || receipt.data_hash} mono />
                  <DetailRow label="Content CID" value={integrity.content_cid || receipt.content_cid} mono />
                  <DetailRow label="Transaction" value={integrity.tx_hash || receipt.tx_hash} mono />
                </Section>
              )}

              {receipt.note && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {receipt.note}
                </p>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
