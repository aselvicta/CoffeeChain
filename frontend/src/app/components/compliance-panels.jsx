import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, MessageSquare, Plus, ShieldAlert, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  createComplianceFlag,
  decideComplianceRecommendation,
  fetchBranches,
  fetchComplianceFlag,
  fetchComplianceFlags,
  fetchComplianceRecommendations,
  fetchOrganisationCertificates,
  fetchSuppliers,
  recommendComplianceAction,
  reviewOrganisationCertificate,
  updateComplianceFlag,
  uploadOrganisationCertificate,
  openOrganisationCertificateDocument,
} from '../api/client';
import { getUserMessage } from '../utils/user-messages';

const FLAG_STATUS_STYLE = {
  open: 'bg-amber-100 text-amber-800',
  under_review: 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  escalated: 'bg-red-100 text-red-700',
};

const CERT_STATUS_STYLE = {
  pending_review: 'bg-amber-100 text-amber-800',
  verified: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-700',
};

const DOCUMENT_TYPES = [
  { value: 'business_license', label: 'Business licence' },
  { value: 'fertilizer_dealership', label: 'Fertilizer dealership permit' },
  { value: 'cooperative_registration', label: 'Cooperative registration' },
  { value: 'tbs_certificate', label: 'TBS / standards certificate' },
  { value: 'other', label: 'Other' },
];

const COMPLIANCE_STYLE = {
  good_standing: 'bg-emerald-100 text-emerald-700',
  under_review: 'bg-amber-100 text-amber-800',
  flagged: 'bg-red-100 text-red-700',
};

export function ComplianceStatusPill({ status = 'good_standing' }) {
  const label = status.replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${COMPLIANCE_STYLE[status] || COMPLIANCE_STYLE.good_standing}`}>
      {label}
    </span>
  );
}

function FlagBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${FLAG_STATUS_STYLE[status] || 'bg-gray-100 text-gray-700'}`}>
      {String(status || '').replace(/_/g, ' ') || 'unknown'}
    </span>
  );
}

