import { ShieldCheck, FileText, Link as LinkIcon, AlertCircle, X } from 'lucide-react';

function truncate(value, head = 10, tail = 6) {
  if (!value) return '';
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function VerificationTrustSeal({ verification, onDismiss }) {
  if (!verification) return null;

  const {
    cid,
    tx_hash: txHash,
    explorer_url: explorerUrl,
    storage_url: storageUrl,
    storage_is_remote: storageIsRemote,
    storacha_ok: storachaOk,
    blockchain_ok: blockchainOk,
    storacha_error: storachaError,
    blockchain_error: blockchainError,
  } = verification;

  const storageLabel = storageIsRemote ? 'Storacha (IPFS)' : 'Local fallback';
  const storageHref = storageIsRemote
    ? storageUrl
    : storageUrl?.startsWith('/')
      ? `http://localhost:8000${storageUrl}`
      : storageUrl;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-emerald-100 p-2.5">
          <ShieldCheck className="h-6 w-6 text-emerald-700" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-emerald-900">
              Trust Seal — Delivery Verified
            </h3>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-100"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="text-sm text-emerald-700">
            The transfer is now anchored on Polygon Amoy and the receipt is
            stored for audit.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div
              className={`rounded-lg border p-3 ${
                storachaOk
                  ? 'border-emerald-200 bg-white'
                  : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText
                  className={`h-4 w-4 ${
                    storachaOk ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                  {storageLabel}
                </p>
              </div>
              <p className="mt-1 font-mono text-xs text-gray-900 break-all">
                {cid ? truncate(cid, 14, 6) : '—'}
              </p>
              {storageHref && (
                <a
                  href={storageHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                >
                  <LinkIcon className="h-3 w-3" />
                  View receipt
                </a>
              )}
              {!storachaOk && storachaError && (
                <p className="mt-2 flex items-start gap-1 text-[10px] text-amber-700">
                  <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                  Storacha unavailable; saved locally. {storachaError}
                </p>
              )}
            </div>

            <div
              className={`rounded-lg border p-3 ${
                blockchainOk
                  ? 'border-emerald-200 bg-white'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className={`h-4 w-4 ${
                    blockchainOk ? 'text-emerald-600' : 'text-red-600'
                  }`}
                />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Polygon Amoy Anchor
                </p>
              </div>
              <p className="mt-1 font-mono text-xs text-gray-900 break-all">
                {txHash ? truncate(txHash, 14, 8) : '—'}
              </p>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                >
                  <LinkIcon className="h-3 w-3" />
                  View on Polygonscan
                </a>
              )}
              {!blockchainOk && blockchainError && (
                <p className="mt-2 flex items-start gap-1 text-[10px] text-red-700">
                  <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                  {blockchainError}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
