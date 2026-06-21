import { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, X, Eye, DollarSign, Loader2,
  CheckCircle, AlertCircle, Clock, XCircle, ChevronLeft,
  ChevronRight, CreditCard, Banknote, Landmark, ArrowLeft,
  TrendingUp, Calendar, Hash, Receipt, FileText, ArrowRightLeft,
  User as UserIcon, Mail, Phone, Briefcase, Trash2,
} from 'lucide-react';
import api from '../../services/api';

/* ────────────────────── status badge config ───────────────── */
const STATUS_MAP = {
  ACTIVE:      { label: 'Active',      color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  PAID_OFF:    { label: 'Paid Off',    color: 'bg-blue-100 text-blue-700',    icon: CheckCircle },
  DEFAULTED:   { label: 'Defaulted',   color: 'bg-red-100 text-red-700',      icon: XCircle },
  REPOSSESSED: { label: 'Repossessed', color: 'bg-gray-100 text-gray-700',    icon: AlertCircle },
};

const METHOD_ICONS = {
  CASH:          Banknote,
  CARD:          CreditCard,
  BANK_TRANSFER: Landmark,
};

/* ════════════════════════════════════════════════════════════ */
/*                     MAIN COMPONENT                         */
/* ════════════════════════════════════════════════════════════ */
export default function AdminLoanManager() {
  /* ── Tab state ─────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState('loans'); // 'loans' | 'applications'

  /* ── List-view state ───────────────────────────────────── */
  const [loans, setLoans]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');
  const [search, setSearch]   = useState('');

  /* ── Pending Applications state ────────────────────────── */
  const [applications, setApplications]   = useState([]);
  const [appsLoading, setAppsLoading]     = useState(false);
  const [appsSearch, setAppsSearch]       = useState('');

  /* ── Convert to Loan modal ─────────────────────────────── */
  const [convertModal, setConvertModal]       = useState(false);
  const [convertLead, setConvertLead]         = useState(null);
  const [convertForm, setConvertForm]         = useState({
    principal_amount: '', admin_fee: '', interest_rate: '', term_months: '', start_date: '',
  });
  const [convertSubmitting, setConvertSubmitting] = useState(false);

  /* ── Detail-view state ─────────────────────────────────── */
  const [selectedLoan, setSelectedLoan] = useState(null);   // full loan w/ installments
  const [detailLoading, setDetailLoading] = useState(false);

  /* ── Delete state ──────────────────────────────────────── */
  const [deleteTarget, setDeleteTarget] = useState(null);   // { id, label, endpoint }
  const [deleting, setDeleting]         = useState(false);

  /* ── Payment modal ─────────────────────────────────────── */
  const [payModal, setPayModal]         = useState(false);
  const [payAmount, setPayAmount]       = useState('');
  const [payMethod, setPayMethod]       = useState('CASH');
  const [payNotes, setPayNotes]         = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  /* ── Fetch loan list ───────────────────────────────────── */
  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : '';
      const res = await api.get(`/loans/loans/${params}`);
      setLoans(res.results || res);
    } catch {
      console.error('Failed to load loans');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchLoans(); }, [filter, fetchLoans]);

  /* ── Fetch financing applications ──────────────────────── */
  const fetchApplications = useCallback(async () => {
    setAppsLoading(true);
    try {
      const res = await api.get('/crm/leads/?lead_type=FINANCING');
      setApplications(res.results || res);
    } catch {
      console.error('Failed to load financing applications');
    } finally {
      setAppsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'applications') fetchApplications();
  }, [activeTab, fetchApplications]);

  /* ── Open Convert-to-Loan modal ────────────────────────── */
  const openConvert = (lead) => {
    setConvertLead(lead);
    const today = new Date().toISOString().split('T')[0];
    setConvertForm({
      principal_amount: lead.max_budget || '',
      admin_fee: '',
      interest_rate: '',
      term_months: '',
      start_date: today,
    });
    setConvertModal(true);
  };

  const closeConvert = () => {
    setConvertModal(false);
    setConvertLead(null);
    setConvertForm({ principal_amount: '', admin_fee: '', interest_rate: '', term_months: '', start_date: '' });
  };

  /* ── Submit convert-to-loan ────────────────────────────── */
  const handleConvert = async () => {
    const { principal_amount, admin_fee, interest_rate, term_months, start_date } = convertForm;
    if (!principal_amount || !interest_rate || !term_months || !start_date) {
      alert('Please fill in all fields');
      return;
    }
    setConvertSubmitting(true);
    try {
      await api.post('/loans/loans/', {
        customer: convertLead.id,
        principal_amount,
        admin_fee: admin_fee || '0',
        interest_rate,
        term_months: parseInt(term_months),
        start_date,
      });
      // Mark lead as CLOSED
      await api.patch(`/crm/leads/${convertLead.id}/`, { status: 'CLOSED' });
      closeConvert();
      fetchApplications();
      fetchLoans();
    } catch (err) {
      alert(err?.response?.data?.detail || err.message || 'Failed to create loan');
    } finally {
      setConvertSubmitting(false);
    }
  };

  /* ── Fetch single loan detail ──────────────────────────── */
  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      const data = await api.get(`/loans/loans/${id}/`);
      setSelectedLoan(data);
    } catch {
      console.error('Failed to load loan detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setSelectedLoan(null);

  /* ── Submit payment ────────────────────────────────────── */
  const handlePay = async () => {
    if (!payAmount || Number(payAmount) <= 0) return;
    setPaySubmitting(true);
    try {
      const res = await api.post(`/loans/loans/${selectedLoan.id}/make-payment/`, {
        amount: payAmount,
        method: payMethod,
        notes: payNotes,
      });
      // Refresh the detail with the returned loan snapshot
      setSelectedLoan(res.loan);
      // Also refresh list in background
      fetchLoans();
      closePayModal();
    } catch (err) {
      alert(err.message || 'Payment failed');
    } finally {
      setPaySubmitting(false);
    }
  };

  const openPayModal = ()  => setPayModal(true);
  const closePayModal = () => {
    setPayModal(false);
    setPayAmount('');
    setPayMethod('CASH');
    setPayNotes('');
  };

  /* ── Delete handler ────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(deleteTarget.endpoint);
      if (deleteTarget.type === 'loan') {
        setLoans(prev => prev.filter(l => l.id !== deleteTarget.id));
      } else {
        setApplications(prev => prev.filter(a => a.id !== deleteTarget.id));
      }
      setDeleteTarget(null);
    } catch {
      console.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  /* ── Helpers ───────────────────────────────────────────── */
  const isOverdue = (nextDueDate) => {
    if (!nextDueDate) return false;
    return new Date(nextDueDate) < new Date();
  };

  const fmt = (v) =>
    Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  /* ── Search filter (client-side on already-fetched list) ── */
  const filtered = loans.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.customer_name?.toLowerCase().includes(q) ||
      l.vehicle_title?.toLowerCase().includes(q)
    );
  });

  const filteredApps = applications.filter((a) => {
    if (!appsSearch) return true;
    const q = appsSearch.toLowerCase();
    return (
      a.customer_name?.toLowerCase().includes(q) ||
      a.customer_email?.toLowerCase().includes(q) ||
      a.notes?.toLowerCase().includes(q) ||
      a.desired_make?.toLowerCase().includes(q) ||
      a.desired_model?.toLowerCase().includes(q)
    );
  });

  /* ════════════════════════════════════════════════════════ */
  /*                  DETAIL / LEDGER VIEW                   */
  /* ════════════════════════════════════════════════════════ */
  if (selectedLoan) {
    const loan = selectedLoan;
    const totalDue = loan.installments?.reduce(
      (s, i) => s + Number(i.amount_due) + Number(i.penalty_fee), 0
    ) || 0;
    const totalPaid = Number(loan.total_paid || 0);
    const pct = totalDue > 0 ? Math.min((totalPaid / totalDue) * 100, 100) : 0;

    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={closeDetail}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Loans
        </button>

        {/* ─── Loan Summary Header ──────────────────────── */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Loan #{loan.id} — {loan.customer_name || 'Customer'}
              </h2>
              <p className="text-gray-500 text-sm mt-0.5">{loan.vehicle_title || 'Vehicle'}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_MAP[loan.status]?.color || 'bg-gray-100 text-gray-600'}`}>
              {STATUS_MAP[loan.status]?.label || loan.status}
            </span>
          </div>

          {/* Summary chips */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Principal',   value: fmt(loan.principal_amount), icon: DollarSign },
              { label: 'Monthly Pmt', value: fmt(loan.monthly_payment),  icon: Calendar },
              { label: 'Interest',    value: `${loan.interest_rate}%`,   icon: TrendingUp },
              { label: 'Term',        value: `${loan.term_months} mo`,   icon: Hash },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                <div className="rounded-lg bg-brand-600/10 p-2">
                  <c.icon className="h-4 w-4 text-brand-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">{c.label}</p>
                  <p className="text-sm font-bold text-slate-800">{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Admin fee + effective total row */}
          {Number(loan.admin_fee || 0) > 0 && (
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-4 py-2 text-sm">
                <span className="text-amber-600 font-medium">Admin Fee:</span>
                <span className="font-bold text-slate-800">{fmt(loan.admin_fee)}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-4 py-2 text-sm">
                <span className="text-amber-600 font-medium">Total Financed:</span>
                <span className="font-bold text-slate-800">{fmt(loan.effective_principal)}</span>
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-500">
                Total Paid: <span className="font-semibold text-slate-700">{fmt(totalPaid)}</span>
              </span>
              <span className="text-gray-500">
                Total Due: <span className="font-semibold text-slate-700">{fmt(totalDue)}</span>
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-right text-xs text-gray-400 mt-1">{pct.toFixed(1)}% paid</p>
          </div>
        </div>

        {/* ─── Record Payment Button ───────────────────────── */}
        {loan.status === 'ACTIVE' && (
          <div className="flex justify-end">
            <button
              onClick={openPayModal}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 transition-colors"
            >
              <Receipt className="h-4 w-4" /> Record Payment
            </button>
          </div>
        )}

        {/* ─── Installment Table ───────────────────────────── */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-bold text-slate-800">Amortization Schedule</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left">#</th>
                  <th className="px-6 py-3 text-left">Due Date</th>
                  <th className="px-6 py-3 text-right">Expected</th>
                  <th className="px-6 py-3 text-right">Paid</th>
                  <th className="px-6 py-3 text-right">Balance</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(loan.installments || []).map((inst) => {
                  const owed = Number(inst.amount_due) + Number(inst.penalty_fee);
                  const paid = Number(inst.amount_paid);
                  const balance = Math.max(owed - paid, 0);
                  const overdue = !inst.is_paid && new Date(inst.due_date) < new Date();

                  return (
                    <tr
                      key={inst.id}
                      className={`${overdue ? 'bg-red-50/60' : ''} hover:bg-gray-50/60 transition-colors`}
                    >
                      <td className="px-6 py-3 text-gray-500 font-medium">{inst.installment_number}</td>
                      <td className={`px-6 py-3 font-medium ${overdue ? 'text-red-600' : 'text-slate-700'}`}>
                        {fmtDate(inst.due_date)}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-700">{fmt(owed)}</td>
                      <td className="px-6 py-3 text-right text-slate-700">{fmt(paid)}</td>
                      <td className="px-6 py-3 text-right font-semibold text-slate-800">{fmt(balance)}</td>
                      <td className="px-6 py-3 text-center">
                        {inst.is_paid ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
                            <CheckCircle className="h-3 w-3" /> Paid
                          </span>
                        ) : overdue ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
                            <AlertCircle className="h-3 w-3" /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Payment Modal ───────────────────────────────── */}
        {payModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h3 className="text-lg font-bold text-slate-800">Record Payment</h3>
                <button onClick={closePayModal} className="rounded-lg p-1 hover:bg-gray-100 transition-colors">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder={`Monthly: ${fmt(loan.monthly_payment)}`}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
                    />
                  </div>
                  {/* Quick-fill buttons */}
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setPayAmount(Number(loan.monthly_payment).toFixed(2))}
                      className="text-xs px-3 py-1 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors font-medium"
                    >
                      1× Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayAmount((Number(loan.monthly_payment) * 2).toFixed(2))}
                      className="text-xs px-3 py-1 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors font-medium"
                    >
                      2× Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayAmount(Number(loan.remaining_balance).toFixed(2))}
                      className="text-xs px-3 py-1 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors font-medium"
                    >
                      Pay Off
                    </button>
                  </div>
                </div>

                {/* Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'CASH', label: 'Cash', Icon: Banknote },
                      { value: 'CARD', label: 'Card', Icon: CreditCard },
                      { value: 'BANK_TRANSFER', label: 'Transfer', Icon: Landmark },
                    ].map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPayMethod(value)}
                        className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-medium transition-all ${
                          payMethod === value
                            ? 'border-brand-600 bg-brand-600/5 text-brand-600'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <textarea
                    rows={2}
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 resize-none"
                    placeholder="e.g. partial payment, late fee waived…"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                <button
                  onClick={closePayModal}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePay}
                  disabled={paySubmitting || !payAmount || Number(payAmount) <= 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {paySubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  {paySubmitting ? 'Processing…' : 'Submit Payment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════ */
  /*                    LIST VIEW                            */
  /* ════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Loan Manager</h1>
          <p className="text-gray-500 text-sm mt-0.5">Buy-Here-Pay-Here loan portfolio</p>
        </div>
        <button
          onClick={activeTab === 'loans' ? fetchLoans : fetchApplications}
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading || appsLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* ── Tab Switch ─────────────────────────────────────── */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('loans')}
          className={`relative px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'loans'
              ? 'text-brand-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Active Loans
          </span>
          {activeTab === 'loans' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`relative px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'applications'
              ? 'text-brand-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Pending Applications
            {applications.filter(a => a.status === 'NEW').length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold">
                {applications.filter(a => a.status === 'NEW').length}
              </span>
            )}
          </span>
          {activeTab === 'applications' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/*                ACTIVE LOANS TAB                       */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === 'loans' && (
        <>
      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2">
          {['', 'ACTIVE', 'PAID_OFF', 'DEFAULTED', 'REPOSSESSED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                filter === s
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {s === '' ? 'All' : STATUS_MAP[s]?.label || s}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative sm:ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customer or vehicle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <DollarSign className="h-12 w-12 mb-3 opacity-40" />
            <p className="font-medium">No loans found</p>
            <p className="text-sm mt-1">Loans are created automatically when a deal is accepted.</p>
          </div>
        ) : (
          <table className="w-full block md:table text-sm">
            <thead className="hidden md:table-header-group bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Customer</th>
                <th className="px-6 py-3 text-left">Vehicle</th>
                <th className="px-6 py-3 text-right">Principal</th>
                <th className="px-6 py-3 text-right">Balance</th>
                <th className="px-6 py-3 text-left">Next Due</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group">
              {filtered.map((loan) => {
                const overdue = loan.status === 'ACTIVE' && isOverdue(loan.next_due_date);
                const sMeta = STATUS_MAP[loan.status] || {};

                return (
                  <tr
                    key={loan.id}
                    className={`block md:table-row bg-white border border-gray-200 md:border-b md:border-x-0 md:border-t-0 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none p-4 md:p-0 ${overdue ? 'md:bg-red-50/70' : ''} hover:bg-gray-50/60 transition-colors`}
                  >
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Customer</span>
                      <span className="font-medium text-slate-800">{loan.customer_name || '—'}</span>
                    </td>
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Vehicle</span>
                      <span className="text-gray-600">{loan.vehicle_title || '—'}</span>
                    </td>
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Principal</span>
                      <span className="text-slate-700">{fmt(loan.principal_amount)}</span>
                    </td>
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Balance</span>
                      <span className="font-semibold text-slate-800">{fmt(loan.remaining_balance)}</span>
                    </td>
                    <td className={`flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm ${overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                      <span className="md:hidden font-semibold text-gray-500">Next Due</span>
                      {loan.next_due_date ? (
                        <span className="inline-flex items-center gap-1.5">
                          {overdue && <AlertCircle className="h-3.5 w-3.5" />}
                          {fmtDate(loan.next_due_date)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Status</span>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${sMeta.color}`}>
                        {sMeta.label || loan.status}
                      </span>
                    </td>
                    <td className="flex justify-end gap-2 mt-2 md:mt-0 pt-2 md:pt-0 border-t border-gray-100 md:border-0 md:table-cell md:py-4 md:px-6 text-sm">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openDetail(loan.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: loan.id, label: `Loan #${loan.id} — ${loan.customer_name || 'Unknown'}`, endpoint: `/loans/loans/${loan.id}/`, type: 'loan' })}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Loan"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
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

      {/* Detail loading overlay */}
      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="rounded-2xl bg-white p-8 shadow-xl flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            <span className="text-sm font-medium text-slate-700">Loading loan ledger…</span>
          </div>
        </div>
      )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/*            PENDING APPLICATIONS TAB                   */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === 'applications' && (
        <>
          {/* Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative sm:ml-auto w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search applicant, email, vehicle…"
                value={appsSearch}
                onChange={(e) => setAppsSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
              />
              {appsSearch && (
                <button onClick={() => setAppsSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Applications Table */}
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            {appsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <FileText className="h-12 w-12 mb-3 opacity-40" />
                <p className="font-medium">No financing applications</p>
                <p className="text-sm mt-1">Financing applications submitted by customers will appear here.</p>
              </div>
            ) : (
              <table className="w-full block md:table text-sm">
                <thead className="hidden md:table-header-group bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-6 py-3 text-left">Applicant</th>
                    <th className="px-6 py-3 text-left">Contact</th>
                    <th className="px-6 py-3 text-left">Vehicle Interest</th>
                    <th className="px-6 py-3 text-right">Budget</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-left">Submitted</th>
                    <th className="px-6 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="block md:table-row-group">
                  {filteredApps.map((lead) => {
                    const isNew = lead.status === 'NEW';
                    const statusColors = {
                      NEW: 'bg-blue-100 text-blue-700',
                      HOT: 'bg-brand-100 text-brand-800',
                      COLD: 'bg-gray-100 text-gray-600',
                      CLOSED: 'bg-green-100 text-green-700',
                    };
                    return (
                      <tr
                        key={lead.id}
                        className={`block md:table-row bg-white border border-gray-200 md:border-b md:border-x-0 md:border-t-0 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none p-4 md:p-0 ${isNew ? 'md:bg-blue-50/40' : ''} hover:bg-gray-50/60 transition-colors`}
                      >
                        <td className="flex items-center gap-2 py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm font-medium text-slate-800">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <UserIcon className="h-4 w-4 text-gray-500" />
                          </div>
                          <span>{lead.customer_name || '—'}</span>
                        </td>
                        <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                          <span className="md:hidden font-semibold text-gray-500">Contact</span>
                          <div className="space-y-0.5">
                            {lead.customer_email && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <Mail className="h-3 w-3 text-gray-400" /> {lead.customer_email}
                              </div>
                            )}
                            {lead.customer_phone && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <Phone className="h-3 w-3 text-gray-400" /> {lead.customer_phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                          <span className="md:hidden font-semibold text-gray-500">Vehicle</span>
                          <span className="text-gray-600">{lead.desired_make || lead.desired_model
                            ? `${lead.desired_make || ''} ${lead.desired_model || ''}`.trim()
                            : '—'}</span>
                        </td>
                        <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                          <span className="md:hidden font-semibold text-gray-500">Budget</span>
                          <span className="text-slate-700">{lead.max_budget ? fmt(lead.max_budget) : '—'}</span>
                        </td>
                        <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                          <span className="md:hidden font-semibold text-gray-500">Status</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[lead.status] || 'bg-gray-100 text-gray-600'}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                          <span className="md:hidden font-semibold text-gray-500">Submitted</span>
                          <span className="text-gray-600">{fmtDate(lead.created_at)}</span>
                        </td>
                        <td className="flex justify-end gap-2 mt-2 md:mt-0 pt-2 md:pt-0 border-t border-gray-100 md:border-0 md:table-cell md:py-4 md:px-6 text-sm">
                          <div className="flex items-center justify-center gap-1">
                            {lead.status !== 'CLOSED' ? (
                              <button
                                onClick={() => openConvert(lead)}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg"
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5" /> Convert to Loan
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                                <CheckCircle className="h-3.5 w-3.5" /> Converted
                              </span>
                            )}
                            <button
                              onClick={() => setDeleteTarget({ id: lead.id, label: lead.customer_name || 'this application', endpoint: `/crm/leads/${lead.id}/`, type: 'application' })}
                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Application"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
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
        </>
      )}

      {/* ── Convert to Loan Modal ────────────────────────── */}
      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Delete {deleteTarget.type === 'loan' ? 'Loan' : 'Application'}</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <span className="font-semibold">{deleteTarget.label}</span>? This action cannot be undone.
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

      {convertModal && convertLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Convert to Loan</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Create a loan for {convertLead.customer_name || 'this applicant'}
                </p>
              </div>
              <button onClick={closeConvert} className="rounded-lg p-1 hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Applicant Summary */}
            <div className="px-6 pt-4">
              <div className="rounded-xl bg-gray-50 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-slate-700">{convertLead.customer_name || '—'}</span>
                </div>
                {convertLead.customer_email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400" /> {convertLead.customer_email}
                  </div>
                )}
                {(convertLead.desired_make || convertLead.desired_model) && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                    Interested in: {convertLead.desired_make} {convertLead.desired_model}
                  </div>
                )}
                {convertLead.notes && (
                  <p className="text-xs text-gray-500 mt-2 bg-white rounded-lg p-2 border border-gray-100">
                    {convertLead.notes}
                  </p>
                )}
              </div>
            </div>

            {/* Loan Form */}
            <div className="p-6 space-y-4">
              {/* Principal + Admin Fee row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Principal Amount ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={convertForm.principal_amount}
                      onChange={(e) => setConvertForm((f) => ({ ...f, principal_amount: e.target.value }))}
                      placeholder="e.g. 15000.00"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin Fee ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={convertForm.admin_fee}
                      onChange={(e) => setConvertForm((f) => ({ ...f, admin_fee: e.target.value }))}
                      placeholder="e.g. 499.00"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Dealership financing facility fee</p>
                </div>
              </div>

              {/* Effective total hint */}
              {(convertForm.principal_amount || convertForm.admin_fee) && (
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-2.5 flex items-center justify-between text-sm">
                  <span className="text-amber-700 font-medium">Total Financed</span>
                  <span className="font-bold text-slate-800">
                    {fmt((parseFloat(convertForm.principal_amount || 0) + parseFloat(convertForm.admin_fee || 0)))}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Interest Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                  <div className="relative">
                    <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={convertForm.interest_rate}
                      onChange={(e) => setConvertForm((f) => ({ ...f, interest_rate: e.target.value }))}
                      placeholder="e.g. 5.9"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
                    />
                  </div>
                </div>

                {/* Term */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Term (months)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      min="1"
                      value={convertForm.term_months}
                      onChange={(e) => setConvertForm((f) => ({ ...f, term_months: e.target.value }))}
                      placeholder="e.g. 48"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
                    />
                  </div>
                  {/* Quick-fill term buttons */}
                  <div className="flex gap-1.5 mt-1.5">
                    {[24, 36, 48, 60, 72].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setConvertForm((f) => ({ ...f, term_months: String(m) }))}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors font-medium"
                      >
                        {m}mo
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={convertForm.start_date}
                  onChange={(e) => setConvertForm((f) => ({ ...f, start_date: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={closeConvert}
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                disabled={convertSubmitting || !convertForm.principal_amount || !convertForm.interest_rate || !convertForm.term_months}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {convertSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {convertSubmitting ? 'Creating…' : 'Create Loan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