function asList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function effectiveFlagStatus(flag) {
  const decision = flag?.recommendation_decision || flag?.recommendation?.admin_decision;
  if (decision === 'actioned' || decision === 'dismissed') return 'resolved';
  return flag?.status || 'open';
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).replace('T', ' ').slice(0, 16);
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CertificateDocumentButton({ certificateId, label = 'View document', className = '' }) {
  const [opening, setOpening] = useState(false);

  const handleOpen = async () => {
    setOpening(true);
    try {
      await openOrganisationCertificateDocument(certificateId);
    } catch (error) {
      toast.error(getUserMessage(error, 'Failed to open document.'));
    } finally {
      setOpening(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      disabled={opening}
      className={className || 'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60'}
    >
      <Eye className="h-3.5 w-3.5" />
      {opening ? 'Opening…' : label}
    </button>
  );
}

function CertificateReviewModal({ certificate, onClose, onSaved }) {
  const [decision, setDecision] = useState('verified');
  const [note, setNote] = useState('');
  const [expiresOn, setExpiresOn] = useState(certificate?.expires_on || '');
  const [saving, setSaving] = useState(false);

  if (!certificate) return null;

  const submitReview = async () => {
    if (decision === 'rejected' && !note.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }
    setSaving(true);
    try {
      await reviewOrganisationCertificate(certificate.id, {
        decision,
        review_note: note.trim(),
        ...(expiresOn ? { expires_on: expiresOn } : {}),
      });
      toast.success(decision === 'verified' ? 'Certificate verified.' : 'Certificate rejected.');
      onSaved?.();
      onClose?.();
    } catch (error) {
      toast.error(getUserMessage(error, 'Failed to save review.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-bold text-gray-900">Review certificate #{certificate.id}</h3>
          <p className="text-sm text-gray-600">{certificate.organisation?.name} · {certificate.document_type_display}</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600">
              <span>Expires: <strong className="text-gray-900">{certificate.expires_on}</strong></span>
              {certificate.certificate_number && (
                <span>No.: <strong className="text-gray-900">{certificate.certificate_number}</strong></span>
              )}
            </div>
            {(certificate.has_document || certificate.document_url) && (
              <div className="mt-3">
                <CertificateDocumentButton certificateId={certificate.id} label="Open uploaded file" />
              </div>
            )}
          </div>
          <select value={decision} onChange={(e) => setDecision(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="verified">Verify / approve</option>
            <option value="rejected">Reject</option>
          </select>
          {decision === 'verified' && (
            <label className="block text-xs text-gray-500">
              Confirm expiry date
              <input
                type="date"
                value={expiresOn}
                onChange={(e) => setExpiresOn(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          )}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={decision === 'rejected' ? 'Rejection reason (required)' : 'Review note (optional)'}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2 border-t border-gray-200 px-6 py-4">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" disabled={saving} onClick={submitReview} className="flex-1 rounded-lg bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save decision'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrganisationCertificatesPanel({
  title,
  description,
  canReview = false,
  readOnlyHint,
  defaultFilter = 'pending_review',
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(defaultFilter);
  const [reviewModal, setReviewModal] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = filter === 'due_soon' ? { due_soon: true } : filter === 'all' ? {} : { status: filter };
      const data = await fetchOrganisationCertificates(params);
      setRows(asList(data));
    } catch (error) {
      toast.error(getUserMessage(error, 'Failed to load certificates.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const filters = [
    { id: 'pending_review', label: 'Pending review' },
    { id: 'verified', label: 'Verified' },
    { id: 'due_soon', label: 'Due within 30 days' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'expired', label: 'Expired' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
        {readOnlyHint && (
          <p className="mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 inline-block">
            {readOnlyHint}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filter === item.id ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {loading && (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">Loading certificates…</div>
        )}
        {!loading && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">No certificates in this view.</div>
        )}
        {!loading && rows.map((cert) => (
          <div key={cert.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-300 transition-colors">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{cert.organisation?.name || 'Organisation'}</h3>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${CERT_STATUS_STYLE[cert.status] || 'bg-gray-100 text-gray-700'}`}>
                    {(cert.status_display || cert.status || '').replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{cert.document_type_display || cert.document_type}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>Expires {cert.expires_on}</span>
                  {cert.certificate_number && <span>No. {cert.certificate_number}</span>}
                  {cert.issuing_authority && <span>{cert.issuing_authority}</span>}
                  {cert.uploaded_by_username && <span>Uploaded by {cert.uploaded_by_username}</span>}
                </div>
                {cert.review_note && (
                  <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-2 py-1.5">{cert.review_note}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {(cert.has_document || cert.document_url) && (
                  <CertificateDocumentButton certificateId={cert.id} />
                )}
                {canReview && (cert.status === 'pending_review' || cert.status === 'expired') && (
                  <button
                    type="button"
                    onClick={() => setReviewModal(cert)}
                    className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800"
                  >
                    Review
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {canReview && reviewModal && (
        <CertificateReviewModal
          certificate={reviewModal}
          onClose={() => setReviewModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function FlagTimeline({ flag }) {
  const raisedAt = flag.raised_at || flag.created_at;
  const rows = [
    { label: 'Raised', at: raisedAt },
    { label: 'Reviewed', at: flag.reviewed_at },
    { label: 'Escalated', at: flag.escalated_at },
    { label: 'Resolved', at: flag.resolved_at },
  ].filter((row) => row.at);

  if (!rows.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Timeline</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <span className="text-gray-500">{row.label}</span>
            <span className="font-medium text-gray-900 text-right">{formatDateTime(row.at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlagDetailModal({
  flag,
  onClose,
  canRespond = false,
  canRecommend = false,
  canChangeStatus = false,
  onRespond,
  onRecommend,
  onStatusChange,
}) {
  const [message, setMessage] = useState('');
  const [action, setAction] = useState('warn');
  const [justification, setJustification] = useState('');

  if (!flag) return null;

  const decision = flag.recommendation?.admin_decision;
  const isResolved = flag.status === 'resolved' || decision === 'actioned' || decision === 'dismissed';
  const isPendingEscalation = flag.status === 'escalated' && (!decision || decision === 'pending');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-gray-200 px-6 py-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Compliance Flag #{flag.id}</h3>
            <p className="text-sm text-gray-600">{flag.target_summary}</p>
          </div>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Organisation</p>
              <p className="font-medium text-gray-900">{flag.flagged_organisation?.name || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Status</p>
              <FlagBadge status={isResolved ? 'resolved' : flag.status} />
            </div>
            <div>
              <p className="text-gray-500">Raised</p>
              <p className="font-medium text-gray-900">{formatDateTime(flag.raised_at || flag.created_at)}</p>
            </div>
            <div>
              <p className="text-gray-500">Reason</p>
              <p className="font-medium text-gray-900">{flag.reason}</p>
            </div>
            <div>
              <p className="text-gray-500">Evidence</p>
              <p className="font-medium text-gray-900">{flag.evidence_ref || '—'}</p>
            </div>
          </div>

          <FlagTimeline flag={flag} />

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{flag.description}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">Responses</p>
            {flag.responses?.length ? (
              <div className="space-y-2">
                {flag.responses.map((response) => (
                  <div key={response.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{response.responded_by_username || 'Actor'}</span>
                      <span>{formatDateTime(response.created_at)}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{response.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No responses yet.</p>
            )}
          </div>

          <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-600">
            Status flow: <span className="font-medium text-gray-900">open</span>
            {' → '}
            <span className="font-medium text-gray-900">under review</span>
            {' → '}
            <span className="font-medium text-gray-900">escalated</span>
            {' (recommend to admin) → '}
            <span className="font-medium text-gray-900">resolved</span>
            {' (admin approve/dismiss)'}
          </div>

          {flag.recommendation && (
            <div className={`rounded-lg border p-4 text-sm ${
              decision === 'actioned'
                ? 'border-emerald-200 bg-emerald-50'
                : decision === 'dismissed'
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-amber-200 bg-amber-50'
            }`}
            >
              <p className="font-semibold text-gray-900 mb-1">Recommendation to admin</p>
              <p className="text-gray-800">
                {(flag.recommendation.recommended_action || '').replace(/_/g, ' ')}
                {' · '}
                Decision: {(decision || 'pending').replace(/_/g, ' ')}
              </p>
              {flag.recommendation.justification && (
                <p className="mt-2 text-gray-700 whitespace-pre-wrap">{flag.recommendation.justification}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Submitted {formatDateTime(flag.recommendation.created_at || flag.escalated_at)}
                {flag.recommendation.decided_at ? ` · Decided ${formatDateTime(flag.recommendation.decided_at)}` : ''}
              </p>
              {flag.recommendation.admin_decision_note && (
                <p className="mt-2 text-gray-700">
                  <span className="font-medium">Admin note:</span> {flag.recommendation.admin_decision_note}
                </p>
              )}
            </div>
          )}

          {canChangeStatus && !isResolved && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-900">Update status</p>
              <div className="flex flex-wrap gap-2">
                {flag.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => onStatusChange?.(flag, 'under_review')}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Mark under review
                  </button>
                )}
                {flag.status === 'under_review' && (
                  <button
                    type="button"
                    onClick={() => onStatusChange?.(flag, 'open')}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Reopen
                  </button>
                )}
                {isPendingEscalation && (
                  <span className="inline-flex items-center rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Waiting for admin approve/dismiss…
                  </span>
                )}
              </div>
            </div>
          )}

          {canRespond && !isResolved && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-900">Respond to this flag</p>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Write your response..."
              />
              <button
                type="button"
                onClick={() => {
                  if (!message.trim()) return;
                  onRespond?.(flag, message.trim());
                  setMessage('');
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800"
              >
                <MessageSquare className="h-4 w-4" />
                Submit Response
              </button>
            </div>
          )}

          {canRecommend && !flag.recommendation && ['open', 'under_review'].includes(flag.status) && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-900">Recommend Action to Admin</p>
              <p className="text-xs text-gray-500">This escalates the flag and sends it to the admin decision queue.</p>
              <select
                value={action}
                onChange={(event) => setAction(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="suspend">Suspend account</option>
                <option value="audit">Full audit</option>
                <option value="retrain">Retrain / re-onboard</option>
                <option value="warn">Formal warning</option>
                <option value="no_action">No action needed</option>
              </select>
              <textarea
                value={justification}
                onChange={(event) => setJustification(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Justification for recommendation..."
              />
              <button
                type="button"
                onClick={() => {
                  if (!justification.trim()) return;
                  onRecommend?.(flag, { recommended_action: action, justification: justification.trim() });
                  setJustification('');
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                <AlertTriangle className="h-4 w-4" />
                Escalate to admin
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function RegulatorCompliancePanel({ initialDraft = null, onDraftConsumed }) {
  const [flags, setFlags] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [orgTypeFilter, setOrgTypeFilter] = useState('all');
  const [detailFlag, setDetailFlag] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    target_type: 'transfer',
    target_id: '',
    flagged_organisation_type: 'supplier',
    flagged_organisation_id: '',
    reason: '',
    description: '',
    evidence_ref: '',
  });

  const emptyForm = {
    target_type: 'transfer',
    target_id: '',
    flagged_organisation_type: 'supplier',
    flagged_organisation_id: '',
    reason: '',
    description: '',
    evidence_ref: '',
  };

  const openCreateModal = () => {
    if (initialDraft) {
      setForm((prev) => ({ ...prev, ...initialDraft }));
      onDraftConsumed?.();
    } else {
      setForm(emptyForm);
    }
    setShowCreate(true);
  };

  const closeCreateModal = () => {
    setShowCreate(false);
    setForm(emptyForm);
    onDraftConsumed?.();
  };

  const refreshFlagsFromServer = async (preferDetail = null) => {
    const flagData = await fetchComplianceFlags();
    let list = asList(flagData);
    if (preferDetail?.id) {
      const exists = list.some((row) => row.id === preferDetail.id);
      list = exists
        ? list.map((row) => (row.id === preferDetail.id ? { ...row, ...preferDetail } : row))
        : [preferDetail, ...list];
    }
    setFlags(list);
    return list;
  };

  const loadFlags = async () => {
    await refreshFlagsFromServer();
  };

  const load = async () => {
    setLoading(true);
    try {
      await loadFlags();
      const [supplierData, branchData] = await Promise.all([
        fetchSuppliers().catch(() => []),
        fetchBranches().catch(() => []),
      ]);
      setSuppliers(Array.isArray(supplierData) ? supplierData : []);
      setBranches(Array.isArray(branchData) ? branchData : []);
    } catch (error) {
      toast.error(getUserMessage(error, 'Failed to load compliance flags.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Pick up admin decisions / other session changes when returning to this tab.
  useEffect(() => {
    const onFocus = () => {
      refreshFlagsFromServer().catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  const filteredFlags = useMemo(() => {
    return flags.filter((flag) => {
      const effectiveStatus = (
        flag.recommendation_decision === 'actioned'
        || flag.recommendation_decision === 'dismissed'
        || flag.recommendation?.admin_decision === 'actioned'
        || flag.recommendation?.admin_decision === 'dismissed'
      ) ? 'resolved' : flag.status;
      if (statusFilter !== 'all' && effectiveStatus !== statusFilter) return false;
      if (orgTypeFilter !== 'all' && (flag.flagged_organisation?.organisation_type || '').toUpperCase() !== orgTypeFilter) return false;
      return true;
    });
  }, [flags, orgTypeFilter, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = { all: flags.length, open: 0, under_review: 0, resolved: 0, escalated: 0 };
    flags.forEach((flag) => {
      const effectiveStatus = (
        flag.recommendation_decision === 'actioned'
        || flag.recommendation_decision === 'dismissed'
        || flag.recommendation?.admin_decision === 'actioned'
        || flag.recommendation?.admin_decision === 'dismissed'
      ) ? 'resolved' : flag.status;
      if (counts[effectiveStatus] !== undefined) counts[effectiveStatus] += 1;
    });
    return counts;
  }, [flags]);

  const orgOptions = form.flagged_organisation_type === 'supplier'
    ? suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))
    : branches.map((branch) => ({ value: branch.id, label: `${branch.name} (${branch.branch_type})` }));

  const applyFlagUpdate = (updated, { alignFilter = false } = {}) => {
    if (!updated?.id) return;
    setFlags((prev) => {
      const exists = prev.some((row) => row.id === updated.id);
      if (!exists) return [updated, ...prev];
      return prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row));
    });
    if (!updated.status) return;
    if (alignFilter) {
      setStatusFilter(updated.status);
      return;
    }
    setStatusFilter((current) => {
      if (current === 'all' || current === updated.status) return current;
      return updated.status;
    });
  };

  const openDetail = async (flagId) => {
    try {
      const detail = await fetchComplianceFlag(flagId);
      setDetailFlag(detail);
      await refreshFlagsFromServer(detail);
      setStatusFilter((current) => {
        if (current === 'all' || current === detail.status) return current;
        return detail.status;
      });
    } catch (error) {
      toast.error(getUserMessage(error, 'Failed to load flag details.'));
    }
  };

  const submitFlag = async () => {
    if (!form.target_id || Number.isNaN(Number(form.target_id)) || Number(form.target_id) <= 0) {
      toast.error('Enter a valid target ID (transfer, batch, or user).');
      return;
    }
    if (!form.reason.trim() || !form.description.trim()) {
      toast.error('Reason and description are required.');
      return;
    }

    const payload = {
      target_type: form.target_type,
      target_id: Number(form.target_id),
      reason: form.reason.trim(),
      description: form.description.trim(),
      evidence_ref: form.evidence_ref || '',
    };
    if (form.flagged_organisation_id) {
      payload.flagged_organisation_type = form.flagged_organisation_type;
      payload.flagged_organisation_id = Number(form.flagged_organisation_id);
    }

    setSubmitting(true);
    try {
      const created = await createComplianceFlag(payload);
      toast.success('Compliance flag raised. It is now visible on the admin Compliance page.');
      closeCreateModal();
      setStatusFilter('all');
      setOrgTypeFilter('all');
      if (created?.id) {
        setFlags((prev) => [created, ...prev.filter((row) => row.id !== created.id)]);
      }
      await loadFlags();
    } catch (error) {
      toast.error(getUserMessage(error, 'Failed to raise compliance flag.'));
    } finally {
      setSubmitting(false);
    }
  };

  const syncFlagInList = (updated) => {
    applyFlagUpdate(updated, { alignFilter: true });
  };

  const handleRecommend = async (flag, payload) => {
    try {
      await recommendComplianceAction(flag.id, payload);
      toast.success('Escalated to admin for decision.');
      const detail = await fetchComplianceFlag(flag.id);
      setDetailFlag(detail);
      await refreshFlagsFromServer(detail);
      setStatusFilter(detail.status || 'escalated');
    } catch (error) {
      toast.error(getUserMessage(error, 'Failed to submit recommendation.'));
    }
  };

  const handleStatusChange = async (flag, nextStatus) => {
    try {
      const updated = await updateComplianceFlag(flag.id, { status: nextStatus });
      toast.success(`Flag moved to ${String(nextStatus).replace(/_/g, ' ')}.`);
      setDetailFlag(updated);
      await refreshFlagsFromServer(updated);
      setStatusFilter(updated.status || nextStatus);
    } catch (error) {
      toast.error(getUserMessage(error, 'Failed to update flag status.'));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Compliance Flags</h2>
          <p className="text-sm text-gray-500">Raise, monitor, and escalate compliance issues for admin action.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="sm:ml-auto inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
        >
          <Plus className="h-4 w-4" />
          Raise Flag
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-1">Filter</span>
        {['all', 'open', 'under_review', 'resolved', 'escalated'].map((status) => {
          const count = statusCounts[status] ?? 0;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${statusFilter === status ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {status.replace(/_/g, ' ')}
              <span className={`ml-1.5 text-xs ${statusFilter === status ? 'text-green-100' : 'text-gray-500'}`}>({count})</span>
            </button>
          );
        })}
        <select
          value={orgTypeFilter}
          onChange={(event) => setOrgTypeFilter(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="all">All organisation types</option>
          <option value="SUPPLIER">Supplier</option>
          <option value="RETAILER">Retailer</option>
          <option value="COOPERATIVE">AMCOS / Cooperative</option>
        </select>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Target</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Organisation</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Reason</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Raised</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">Loading flags...</td></tr>
            )}
            {!loading && filteredFlags.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">No flags found.</td></tr>
            )}
            {!loading && filteredFlags.map((flag) => {
              const displayStatus = (
                flag.recommendation_decision === 'actioned'
                || flag.recommendation_decision === 'dismissed'
                || flag.recommendation?.admin_decision === 'actioned'
                || flag.recommendation?.admin_decision === 'dismissed'
              ) ? 'resolved' : flag.status;
              return (
              <tr key={flag.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-800">{flag.target_summary}</td>
                <td className="px-4 py-3 text-gray-700">{flag.flagged_organisation?.name || '—'}</td>
                <td className="px-4 py-3 text-gray-700">{flag.reason}</td>
                <td className="px-4 py-3"><FlagBadge status={displayStatus} /></td>
                <td className="px-4 py-3 text-gray-600">
                  <div>{formatDateTime(flag.raised_at || flag.created_at)}</div>
                  {flag.resolved_at && <div className="text-xs text-emerald-700">Resolved {formatDateTime(flag.resolved_at)}</div>}
                  {!flag.resolved_at && flag.escalated_at && <div className="text-xs text-red-700">Escalated {formatDateTime(flag.escalated_at)}</div>}
                  {!flag.resolved_at && !flag.escalated_at && flag.reviewed_at && <div className="text-xs text-blue-700">Reviewed {formatDateTime(flag.reviewed_at)}</div>}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => openDetail(flag.id)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    View
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeCreateModal}>
          <div className="w-full max-w-xl rounded-xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">Raise Compliance Flag</h3>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.target_type}
                  onChange={(event) => setForm((prev) => ({ ...prev, target_type: event.target.value }))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="transfer">Transfer</option>
                  <option value="batch">Batch</option>
                  <option value="dispatch">Dispatch</option>
                  <option value="user_account">User account</option>
                </select>
                <input
                  type="number"
                  value={form.target_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, target_id: event.target.value }))}
                  placeholder="Target ID"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.flagged_organisation_type}
                  onChange={(event) => setForm((prev) => ({ ...prev, flagged_organisation_type: event.target.value, flagged_organisation_id: '' }))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="supplier">Supplier</option>
                  <option value="branch">Branch</option>
                </select>
                <select
                  value={form.flagged_organisation_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, flagged_organisation_id: event.target.value }))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Auto from target (or select)</option>
                  {orgOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500">Organisation is optional when the target transfer/batch already belongs to an org.</p>
              <input
                type="text"
                value={form.reason}
                onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                placeholder="Reason"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Description"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={form.evidence_ref}
                onChange={(event) => setForm((prev) => ({ ...prev, evidence_ref: event.target.value }))}
                placeholder="Evidence reference (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 border-t border-gray-200 px-6 py-4">
              <button type="button" onClick={closeCreateModal} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                type="button"
                disabled={
                  submitting ||
                  !form.target_id ||
                  Number(form.target_id) <= 0 ||
                  !form.reason.trim() ||
                  !form.description.trim()
                }
                onClick={submitFlag}
                className="flex-1 rounded-lg bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Raising…' : 'Raise Flag'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailFlag && (
        <FlagDetailModal
          flag={detailFlag}
          onClose={() => setDetailFlag(null)}
          canRecommend
          canChangeStatus
          onRecommend={handleRecommend}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

export function AdminCompliancePanel() {
  const [flags, setFlags] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailFlag, setDetailFlag] = useState(null);
  const [decisionModal, setDecisionModal] = useState(null);
  const [decision, setDecision] = useState('actioned');
  const [note, setNote] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [flagData, recommendationData] = await Promise.all([
        fetchComplianceFlags(),
        fetchComplianceRecommendations({ decision: 'pending' }),
      ]);
      setFlags(asList(flagData));
      setRows(asList(recommendationData));
    } catch (error) {
      toast.error(getUserMessage(error, 'Failed to load compliance data.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onFocus = () => {
      load().catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  const filteredFlags = useMemo(() => {
    return flags.filter((flag) => {
      if (statusFilter === 'all') return true;
      return effectiveFlagStatus(flag) === statusFilter;
    });
  }, [flags, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = { all: flags.length, open: 0, under_review: 0, escalated: 0, resolved: 0 };
    flags.forEach((flag) => {
      const status = effectiveFlagStatus(flag);
      if (counts[status] !== undefined) counts[status] += 1;
    });
    return counts;
  }, [flags]);

  const openDetail = async (flagId) => {
    try {
      const detail = await fetchComplianceFlag(flagId);
      setDetailFlag(detail);
    } catch (error) {
      toast.error(getUserMessage(error, 'Failed to load flag details.'));
    }
  };

  const submitDecision = async () => {
    if (!decisionModal || !note.trim()) return;
    try {
      const result = await decideComplianceRecommendation(decisionModal.id, {
        admin_decision: decision,
        admin_decision_note: note.trim(),
      });
      const flagStatus = result?.flag_status || result?.flag_summary?.status || 'resolved';
      toast.success(
        decision === 'actioned'
          ? `Approved — flag is now ${flagStatus}.`
          : `Dismissed — flag is now ${flagStatus}.`
      );
      setDecisionModal(null);
      setNote('');
      setDecision('actioned');
      await load();
    } catch (error) {
      toast.error(getUserMessage(error, 'Failed to save decision.'));
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Compliance flags</h2>
            <p className="text-sm text-gray-500">
              Flags raised by regulators appear here immediately. Escalate actions show in the decision queue below.
            </p>
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="sm:ml-auto rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-1">Filter</span>
          {['all', 'open', 'under_review', 'escalated', 'resolved'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${statusFilter === status ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {status.replace(/_/g, ' ')}
              <span className={`ml-1.5 text-xs ${statusFilter === status ? 'text-green-100' : 'text-gray-500'}`}>
                ({statusCounts[status] ?? 0})
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Target</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Organisation</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Reason</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Raised by</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Raised</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Loading flags...</td></tr>}
              {!loading && filteredFlags.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">No compliance flags yet.</td></tr>
              )}
              {!loading && filteredFlags.map((flag) => (
                <tr key={flag.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{flag.target_summary}</td>
                  <td className="px-4 py-3 text-gray-700">{flag.flagged_organisation?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{flag.reason}</td>
                  <td className="px-4 py-3"><FlagBadge status={effectiveFlagStatus(flag)} /></td>
                  <td className="px-4 py-3 text-gray-600">{flag.raised_by_username || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{formatDateTime(flag.raised_at || flag.created_at)}</div>
                    {flag.resolved_at && <div className="text-xs text-emerald-700">Resolved {formatDateTime(flag.resolved_at)}</div>}
                    {!flag.resolved_at && flag.escalated_at && <div className="text-xs text-red-700">Escalated {formatDateTime(flag.escalated_at)}</div>}
                    {!flag.resolved_at && !flag.escalated_at && flag.reviewed_at && <div className="text-xs text-blue-700">Reviewed {formatDateTime(flag.reviewed_at)}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openDetail(flag.id)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pending regulatory recommendations</h2>
          <p className="text-sm text-gray-500">
            Appears after a regulator escalates a flag with a recommended action. Approve or dismiss here.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Flag</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Recommended action</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Justification</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Escalated</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Decision</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">Loading recommendations...</td></tr>}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    No pending recommendations. Flags above still need a regulator to choose &quot;Escalate to admin&quot;.
                  </td>
                </tr>
              )}
              {!loading && rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">
                    <div className="font-medium">Flag #{row.flag_summary?.id || row.flag}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{row.flag_summary?.target_summary || '—'}</div>
                    <div className="text-xs text-gray-500">{row.flag_summary?.flagged_organisation?.name || ''}</div>
                    {row.flag_summary?.evidence_ref && (
                      <div className="text-xs text-amber-700 mt-0.5">Evidence: {row.flag_summary.evidence_ref}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{(row.recommended_action || '').replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-gray-700">{row.justification}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDateTime(row.flag_summary?.escalated_at || row.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setDecisionModal(row)}
                      className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800"
                    >
                      Decide
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detailFlag && (
        <FlagDetailModal
          flag={detailFlag}
          onClose={() => setDetailFlag(null)}
        />
      )}

      {decisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDecisionModal(null)}>
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">Decide Recommendation #{decisionModal.id}</h3>
              {decisionModal.flag_summary && (
                <p className="mt-1 text-sm text-gray-600">
                  {decisionModal.flag_summary.target_summary}
                  {decisionModal.recommended_action === 'suspend' ? ' · Approving will suspend related accounts.' : ''}
                </p>
              )}
            </div>
            <div className="px-6 py-5 space-y-3">
              <select
                value={decision}
                onChange={(event) => setDecision(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="actioned">Approve & resolve flag</option>
                <option value="dismissed">Dismiss & resolve flag</option>
              </select>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                placeholder="Decision note (required)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 border-t border-gray-200 px-6 py-4">
              <button type="button" onClick={() => setDecisionModal(null)} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={submitDecision} className="flex-1 rounded-lg bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-800">Save Decision</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ActorCompliancePanel() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    document_type: 'business_license',
    certificate_number: '',
    issuing_authority: '',
    issued_on: '',
    expires_on: '',
    notes: '',
    document: null,
  });

  const load = async () => {
    setLoading(true);
    try {
      const certData = await fetchOrganisationCertificates();
      setCertificates(asList(certData));
    } catch (error) {
      toast.error(getUserMessage(error, 'Failed to load certificates.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitUpload = async () => {
    if (!form.document || !form.expires_on) {
      toast.error('Certificate file and expiry date are required.');
      return;
    }
    setUploading(true);
    try {
      await uploadOrganisationCertificate(form);
      toast.success('Certificate submitted for admin review.');
      setShowUpload(false);
      setForm({
        document_type: 'business_license',
        certificate_number: '',
        issuing_authority: '',
        issued_on: '',
        expires_on: '',
        notes: '',
        document: null,
      });
      await load();
    } catch (error) {
      toast.error(getUserMessage(error, 'Failed to upload certificate.'));
    } finally {
      setUploading(false);
    }
  };

  const activeCert = certificates.find((c) => c.status === 'verified' && c.is_active);

  return (
    <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Organisation licences</h2>
            <p className="text-sm text-gray-500">
              Upload your business or cooperative certificates. An administrator will verify them before key operations are unlocked.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="sm:ml-auto inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 shadow-sm"
          >
            <Upload className="h-4 w-4" />
            Upload certificate
          </button>
        </div>

        {activeCert ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Verified licence active</p>
              <p className="text-emerald-800">{activeCert.document_type_display || activeCert.document_type} valid until {activeCert.expires_on}.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">No verified certificate on file</p>
              <p className="text-amber-800">Dispatches and orders may be blocked until an administrator verifies your upload.</p>
            </div>
          </div>
        )}

        <div className="grid gap-3">
          {loading && (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">Loading certificates…</div>
          )}
          {!loading && certificates.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
              No certificates uploaded yet. Use the button above to submit your first document.
            </div>
          )}
          {!loading && certificates.map((cert) => (
            <div key={cert.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900">{cert.document_type_display || cert.document_type}</p>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${CERT_STATUS_STYLE[cert.status] || 'bg-gray-100 text-gray-700'}`}>
                      {(cert.status_display || cert.status || '').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>Expires {cert.expires_on}</span>
                    {cert.certificate_number && <span>No. {cert.certificate_number}</span>}
                  </div>
                  {cert.review_note && <p className="mt-2 text-xs text-gray-600">{cert.review_note}</p>}
                </div>
                {(cert.has_document || cert.document_url) && (
                  <CertificateDocumentButton certificateId={cert.id} label="View file" />
                )}
              </div>
            </div>
          ))}
        </div>

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowUpload(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">Upload organisation certificate</h3>
              <p className="text-sm text-gray-500 mt-1">PDF or image, max 5 MB. Sent to administrators for review.</p>
            </div>
            <div className="px-6 py-5 space-y-3">
              <label className="block text-xs font-medium text-gray-600">
                Document type
                <select
                  value={form.document_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, document_type: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {DOCUMENT_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <input
                type="text"
                value={form.certificate_number}
                onChange={(e) => setForm((prev) => ({ ...prev, certificate_number: e.target.value }))}
                placeholder="Certificate number (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={form.issuing_authority}
                onChange={(e) => setForm((prev) => ({ ...prev, issuing_authority: e.target.value }))}
                placeholder="Issuing authority (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-gray-600">
                  Issued on
                  <input
                    type="date"
                    value={form.issued_on}
                    onChange={(e) => setForm((prev) => ({ ...prev, issued_on: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs font-medium text-gray-600">
                  Expires on *
                  <input
                    type="date"
                    value={form.expires_on}
                    onChange={(e) => setForm((prev) => ({ ...prev, expires_on: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <label className="block rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center cursor-pointer hover:border-green-400 hover:bg-green-50/50 transition-colors">
                <Upload className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-700">
                  {form.document ? form.document.name : 'Choose PDF or image file'}
                </span>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setForm((prev) => ({ ...prev, document: e.target.files?.[0] || null }))}
                  className="sr-only"
                />
              </label>
            </div>
            <div className="flex gap-2 border-t border-gray-200 px-6 py-4">
              <button type="button" onClick={() => setShowUpload(false)} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" disabled={uploading} onClick={submitUpload} className="flex-1 rounded-lg bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60">
                {uploading ? 'Uploading…' : 'Submit for review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function RegulatorCertificatesPanel() {
  return (
    <OrganisationCertificatesPanel
      title="Organisation certificates"
      description="View uploaded licences across the network. Verification is handled by administrators."
      readOnlyHint="Read-only view — regulators can inspect documents but cannot approve or reject them."
      defaultFilter="all"
    />
  );
}

export function AdminCertificatesPanel() {
  return (
    <OrganisationCertificatesPanel
      title="Certificate review queue"
      description="Verify or reject organisation uploads. Approved certificates unlock supply-chain operations."
      canReview
      defaultFilter="pending_review"
    />
  );
}

export function AdminComplianceHub() {
  const [section, setSection] = useState('flags');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSection('flags')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${section === 'flags' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Compliance flags
        </button>
        <button
          type="button"
          onClick={() => setSection('certificates')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${section === 'certificates' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Certificates
        </button>
      </div>
      {section === 'flags' ? <AdminCompliancePanel /> : <AdminCertificatesPanel />}
    </div>
  );
}

export function RegulatorComplianceHub({ initialDraft = null, onDraftConsumed }) {
  const [section, setSection] = useState('flags');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSection('flags')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${section === 'flags' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Compliance flags
        </button>
        <button
          type="button"
          onClick={() => setSection('certificates')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${section === 'certificates' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Certificates (view only)
        </button>
      </div>
      {section === 'flags' ? (
        <RegulatorCompliancePanel initialDraft={initialDraft} onDraftConsumed={onDraftConsumed} />
      ) : (
        <RegulatorCertificatesPanel />
      )}
    </div>
  );
}

export function ComplianceSummaryCard({ pendingCount = 0, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-5 hover:border-amber-300 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="bg-amber-500 p-2.5 rounded-lg"><ShieldAlert className="h-5 w-5 text-white" /></div>
        <CheckCircle2 className="h-4 w-4 text-amber-500" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-0.5">{pendingCount}</h3>
      <p className="text-sm font-medium text-gray-600">Pending Regulatory Recommendations</p>
      <p className="text-xs text-amber-700 mt-0.5">Requires admin decision</p>
    </button>
  );
}
