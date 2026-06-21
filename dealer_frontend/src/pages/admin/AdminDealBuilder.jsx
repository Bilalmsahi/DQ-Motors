import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import {
  DollarSign,
  Calculator,
  FileText,
  PenTool,
  Save,
  ArrowLeft,
  User,
  Check,
  Loader2,
  AlertCircle,
  Car,
} from 'lucide-react';
import api from '../../services/api';
import SignatureModal from '../../components/common/SignatureModal';

// ---------------------------------------------------------------------------
// Helper: mirror the backend amortisation formula on the client side so the
// "live preview" card updates instantly without round-tripping to the API.
// ---------------------------------------------------------------------------
function computeDeal(values) {
  const agreedPrice  = parseFloat(values.agreed_price)  || 0;
  const tradeIn      = parseFloat(values.trade_in_allowance) || 0;
  const downPayment  = parseFloat(values.cash_down_payment)  || 0;
  const docFee       = parseFloat(values.doc_fee)       || 0;
  const taxRate      = parseFloat(values.tax_rate)      || 0;
  const termMonths   = parseInt(values.term_months, 10) || 0;
  const interestRate = parseFloat(values.interest_rate) || 0;

  const subtotal      = agreedPrice + docFee;
  const taxAmount     = +(subtotal * taxRate / 100).toFixed(2);
  const totalPrice    = +(subtotal + taxAmount).toFixed(2);
  const amountFinanced = Math.max(+(totalPrice - tradeIn - downPayment).toFixed(2), 0);

  let monthlyPayment = 0;
  if (amountFinanced > 0 && termMonths > 0) {
    if (interestRate === 0) {
      monthlyPayment = +(amountFinanced / termMonths).toFixed(2);
    } else {
      const mr = interestRate / 100 / 12;
      const n  = termMonths;
      monthlyPayment = +(amountFinanced * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1)).toFixed(2);
    }
  }

  return { subtotal, taxAmount, totalPrice, amountFinanced, monthlyPayment };
}

