import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, Phone, Mail, MapPin, Star,
  DollarSign, Wrench, TrendingUp, Calendar, Car,
  ExternalLink, Loader2, AlertCircle, CheckCircle,
  CreditCard, Landmark, Clock, FileText, Check, X,
} from 'lucide-react';
import api from '../../services/api';

/* ── helpers ──────────────────────────────────────────────── */

const fmt = (v) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v || 0);

const fmtFull = (v) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2,
  }).format(v || 0);

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

const PAYMENT_TERMS_LABELS = {
  DUE_ON_RECEIPT: 'Due on Receipt',
  NET_15: 'Net 15',
  NET_30: 'Net 30',
  NET_60: 'Net 60',
};

const PAYMENT_METHOD_LABELS = {
  CHECK: 'Check',
  WIRE: 'Wire Transfer',
  ACH: 'ACH',
  CASH: 'Cash',
};

const CATEGORY_CONFIG = {
  MECHANIC: { label: 'Mechanic / Repair Shop', icon: '🔧', color: 'bg-amber-100 text-amber-700' },
  BODY_SHOP: { label: 'Body Shop / Paint', icon: '🎨', color: 'bg-pink-100 text-pink-700' },
  TRANSPORTER: { label: 'Transporter / Shipping', icon: '🚚', color: 'bg-blue-100 text-blue-700' },
  DMV_TITLE: { label: 'DMV / Title Services', icon: '📋', color: 'bg-purple-100 text-purple-700' },
  DETAILING: { label: 'Detailing / Cleaning', icon: '✨', color: 'bg-cyan-100 text-cyan-700' },
  PARTS: { label: 'Parts Supplier', icon: '⚙️', color: 'bg-slate-100 text-slate-700' },
  OTHER: { label: 'Other', icon: '📦', color: 'bg-gray-100 text-gray-700' },
};

const StarRating = ({ rating, size = 'md' }) => {
  const cls = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${cls} ${s <= rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
        />
      ))}
    </div>
  );
};

/* ── tab config ───────────────────────────────────────────── */
const TABS = [
  { id: 'profile', label: 'Profile', icon: Building2 },
  { id: 'jobs', label: 'Job History', icon: Wrench },
  { id: 'financials', label: 'Financials', icon: DollarSign },
];

