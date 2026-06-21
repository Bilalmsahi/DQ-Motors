import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Car, Search, RefreshCw, X, Eye, DollarSign,
  Loader2, CheckCircle, AlertCircle, Clock, XCircle,
  ChevronLeft, ChevronRight, Save, Send, Trash2, ExternalLink,
} from 'lucide-react';
import api from '../../services/api';

const STATUS_MAP = {
  PENDING:  { label: 'Pending',  color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  OFFERED:  { label: 'Offered',  color: 'bg-blue-100 text-blue-700',     icon: DollarSign },
  ACCEPTED: { label: 'Accepted', color: 'bg-green-100 text-green-700',   icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700',       icon: XCircle },
};

const CONDITION_COLORS = {
  EXCELLENT: 'bg-green-100 text-green-700',
  GOOD:      'bg-blue-100 text-blue-700',
  FAIR:      'bg-yellow-100 text-yellow-700',
  POOR:      'bg-red-100 text-red-700',
};

export default function AdminTradeIns() {
  const [tradeIns, setTradeIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);      // review modal
  const [zoomImg, setZoomImg] = useState(null);          // photo zoom
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────
  const fetchTradeIns = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : '';
      const res = await api.get(`/crm/trade-ins/${params}`);
      setTradeIns(res.results || res);
    } catch {
      console.error('Failed to load trade-ins');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchTradeIns(); }, [filter, fetchTradeIns]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/crm/trade-ins/${deleteTarget.id}/`);
      setTradeIns(prev => prev.filter(t => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      console.error('Failed to delete trade-in');
    } finally {
      setDeleting(false);
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────
  const filtered = tradeIns.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.make?.toLowerCase().includes(q) ||
      t.model?.toLowerCase().includes(q) ||
      t.vin?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Car className="w-6 h-6 text-brand-600" /> Trade-In Appraisals
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Review customer trade-in requests and send valuations.
          </p>
        </div>
        <button
          onClick={fetchTradeIns}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, make, model, VIN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="OFFERED">Offered</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            No trade-in submissions found.
          </div>
        ) : (
          <table className="w-full block md:table text-sm">
            <thead className="hidden md:table-header-group">
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3">Vehicle</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Mileage</th>
                <th className="px-5 py-3">Condition</th>
                <th className="px-5 py-3">Estimate</th>
                <th className="px-5 py-3">Offer</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Lead</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group">
              {filtered.map((t) => {
                const st = STATUS_MAP[t.status] || STATUS_MAP.PENDING;
                const Icon = st.icon;
                return (
                  <tr
                    key={t.id}
                    className="block md:table-row bg-white border border-gray-200 md:border-b md:border-x-0 md:border-t-0 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50/50 transition"
                  >
                    {/* Vehicle */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-3 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm font-medium text-slate-800">
                      <span className="md:hidden font-semibold text-gray-500">Vehicle</span>
                      <span>{t.year} {t.make} {t.model}</span>
                    </td>
                    {/* Customer */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-3 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Customer</span>
                      <div className="text-right md:text-left">
                        <p className="text-slate-700">{t.name}</p>
                        <p className="text-xs text-gray-400">{t.email}</p>
                      </div>
                    </td>
                    {/* Mileage */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-3 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Mileage</span>
                      <span className="text-gray-600">{Number(t.mileage).toLocaleString()} mi</span>
                    </td>
                    {/* Condition */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-3 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Condition</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONDITION_COLORS[t.condition] || ''}`}>
                        {t.condition_display || t.condition}
                      </span>
                    </td>
                    {/* Estimate (auto) */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-3 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Estimate</span>
                      {t.estimated_value_low && t.estimated_value_high ? (
                        <span
                          className="text-xs text-gray-500"
                          title="Auto-generated estimate at submission. Internal reference only."
                        >
                          ${Number(t.estimated_value_low).toLocaleString()}
                          {' – '}
                          ${Number(t.estimated_value_high).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    {/* Offer */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-3 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Offer</span>
                      <span className="font-semibold text-slate-800">
                        {t.offer_amount
                          ? `$${Number(t.offer_amount).toLocaleString()}`
                          : '—'}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-3 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Status</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                        <Icon className="w-3 h-3" /> {st.label}
                      </span>
                    </td>
                    {/* Lead */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-3 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Lead</span>
                      {t.lead ? (
                        <Link
                          to={`/admin/leads?highlight=${t.lead}`}
                          className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-medium"
                        >
                          <ExternalLink className="w-3 h-3" /> Lead #{t.lead}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    {/* Date */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-3 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Date</span>
                      <span className="text-gray-400 text-xs">{new Date(t.created_at).toLocaleDateString()}</span>
                    </td>
                    {/* Action */}
                    <td className="flex justify-end gap-2 mt-2 md:mt-0 pt-2 md:pt-0 border-t border-gray-100 md:border-0 md:table-cell md:py-3 md:px-5 text-sm">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelected(t)}
                          className="inline-flex items-center gap-1 text-brand-600 hover:text-[#e65100] text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" /> Review
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors ml-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Review Modal */}
      {selected && (
        <ReviewModal
          tradeIn={selected}
          onClose={() => setSelected(null)}
          onSaved={(updated) => {
            setTradeIns((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            );
            setSelected(null);
          }}
        />
      )}

      {/* Photo Zoom */}
      {zoomImg && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center cursor-pointer"
          onClick={() => setZoomImg(null)}
        >
          <img
            src={zoomImg}
            alt="Zoom"
            className="max-w-[90vw] max-h-[85vh] rounded-xl shadow-2xl"
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Delete Trade-In</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete the trade-in for{' '}
              <span className="font-semibold">{deleteTarget.year} {deleteTarget.make} {deleteTarget.model}</span>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Review Modal
// ─────────────────────────────────────────────────────────────────────────────
function ReviewModal({ tradeIn, onClose, onSaved }) {
  const [offerAmount, setOfferAmount] = useState(tradeIn.offer_amount || '');
  const [adminNotes, setAdminNotes] = useState(tradeIn.admin_notes || '');
  const [customerMessage, setCustomerMessage] = useState('');
  const [status, setStatus] = useState(tradeIn.status);
  const [saving, setSaving] = useState(false);
  const [sendingOffer, setSendingOffer] = useState(false);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [zoomImg, setZoomImg] = useState(null);

  const photos = [
    { label: 'Front', url: tradeIn.front_photo },
    { label: 'Back', url: tradeIn.back_photo },
    { label: 'Side', url: tradeIn.side_photo },
    { label: 'Interior', url: tradeIn.interior_photo },
  ].filter((p) => p.url);

  const saveValuation = async () => {
    setError('');
    if (!offerAmount && status === 'OFFERED') {
      setError('Offer amount is required when setting status to Offered.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        offer_amount: offerAmount || null,
        admin_notes: adminNotes,
        status,
      };
      const updated = await api.patch(`/crm/trade-ins/${tradeIn.id}/`, payload);
      onSaved(updated);
    } catch (err) {
      setError(err?.message || 'Failed to save valuation.');
    } finally {
      setSaving(false);
    }
  };

  const sendOffer = async () => {
    setError('');
    if (!offerAmount) {
      setError('Offer amount is required to send an offer.');
      return;
    }
    setSendingOffer(true);
    try {
      const payload = {
        offer_amount: offerAmount,
        custom_message: customerMessage,
      };
      const updated = await api.post(`/crm/trade-ins/${tradeIn.id}/send_offer/`, payload);
      setSuccessToast(`Offer sent to ${tradeIn.email}!`);
      setTimeout(() => {
        onSaved(updated);
      }, 1800);
    } catch (err) {
      setError(err?.message || 'Failed to send offer.');
    } finally {
      setSendingOffer(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Car className="w-5 h-5 text-brand-600" />
              {tradeIn.year} {tradeIn.make} {tradeIn.model}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Vehicle specs */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Vehicle Specs</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Spec label="VIN" value={tradeIn.vin || '—'} />
                <Spec label="Year" value={tradeIn.year} />
                <Spec label="Make" value={tradeIn.make} />
                <Spec label="Model" value={tradeIn.model} />
                <Spec label="Mileage" value={`${Number(tradeIn.mileage).toLocaleString()} mi`} />
                <Spec label="Condition" value={tradeIn.condition_display || tradeIn.condition} />
              </div>
            </div>

            {/* Customer */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Customer</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Spec label="Name" value={tradeIn.name} />
                <Spec label="Email" value={tradeIn.email} />
                <Spec label="Phone" value={tradeIn.phone || '—'} />
              </div>
            </div>

            {/* Photos grid */}
            {photos.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Photos</h4>
                <div className="grid grid-cols-2 gap-3">
                  {photos.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setZoomImg(p.url)}
                      className="rounded-xl overflow-hidden border border-gray-100 hover:ring-2 hover:ring-brand-600/30 transition"
                    >
                      <img
                        src={p.url}
                        alt={p.label}
                        className="w-full h-36 object-cover"
                      />
                      <p className="text-xs text-gray-500 py-1 text-center bg-gray-50">
                        {p.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            {/* Auto-estimate reference (internal) */}
            {tradeIn.estimated_value && (
              <div className="border border-amber-200 bg-amber-50 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs uppercase tracking-wide text-amber-800 font-semibold">
                    Auto-Estimate (Internal Reference)
                  </p>
                  {tradeIn.valuation_method && (
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-semibold">
                      {tradeIn.valuation_method === 'marketcheck'
                        ? 'MarketCheck'
                        : 'Heuristic'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-amber-900">
                  System suggests <span className="font-semibold">
                    ${Number(tradeIn.estimated_value_low).toLocaleString()} – ${Number(tradeIn.estimated_value_high).toLocaleString()}
                  </span>{' '}
                  (mid <span className="font-semibold">${Number(tradeIn.estimated_value).toLocaleString()}</span>).
                </p>
                <p className="text-xs text-amber-700/80 mt-1">
                  {tradeIn.valuation_method === 'marketcheck'
                    ? 'Based on US used-car market data, converted to CAD with a wholesale haircut. Use as a starting point — your final offer should reflect a physical inspection.'
                    : 'Heuristic based on year, mileage, and condition (MarketCheck data unavailable for this vehicle). Use as a starting point — your final offer should reflect a physical inspection.'}
                </p>
              </div>
            )}

            {/* Valuation form */}
            <div className="border-t border-gray-100 pt-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-brand-600" /> Valuation
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Offer Amount ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="OFFERED">Offered</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Message to Customer (shown for PENDING trade-ins) */}
              {tradeIn.status === 'PENDING' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message to Customer (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={customerMessage}
                    onChange={(e) => setCustomerMessage(e.target.value)}
                    placeholder="Add a personal note to include in the offer email…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none resize-none"
                  />
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Notes
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes about this trade-in…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Success Toast */}
          {successToast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-bounce">
              <CheckCircle className="w-4 h-4" /> {successToast}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl sticky bottom-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>

            {/* Send Offer button — shown for PENDING trade-ins */}
            {tradeIn.status === 'PENDING' && (
              <button
                onClick={sendOffer}
                disabled={sendingOffer}
                className="flex items-center gap-2 bg-brand-600 hover:bg-[#e65100] text-white px-5 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
              >
                {sendingOffer ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                ✉️ Send Offer to Customer
              </button>
            )}

            <button
              onClick={saveValuation}
              disabled={saving}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Valuation
            </button>
          </div>
        </div>
      </div>

      {/* Photo zoom overlay */}
      {zoomImg && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center cursor-pointer"
          onClick={() => setZoomImg(null)}
        >
          <img
            src={zoomImg}
            alt="Zoom"
            className="max-w-[90vw] max-h-[85vh] rounded-xl shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function Spec({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-slate-700">{value}</p>
    </div>
  );
}
