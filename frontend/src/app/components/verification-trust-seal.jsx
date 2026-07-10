import { useState } from 'react';
import { ExternalLink, FileText, ShieldCheck, X } from 'lucide-react';
import { ReceiptViewerModal } from './receipt-viewer-modal';

function truncate(value, head = 10, tail = 6) {
  if (!value) return '';
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function VerificationTrustSeal({ verification, onDismiss }) {
  const [receiptOpen, setReceiptOpen] = useState(false);

  if (!verification) return null;

  const {
    transfer_id: transferId,
    cid,
    tx_hash: txHash,
    explorer_url: explorerUrl,
    storage_is_remote: storageIsRemote,
    storacha_ok: storachaOk,
    blockchain_ok: blockchainOk,
    storacha_error: storachaError,
    blockchain_error: blockchainError,
  } = verification;

  const isLocalCid = Boolean(cid && String(cid).startsWith('local-'));
  const isRemote = storageIsRemote && !isLocalCid;
  const storageLabel = isRemote ? 'Storacha (IPFS)' : 'Backend archive';
  const receiptOk = isRemote ? Boolean(storachaOk) : Boolean(transferId);
  const canViewReceipt = Boolean(transferId);

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-white to-green-50/40">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-green-100 p-3 shrink-0">
              <ShieldCheck className="h-6 w-6 text-green-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Trust Seal — Delivery Verified
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    This distribution is anchored on Polygon Amoy and the receipt is stored for audit.
                  </p>
                </div>
                {onDismiss && (
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 shrink-0"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-green-700" />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Receipt storage
                </p>
              </div>
              <p className="text-sm font-medium text-gray-900">{storageLabel}</p>
              <p className="mt-1 font-mono text-xs text-gray-600 break-all">
                {cid ? truncate(cid, 14, 6) : '—'}
              </p>
              {canViewReceipt && (
                <button
                  type="button"
                  onClick={() => setReceiptOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  View receipt
                </button>
              )}
              {!receiptOk && storachaError && (
                <p className="mt-3 text-xs text-amber-700 leading-relaxed">
                  Storacha unavailable — receipt saved on CoffeeChain backend.
                </p>
              )}
              {!isRemote && !storachaError && (
                <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                  Stored securely on the backend. Polygon anchor still applies.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-green-700" />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Polygon Amoy anchor
                </p>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {blockchainOk ? 'Anchored on chain' : 'Anchor pending'}
              </p>
              <p className="mt-1 font-mono text-xs text-gray-600 break-all">
                {txHash ? truncate(txHash, 14, 8) : '—'}
              </p>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View on Polygonscan
                </a>
              )}
              {!blockchainOk && blockchainError && (
                <p className="mt-3 text-xs text-red-600 leading-relaxed">{blockchainError}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ReceiptViewerModal
        open={receiptOpen}
        transferId={transferId}
        onClose={() => setReceiptOpen(false)}
      />
    </>
  );
}
