import { useState, useEffect, useCallback } from 'react';
import {
  Star, CheckCircle2, XCircle, Loader2, Plus, MessageSquareQuote,
  Globe, Facebook, Monitor, Trash2, ArrowRight,
} from 'lucide-react';
import api from '../../services/api';

const SOURCE_ICONS = {
  WEBSITE: Monitor,
  GOOGLE: Globe,
  FACEBOOK: Facebook,
};

const SOURCE_COLORS = {
  WEBSITE: 'text-brand-600',
  GOOGLE: 'text-[#4285F4]',
  FACEBOOK: 'text-[#1877F2]',
};

const Stars = ({ count, size = 'w-4 h-4' }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`${size} ${i <= count ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
      />
    ))}
  </div>
);

export default function AdminReviews() {
  /* ─── state ──────────────────────────────────────────── */
  const [tab, setTab] = useState('moderation');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg] = useState(null);

  // Import form state
  const [importForm, setImportForm] = useState({
    customer_name: '',
    rating: 5,
    review_text: '',
    source: 'GOOGLE',
  });
  const [importing, setImporting] = useState(false);

  /* ─── fetch reviews ──────────────────────────────────── */
  const fetchReviews = useCallback(async (statusFilter) => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `/config/testimonials/?status=${statusFilter}`
        : '/config/testimonials/';
      const res = await api.get(url);
      setReviews(Array.isArray(res) ? res : res.results || []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews(tab === 'moderation' ? 'PENDING' : null);
  }, [tab, fetchReviews]);

  /* ─── approve / reject ───────────────────────────────── */
  const handleModerate = async (id, newStatus) => {
    setActionLoading(id);
    setMsg(null);
    try {
      await api.patch(`/config/testimonials/${id}/`, { status: newStatus });
      setMsg({
        type: 'success',
        text: `Review ${newStatus === 'APPROVED' ? 'approved' : 'rejected'} successfully.`,
      });
      fetchReviews('PENDING');
    } catch {
      setMsg({ type: 'error', text: 'Failed to update review.' });
    } finally {
      setActionLoading(null);
    }
  };

  /* ─── delete ─────────────────────────────────────────── */
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review permanently?')) return;
    setActionLoading(id);
    try {
      await api.delete(`/config/testimonials/${id}/`);
      setMsg({ type: 'success', text: 'Review deleted.' });
      fetchReviews(tab === 'moderation' ? 'PENDING' : null);
    } catch {
      setMsg({ type: 'error', text: 'Failed to delete review.' });
    } finally {
      setActionLoading(null);
    }
  };

  /* ─── import external review ─────────────────────────── */
  const handleImport = async (e) => {
    e.preventDefault();
    setImporting(true);
    setMsg(null);
    try {
      await api.post('/config/testimonials/import/', importForm);
      setMsg({ type: 'success', text: 'External review imported and auto-approved!' });
      setImportForm({ customer_name: '', rating: 5, review_text: '', source: 'GOOGLE' });
      fetchReviews(null);
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.response?.data?.source?.[0] || 'Import failed.';
      setMsg({ type: 'error', text: typeof detail === 'string' ? detail : 'Import failed.' });
    } finally {
      setImporting(false);
    }
  };

  /* ═══════════════════ RENDER ═══════════════════════════ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <MessageSquareQuote className="w-7 h-7 text-brand-600" />
          Reviews & Testimonials
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Moderate website reviews and import your best Google & Facebook reviews
        </p>
      </div>

      {/* Feedback */}
      {msg && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
            msg.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0" />
          )}
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('moderation')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'moderation'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Moderation Queue
        </button>
        <button
          onClick={() => setTab('import')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'import'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Plus className="w-4 h-4 inline mr-1 -mt-0.5" />
          Add External Review
        </button>
      </div>

      {/* ── Tab 1: Moderation Queue ─────────────────────── */}
      {tab === 'moderation' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-slate-800">
              Pending Website Reviews
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Approve or reject reviews submitted by customers on your website
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-gray-500">All caught up!</p>
              <p className="text-sm mt-1">No pending reviews to moderate.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {reviews.map((r) => {
                const SrcIcon = SOURCE_ICONS[r.source] || Monitor;
                const isActioning = actionLoading === r.id;

                return (
                  <div key={r.id} className="px-6 py-5 hover:bg-gray-50/60 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Review content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-slate-800">{r.customer_name}</span>
                          <Stars count={r.rating} />
                          <span className={`flex items-center gap-1 text-xs font-medium ${SOURCE_COLORS[r.source]}`}>
                            <SrcIcon className="w-3.5 h-3.5" />
                            {r.source_display}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed">{r.review_text}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(r.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </p>
                      </div>

                      {/* Right: Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleModerate(r.id, 'APPROVED')}
                          disabled={isActioning}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium 
                            bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 
                            disabled:opacity-50 transition-colors"
                        >
                          {isActioning ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => handleModerate(r.id, 'REJECTED')}
                          disabled={isActioning}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium 
                            bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 
                            disabled:opacity-50 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={isActioning}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 
                            disabled:opacity-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Import External Review ───────────────── */}
      {tab === 'import' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Import Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Import a Review</h2>
            <p className="text-sm text-gray-500 mb-6">
              Copy-paste your best Google or Facebook reviews. They will be auto-approved.
            </p>

            <form onSubmit={handleImport} className="space-y-5">
              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Source</label>
                <div className="flex gap-3">
                  {['GOOGLE', 'FACEBOOK'].map((src) => {
                    const Icon = SOURCE_ICONS[src];
                    const isActive = importForm.source === src;
                    return (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setImportForm((f) => ({ ...f, source: src }))}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                          isActive
                            ? src === 'GOOGLE'
                              ? 'bg-blue-50 text-[#4285F4] border-blue-200'
                              : 'bg-blue-50 text-[#1877F2] border-blue-200'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {src === 'GOOGLE' ? 'Google' : 'Facebook'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Customer Name
                </label>
                <input
                  type="text"
                  required
                  value={importForm.customer_name}
                  onChange={(e) => setImportForm((f) => ({ ...f, customer_name: e.target.value }))}
                  placeholder="e.g. Sarah M."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
                />
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Rating
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setImportForm((f) => ({ ...f, rating: val }))}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          val <= importForm.rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Review Text
                </label>
                <textarea
                  required
                  rows={4}
                  value={importForm.review_text}
                  onChange={(e) => setImportForm((f) => ({ ...f, review_text: e.target.value }))}
                  placeholder="Paste the customer's review here..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 resize-none"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={importing}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm w-full justify-center"
              >
                {importing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
                {importing ? 'Importing…' : 'Import & Auto-Approve'}
              </button>
            </form>
          </div>

          {/* Recently imported / all approved */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-slate-800">All Approved Reviews</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                These are visible on your homepage carousel
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              </div>
            ) : reviews.filter((r) => r.status === 'APPROVED').length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <MessageSquareQuote className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No approved reviews yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
                {reviews
                  .filter((r) => r.status === 'APPROVED')
                  .map((r) => {
                    const SrcIcon = SOURCE_ICONS[r.source] || Monitor;
                    return (
                      <div key={r.id} className="px-6 py-4 hover:bg-gray-50/60 transition-colors">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-semibold text-sm text-slate-800">{r.customer_name}</span>
                          <Stars count={r.rating} size="w-3.5 h-3.5" />
                          <span className={`flex items-center gap-1 text-xs ${SOURCE_COLORS[r.source]}`}>
                            <SrcIcon className="w-3 h-3" />
                            {r.source_display}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{r.review_text}</p>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