/* ════════════════════════════════════════════════════════════ */
export default function AdminVendorDetail() {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [stats, setStats] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('profile');
  const [toast, setToast] = useState(null);
  const [markingPaid, setMarkingPaid] = useState(null);

  /* ── fetch all data in parallel ─────────────────────────── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [vendorData, statsData, expData] = await Promise.all([
        api.get(`/financials/vendors/${id}/`),
        api.get(`/financials/vendors/${id}/stats/`),
        api.get(`/financials/expenses/?vendor=${id}`),
      ]);
      setVendor(vendorData);
      setStats(statsData);
      setExpenses(Array.isArray(expData) ? expData : (expData.results || []));
    } catch (err) {
      console.error('Failed to load vendor:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── mark expense as paid ───────────────────────────────── */
  const handleMarkPaid = async (expenseId) => {
    setMarkingPaid(expenseId);
    try {
      await api.patch(`/financials/expenses/${expenseId}/`, {
        is_paid: true,
        paid_date: new Date().toISOString().split('T')[0],
      });
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === expenseId
            ? { ...e, is_paid: true, paid_date: new Date().toISOString().split('T')[0] }
            : e,
        ),
      );
      setToast('Marked as paid');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Mark paid failed:', err);
    } finally {
      setMarkingPaid(null);
    }
  };

  /* ── derived ────────────────────────────────────────────── */
  const totalBilled = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const outstanding = expenses
    .filter((e) => !e.is_paid)
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-32">
        <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
        <p className="text-lg font-medium text-gray-700">Vendor not found</p>
        <Link to="/admin/vendors" className="text-sm text-brand-600 mt-2 inline-block">← Back to Vendors</Link>
      </div>
    );
  }

  const catConfig = CATEGORY_CONFIG[vendor.service_category] || CATEGORY_CONFIG.OTHER;

  return (
    <div className="space-y-6">
      {/* ── Back + Header ─────────────────────────────────── */}
      <div>
        <Link
          to="/admin/vendors"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Vendors
        </Link>

        <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{vendor.name}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${catConfig.color}`}>
                {catConfig.icon} {catConfig.label}
              </span>
              <StarRating rating={vendor.rating} size="sm" />
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${vendor.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-500/20 text-gray-400'}`}>
                {vendor.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-bold">{fmt(stats?.total_spend)}</p>
              <p className="text-xs text-slate-400">Total Spend</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.job_count || 0}</p>
              <p className="text-xs text-slate-400">Jobs</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{fmt(stats?.average_job_cost)}</p>
              <p className="text-xs text-slate-400">Avg Cost</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ───────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">

        {/* ═══ TAB: Profile ══════════════════════════════════ */}
        {tab === 'profile' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Contact Info */}
            <div className="rounded-xl border border-gray-100 p-6 space-y-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Building2 size={18} /> Contact Information
              </h3>
              {vendor.phone && (
                <a href={`tel:${vendor.phone}`} className="flex items-center gap-3 text-gray-600 hover:text-brand-600">
                  <Phone size={16} /> {vendor.phone}
                </a>
              )}
              {vendor.email && (
                <a href={`mailto:${vendor.email}`} className="flex items-center gap-3 text-gray-600 hover:text-brand-600">
                  <Mail size={16} /> {vendor.email}
                </a>
              )}
              {vendor.address && (
                <div className="flex items-start gap-3 text-gray-600">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                  <span className="whitespace-pre-line">{vendor.address}</span>
                </div>
              )}
              {vendor.notes && (
                <div className="pt-3 border-t border-gray-100 text-sm text-gray-500">
                  <p className="font-medium text-gray-700 mb-1">Notes</p>
                  {vendor.notes}
                </div>
              )}
            </div>

            {/* Financial / Payment Info */}
            <div className="rounded-xl border border-gray-100 p-6 space-y-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Landmark size={18} /> Financial Details
              </h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Tax ID</p>
                  <p className="font-medium text-gray-800">{vendor.tax_id || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Payment Terms</p>
                  <p className="font-medium text-gray-800">
                    {PAYMENT_TERMS_LABELS[vendor.payment_terms] || vendor.payment_terms || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Payment Method</p>
                  <p className="font-medium text-gray-800 flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                    {PAYMENT_METHOD_LABELS[vendor.preferred_payment_method] || vendor.preferred_payment_method || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Last Job</p>
                  <p className="font-medium text-gray-800">{fmtDate(stats?.last_job_date)}</p>
                </div>
              </div>

              {vendor.account_details && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Bank / Account Details</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 rounded-lg p-3 font-mono">
                    {vendor.account_details}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB: Job History ══════════════════════════════ */}
        {tab === 'jobs' && (
          <>
            {expenses.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Wrench className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p>No jobs recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Date</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Vehicle</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Service</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Amount</th>
                      <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-600">{fmtDate(exp.date)}</td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/admin/financials?vehicle=${exp.vehicle}`}
                            className="text-sm font-medium text-gray-900 hover:text-brand-600 flex items-center gap-1"
                          >
                            <Car size={14} className="flex-shrink-0" /> {exp.vehicle_title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[200px]">
                          {exp.service_type_display || exp.category_display}
                          {exp.description && <span className="text-gray-400"> — {exp.description}</span>}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{fmtFull(exp.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            exp.is_paid
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {exp.is_paid ? <><Check size={12} /> Paid</> : <><Clock size={12} /> Unpaid</>}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ═══ TAB: Financials ══════════════════════════════ */}
        {tab === 'financials' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                    <DollarSign className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-700">{fmt(totalBilled)}</p>
                    <p className="text-sm text-emerald-600">Total Billed (All Time)</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-red-50 border border-red-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100">
                    <Clock className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-700">{fmt(outstanding)}</p>
                    <p className="text-sm text-red-600">Outstanding Balance</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-blue-50 border border-blue-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-700">{fmt(stats?.average_job_cost)}</p>
                    <p className="text-sm text-blue-600">Avg Job Cost</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText size={18} /> Invoices &amp; Bills
                </h3>
                <span className="text-xs text-gray-500">
                  {expenses.filter((e) => !e.is_paid).length} unpaid
                </span>
              </div>

              {expenses.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <FileText className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                  <p>No invoices recorded</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">Date</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">Vehicle</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">Description</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase px-5 py-3">Amount</th>
                        <th className="text-center text-xs font-semibold text-gray-500 uppercase px-5 py-3">Status</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {expenses.map((exp) => (
                        <tr
                          key={exp.id}
                          className={`hover:bg-gray-50 transition-colors ${!exp.is_paid ? 'bg-red-50/30' : ''}`}
                        >
                          <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(exp.date)}</td>
                          <td className="px-5 py-3">
                            <Link
                              to={`/admin/financials?vehicle=${exp.vehicle}`}
                              className="text-sm font-medium text-gray-900 hover:text-brand-600 flex items-center gap-1"
                            >
                              <Car size={14} className="flex-shrink-0" />
                              {exp.vehicle_title}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-600 truncate max-w-[220px]">
                            {exp.service_type_display || exp.category_display}
                            {exp.description && <span className="text-gray-400"> — {exp.description}</span>}
                          </td>
                          <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right whitespace-nowrap">
                            {fmtFull(exp.amount)}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              exp.is_paid
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {exp.is_paid ? (
                                <><CheckCircle size={12} /> Paid</>
                              ) : (
                                <><Clock size={12} /> Unpaid</>
                              )}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            {!exp.is_paid && (
                              <button
                                onClick={() => handleMarkPaid(exp.id)}
                                disabled={markingPaid === exp.id}
                                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800 
                                  bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {markingPaid === exp.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Check size={12} />
                                )}
                                Mark Paid
                              </button>
                            )}
                            {exp.is_paid && exp.paid_date && (
                              <span className="text-xs text-gray-400">{fmtDate(exp.paid_date)}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Toast ──────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 
          rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800 shadow-lg text-sm font-medium">
          <CheckCircle className="h-4 w-4" />
          {toast}
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