// ---------------------------------------------------------------------------
// Currency formatter
// ---------------------------------------------------------------------------
const fmt = (v) =>
  Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function AdminDealBuilder() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { id: editDealId } = useParams();          // undefined on /deals/new, set on /deals/edit/:id
  const isEditMode = Boolean(editDealId);

  // Lead & vehicle IDs passed via query params – e.g. /admin/deals/new?lead=5&vehicle=12
  const leadId    = searchParams.get('lead');
  const vehicleId = searchParams.get('vehicle');

  // ---- state ----
  const [lead, setLead]       = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [leads, setLeads]     = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [showSigModal, setShowSigModal] = useState(false);
  const [approvedTradeIns, setApprovedTradeIns] = useState([]);
  const [selectedTradeIn, setSelectedTradeIn] = useState(null);

  const [form, setForm] = useState({
    lead: leadId || '',
    vehicle: vehicleId || '',
    agreed_price: '',
    trade_in_allowance: '0',
    cash_down_payment: '0',
    doc_fee: '499.00',
    tax_rate: '6.25',
    term_months: '60',
    interest_rate: '5.90',
    version_name: 'Offer #1',
  });

  // ---- fetch lead & vehicle for header display ----
  useEffect(() => {
    const init = async () => {
      try {
        const promises = [
          api.get('/crm/leads/'),
          api.get('/inventory/vehicles/'),
          api.get('/crm/trade-ins/?status=OFFERED'),
        ];
        if (isEditMode) promises.push(api.get(`/crm/deals/${editDealId}/`));

        const [leadsRes, vehiclesRes, tradeInsRes, existingDeal] = await Promise.all(promises);

        const allLeads = leadsRes.results || leadsRes;
        const allVehicles = vehiclesRes.results || vehiclesRes;
        setLeads(allLeads);
        setVehicles(allVehicles);
        setApprovedTradeIns(tradeInsRes.results || tradeInsRes);

        // ── Edit mode: pre-fill from existing deal ──
        if (isEditMode && existingDeal) {
          setForm({
            lead: existingDeal.lead || '',
            vehicle: existingDeal.vehicle || '',
            agreed_price: existingDeal.agreed_price ? String(existingDeal.agreed_price) : '',
            trade_in_allowance: existingDeal.trade_in_allowance ? String(existingDeal.trade_in_allowance) : '0',
            cash_down_payment: existingDeal.cash_down_payment ? String(existingDeal.cash_down_payment) : '0',
            doc_fee: existingDeal.doc_fee ? String(existingDeal.doc_fee) : '499.00',
            tax_rate: existingDeal.tax_rate ? String(existingDeal.tax_rate) : '6.25',
            term_months: existingDeal.term_months ? String(existingDeal.term_months) : '60',
            interest_rate: existingDeal.interest_rate ? String(existingDeal.interest_rate) : '5.90',
            version_name: existingDeal.version_name || 'Offer #1',
          });
          const foundLead = allLeads.find((x) => String(x.id) === String(existingDeal.lead));
          if (foundLead) setLead(foundLead);
          const foundVehicle = allVehicles.find((x) => String(x.id) === String(existingDeal.vehicle));
          if (foundVehicle) setVehicle(foundVehicle);
        } else {
          // ── New-deal mode: use query params ──
          if (leadId) {
            const l = allLeads.find((x) => String(x.id) === String(leadId));
            if (l) {
              setLead(l);
              setForm((p) => ({ ...p, lead: l.id }));
            }
          }
          if (vehicleId) {
            const v = allVehicles.find((x) => String(x.id) === String(vehicleId));
            if (v) {
              setVehicle(v);
              setForm((p) => ({
                ...p,
                vehicle: v.id,
                agreed_price: v.price ? String(v.price) : '',
              }));
            }
          }
        }
      } catch {
        setError('Failed to load leads / vehicles');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [leadId, vehicleId, isEditMode, editDealId]);

  // ---- handle dropdown changes to keep header info in sync ----
  const handleLeadChange = (id) => {
    setForm((p) => ({ ...p, lead: id }));
    const found = leads.find((l) => String(l.id) === String(id));
    setLead(found || null);
  };

  const handleVehicleChange = (id) => {
    const found = vehicles.find((v) => String(v.id) === String(id));
    setVehicle(found || null);
    setForm((p) => ({
      ...p,
      vehicle: id,
      agreed_price: found?.price ? String(found.price) : p.agreed_price,
    }));
  };

  // ---- handle trade-in selection → auto-fill trade_in_allowance ----
  const handleTradeInChange = (id) => {
    if (!id) {
      setSelectedTradeIn(null);
      setForm((p) => ({ ...p, trade_in_allowance: '0' }));
      return;
    }
    const found = approvedTradeIns.find((ti) => String(ti.id) === String(id));
    setSelectedTradeIn(found || null);
    if (found?.offer_amount) {
      setForm((p) => ({ ...p, trade_in_allowance: String(found.offer_amount) }));
    }
  };

  // ---- live computed figures ----
  const computed = useMemo(() => computeDeal(form), [form]);

  // ---- input handler ----
  const onChange = useCallback(
    (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value })),
    []
  );

  // ---- save draft ----
  const saveDraft = async () => {
    setError('');
    setSuccess('');
    if (!form.lead || !form.vehicle || !form.agreed_price) {
      setError('Lead, Vehicle, and Agreed Price are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        lead: form.lead,
        vehicle: form.vehicle,
        agreed_price: form.agreed_price,
        trade_in_allowance: form.trade_in_allowance || '0',
        cash_down_payment: form.cash_down_payment || '0',
        doc_fee: form.doc_fee || '499',
        tax_rate: form.tax_rate || '6.25',
        term_months: form.term_months || '60',
        interest_rate: form.interest_rate || '5.90',
        version_name: form.version_name || 'Offer #1',
        status: 'DRAFT',
      };
      if (isEditMode) {
        await api.patch(`/crm/deals/${editDealId}/`, payload);
        setSuccess('Deal updated!');
      } else {
        await api.post('/crm/deals/', payload);
        setSuccess('Deal saved as draft!');
      }
      setTimeout(() => navigate('/admin/deals'), 1500);
    } catch (err) {
      setError(err?.message || 'Failed to save deal.');
    } finally {
      setSaving(false);
    }
  };

  // ---- sign & accept (two-phase: POST/PATCH draft → PATCH signature) ----
  const signAndAccept = async (signatureDataUrl) => {
    setError('');
    setSuccess('');
    if (!form.lead || !form.vehicle || !form.agreed_price) {
      setError('Lead, Vehicle, and Agreed Price are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        lead: form.lead,
        vehicle: form.vehicle,
        agreed_price: form.agreed_price,
        trade_in_allowance: form.trade_in_allowance || '0',
        cash_down_payment: form.cash_down_payment || '0',
        doc_fee: form.doc_fee || '499',
        tax_rate: form.tax_rate || '6.25',
        term_months: form.term_months || '60',
        interest_rate: form.interest_rate || '5.90',
        version_name: form.version_name || 'Offer #1',
        status: 'DRAFT',
      };

      // Step 1 – create or update the deal as a DRAFT
      let deal;
      if (isEditMode) {
        deal = await api.patch(`/crm/deals/${editDealId}/`, payload);
      } else {
        deal = await api.post('/crm/deals/', payload);
      }

      // Step 2 – convert base64 Data URL → Blob → File
      const res = await fetch(signatureDataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'signature.png', { type: 'image/png' });

      // Step 3 – PATCH the signature via the dedicated /sign/ endpoint
      const fd = new FormData();
      fd.append('customer_signature', file);
      fd.append('status', 'ACCEPTED');
      await api.uploadPatch(`/crm/deals/${deal.id}/sign/`, fd);

      setSuccess('Deal accepted & signed!');
      setTimeout(() => navigate('/admin/deals'), 1500);
    } catch (err) {
      setError(err?.message || 'Failed to save signed deal.');
    } finally {
      setSaving(false);
      setShowSigModal(false);
    }
  };

  // ---- loading / error states ----
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  // ---- derive header text ----
  const customerName = lead?.customer_name || 'Select a Lead';
  const vehicleTitle = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
    : 'Select a Vehicle';

  return (
    <div className="space-y-6">
      {/* ───── Header ───── */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-600" />
            {isEditMode ? 'Edit Deal' : 'Deal Builder'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEditMode ? 'Update' : 'Create'} offer for{' '}
            <span className="font-semibold text-slate-700">{customerName}</span>{' '}
            on{' '}
            <span className="font-semibold text-slate-700">{vehicleTitle}</span>
          </p>
        </div>
      </div>

      {/* ───── Alerts ───── */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          <Check className="w-4 h-4" /> {success}
        </div>
      )}

      {/* ───── Two-Column Layout ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT – Form Inputs  (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Lead & Vehicle selectors */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-brand-600" /> Lead & Vehicle
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead
                </label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none"
                  value={form.lead}
                  onChange={(e) => handleLeadChange(e.target.value)}
                >
                  <option value="">— Select Lead —</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.customer_name} — {l.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle
                </label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none"
                  value={form.vehicle}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                >
                  <option value="">— Select Vehicle —</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.year} {v.make} {v.model}
                      {v.price ? ` — ${fmt(v.price)}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Financial Inputs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-brand-600" /> Pricing &amp;
              Finance
            </h2>

            {/* Link Trade-In */}
            <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Car className="w-4 h-4 text-brand-600" /> Link Trade-In
              </label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none"
                value={selectedTradeIn?.id || ''}
                onChange={(e) => handleTradeInChange(e.target.value)}
              >
                <option value="">— No Trade-In —</option>
                {approvedTradeIns.map((ti) => (
                  <option key={ti.id} value={ti.id}>
                    {ti.year} {ti.make} {ti.model} — {ti.name} — ${Number(ti.offer_amount).toLocaleString()}
                  </option>
                ))}
              </select>
              {selectedTradeIn && (
                <p className="text-xs text-green-600 mt-1.5">
                  Trade-in offer of <span className="font-semibold">${Number(selectedTradeIn.offer_amount).toLocaleString()}</span> applied to calculator.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Agreed Price */}
              <InputField
                label="Agreed Price"
                name="agreed_price"
                value={form.agreed_price}
                onChange={onChange}
                prefix="$"
                placeholder="0.00"
              />
              {/* Trade-In */}
              <InputField
                label="Trade-In Allowance"
                name="trade_in_allowance"
                value={form.trade_in_allowance}
                onChange={onChange}
                prefix="$"
              />
              {/* Down Payment */}
              <InputField
                label="Cash Down Payment"
                name="cash_down_payment"
                value={form.cash_down_payment}
                onChange={onChange}
                prefix="$"
              />
              {/* Doc Fee */}
              <InputField
                label="Doc Fee"
                name="doc_fee"
                value={form.doc_fee}
                onChange={onChange}
                prefix="$"
              />
              {/* Tax Rate */}
              <InputField
                label="Tax Rate"
                name="tax_rate"
                value={form.tax_rate}
                onChange={onChange}
                suffix="%"
              />
              {/* Interest Rate */}
              <InputField
                label="Interest Rate"
                name="interest_rate"
                value={form.interest_rate}
                onChange={onChange}
                suffix="%"
              />
              {/* Term */}
              <InputField
                label="Term (months)"
                name="term_months"
                value={form.term_months}
                onChange={onChange}
                suffix="mo"
              />
              {/* Version Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Version Name
                </label>
                <input
                  type="text"
                  name="version_name"
                  value={form.version_name}
                  onChange={onChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={saveDraft}
              disabled={saving}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEditMode ? 'Update Draft' : 'Save as Draft'}
            </button>

            <button
              onClick={() => setShowSigModal(true)}
              disabled={saving}
              className="flex items-center gap-2 bg-brand-600 hover:bg-[#e65100] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
            >
              <PenTool className="w-4 h-4" /> Sign &amp; Accept
            </button>
          </div>
        </div>

        {/* RIGHT – Live Calculator Preview  (2 cols) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-5">
              <Calculator className="w-5 h-5 text-brand-600" /> Deal Summary
            </h2>

            <dl className="space-y-3 text-sm">
              <SummaryRow label="Agreed Price" value={fmt(form.agreed_price || 0)} />
              <SummaryRow label="Doc Fee" value={fmt(form.doc_fee || 0)} />
              <SummaryRow
                label="Subtotal"
                value={fmt(computed.subtotal)}
                bold
              />
              <SummaryRow
                label={`Tax (${form.tax_rate || 0}%)`}
                value={fmt(computed.taxAmount)}
              />
              <SummaryRow
                label="Total Price"
                value={fmt(computed.totalPrice)}
                bold
                accent
              />

              <div className="border-t border-gray-100 pt-3 mt-3" />

              <SummaryRow
                label="Trade-In"
                value={`- ${fmt(form.trade_in_allowance || 0)}`}
              />
              <SummaryRow
                label="Down Payment"
                value={`- ${fmt(form.cash_down_payment || 0)}`}
              />
              <SummaryRow
                label="Amount Financed"
                value={fmt(computed.amountFinanced)}
                bold
              />

              <div className="border-t border-gray-100 pt-3 mt-3" />

              <SummaryRow
                label={`Term`}
                value={`${form.term_months || 0} months @ ${form.interest_rate || 0}%`}
              />
            </dl>

            {/* Big monthly payment hero */}
            <div className="mt-6 bg-gradient-to-br from-brand-600 to-[#ff7a2e] rounded-xl p-5 text-white text-center">
              <p className="text-sm font-medium opacity-80">
                Estimated Monthly Payment
              </p>
              <p className="text-3xl font-bold mt-1">
                {fmt(computed.monthlyPayment)}
              </p>
              <p className="text-xs opacity-70 mt-1">/month</p>
            </div>
          </div>
        </div>
      </div>

      {/* ───── Signature Modal ───── */}
      {showSigModal && (
        <SignatureModal
          onClose={() => setShowSigModal(false)}
          onSave={signAndAccept}
          saving={saving}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InputField({ label, name, value, onChange, prefix, suffix, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            {prefix}
          </span>
        )}
        <input
          type="number"
          step="any"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full border border-gray-200 rounded-xl py-2 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none ${
            prefix ? 'pl-7 pr-3' : suffix ? 'pl-3 pr-10' : 'px-3'
          }`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold, accent }) {
  return (
    <div className="flex justify-between items-center">
      <dt className={`text-gray-500 ${bold ? 'font-semibold text-gray-700' : ''}`}>
        {label}
      </dt>
      <dd
        className={`${bold ? 'font-semibold' : ''} ${
          accent ? 'text-brand-600 text-base' : 'text-slate-800'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
