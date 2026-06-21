import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import api from '../../services/api';

const MEDIA_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace('/api', '') ||
  'http://127.0.0.1:8000';

const fmt = (v) =>
  Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ── Print-specific styles injected into <head> once ──────────────────────
const printCSS = `
@media print {
  /* Hide everything except the deal-sheet */
  body > *:not(#root) { display: none !important; }
  #root > *           { display: none !important; }
  .deal-print-wrapper  { display: block !important; }

  /* Hide screen-only UI */
  .no-print { display: none !important; }

  /* Reset layout for paper */
  .deal-print-wrapper {
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: #fff;
    padding: 0;
    margin: 0;
  }

  @page {
    size: letter;
    margin: 0.5in;
  }
}
`;

export default function DealPrintView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Inject print stylesheet once
    const style = document.createElement('style');
    style.textContent = printCSS;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get(`/crm/deals/${id}/`);
        setDeal(data);
      } catch {
        setError('Deal not found.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg">{error || 'Deal not found.'}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-brand-600 font-medium hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const signatureUrl = deal.customer_signature
    ? (deal.customer_signature.startsWith('http')
        ? deal.customer_signature
        : `${MEDIA_BASE}${deal.customer_signature}`)
    : null;

  const printDate = new Date(deal.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="deal-print-wrapper">
      {/* ── Screen-only toolbar ─────────────────────────────── */}
      <div className="no-print flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Deals
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-medium hover:bg-[#e04f00] transition-colors"
        >
          <Printer size={18} /> Print Deal Sheet
        </button>
      </div>

      {/* ── Printable content ───────────────────────────────── */}
      <div className="max-w-[800px] mx-auto bg-white border border-gray-200 rounded-2xl print:border-0 print:rounded-none print:shadow-none shadow-sm">
        <div className="p-8 print:p-0 space-y-8">

          {/* ───── HEADER ───── */}
          <div className="flex items-start justify-between border-b-2 border-brand-600 pb-5">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                DQ <span className="text-brand-600">MOTORS</span>
              </h1>
              <p className="text-sm text-gray-500 mt-1">Premium Automotive Sales</p>
            </div>
            <div className="text-right text-sm text-gray-600 leading-relaxed">
              <p className="font-semibold text-gray-900">DQ Motors</p>
              <p>support@dqmotors.ca</p>
              <p>dqmotors.ca</p>
            </div>
          </div>

          {/* ───── DEAL META ───── */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <span className="font-semibold text-gray-900">Deal #{deal.id}</span>
              {deal.version_name && (
                <span className="ml-2 text-gray-400">— {deal.version_name}</span>
              )}
            </div>
            <div>Date: <span className="font-medium text-gray-900">{printDate}</span></div>
          </div>

          {/* ───── CUSTOMER & VEHICLE (side by side) ───── */}
          <div className="grid grid-cols-2 gap-8">
            {/* Customer */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3">
                Customer Information
              </h2>
              <table className="w-full text-sm">
                <tbody>
                  <Row label="Name" value={deal.customer_name} />
                  <Row label="Email" value={deal.customer_email} />
                  <Row label="Phone" value={deal.customer_phone} />
                  <Row label="Address" value={deal.customer_address} />
                </tbody>
              </table>
            </div>
            {/* Vehicle */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3">
                Vehicle Information
              </h2>
              <table className="w-full text-sm">
                <tbody>
                  <Row label="Vehicle" value={deal.vehicle_title} />
                  <Row label="VIN" value={deal.vehicle_vin} mono />
                  <Row label="Mileage" value={deal.vehicle_mileage ? `${Number(deal.vehicle_mileage).toLocaleString()} km` : '—'} />
                  <Row label="Sales Rep" value={deal.sales_rep_name} />
                </tbody>
              </table>
            </div>
          </div>

          {/* ───── FINANCIAL BREAKDOWN ───── */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3">
              Financial Breakdown
            </h2>
            <div className="border border-gray-200 rounded-xl overflow-hidden print:rounded-none">
              <table className="w-full text-sm">
                <tbody>
                  <FinRow label="Agreed Sale Price" value={fmt(deal.agreed_price)} />
                  <FinRow label="Documentation Fee" value={fmt(deal.doc_fee)} />
                  <FinRow label="Subtotal" value={fmt(deal.subtotal)} bold />
                  <FinRow label={`Sales Tax (${deal.tax_rate}%)`} value={fmt(deal.tax_amount)} />
                  <FinRow label="Total Price" value={fmt(deal.total_price)} bold accent />
                  <FinRow label="Trade-In Allowance" value={`- ${fmt(deal.trade_in_allowance)}`} />
                  <FinRow label="Cash Down Payment" value={`- ${fmt(deal.cash_down_payment)}`} />
                  <FinRow label="Amount Financed" value={fmt(deal.amount_financed)} bold accent />
                  <FinRow
                    label={`Monthly Payment (${deal.term_months} mo @ ${deal.interest_rate}%)`}
                    value={fmt(deal.monthly_payment)}
                    bold
                    accent
                    last
                  />
                </tbody>
              </table>
            </div>
          </div>

          {/* ───── SIGNATURES ───── */}
          <div className="pt-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-6">
              Signatures
            </h2>
            <div className="grid grid-cols-2 gap-12">
              {/* Buyer */}
              <div>
                <div className="h-20 border-b-2 border-gray-800 mb-2 flex items-end">
                  {signatureUrl && (
                    <img
                      src={signatureUrl}
                      alt="Customer signature"
                      className="max-h-16 object-contain"
                    />
                  )}
                </div>
                <p className="text-xs text-gray-600 font-medium">Buyer Signature</p>
                <p className="text-xs text-gray-400">{deal.customer_name}</p>
              </div>
              {/* Dealer */}
              <div>
                <div className="h-20 border-b-2 border-gray-800 mb-2" />
                <p className="text-xs text-gray-600 font-medium">Dealer Signature</p>
                <p className="text-xs text-gray-400">DQ Motors</p>
              </div>
            </div>
          </div>

          {/* ───── FOOTER ───── */}
          <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
            <p>This document is a summary of the agreed terms. Official financing is subject to lender approval.</p>
            <p className="mt-1">DQ Motors — dqmotors.ca — support@dqmotors.ca</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Reusable sub-components ────────────────────────────────── */

function Row({ label, value, mono }) {
  return (
    <tr>
      <td className="py-1.5 pr-3 text-gray-500 whitespace-nowrap w-24">{label}</td>
      <td className={`py-1.5 text-gray-900 font-medium ${mono ? 'font-mono text-xs tracking-wide' : ''}`}>
        {value || '—'}
      </td>
    </tr>
  );
}

function FinRow({ label, value, bold, accent, last }) {
  return (
    <tr className={`${last ? '' : 'border-b border-gray-100'} ${accent ? 'bg-brand-50/50' : ''}`}>
      <td className={`px-5 py-3 text-gray-700 ${bold ? 'font-semibold' : ''}`}>{label}</td>
      <td className={`px-5 py-3 text-right ${bold ? 'font-bold text-gray-900' : 'text-gray-700'} ${accent ? 'text-brand-600' : ''}`}>
        {value}
      </td>
    </tr>
  );
}
