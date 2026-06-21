import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CreditCard, User, Briefcase, Car, CheckCircle, AlertCircle,
  Loader2, Send, DollarSign, ChevronRight, ChevronLeft, FileText
} from 'lucide-react';
import Navbar from '../components/home/Navbar';
import Footer from '../components/home/Footer';
import api from '../services/api';

const CREDIT_SCORE_OPTIONS = [
  { value: 'EXCELLENT', label: 'Excellent (750+)' },
  { value: 'GOOD', label: 'Good (700–749)' },
  { value: 'FAIR', label: 'Fair (650–699)' },
  { value: 'POOR', label: 'Poor (below 650)' },
];

const EMPLOYMENT_OPTIONS = [
  { value: 'EMPLOYED', label: 'Employed Full-Time' },
  { value: 'PART_TIME', label: 'Employed Part-Time' },
  { value: 'SELF_EMPLOYED', label: 'Self-Employed' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'UNEMPLOYED', label: 'Unemployed' },
];

const STEPS = [
  { id: 1, title: 'Personal Info', icon: User },
  { id: 2, title: 'Financial Info', icon: Briefcase },
  { id: 3, title: 'Vehicle & Consent', icon: FileText },
];

export default function FinancingApplication() {
  const location = useLocation();
  const preselectedVehicleId = location.state?.preselectedVehicleId;

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [vehicles, setVehicles] = useState([]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    employment_status: '',
    monthly_income: '',
    credit_score: '',
    vehicle_interest: preselectedVehicleId ? String(preselectedVehicleId) : '',
    consent: false,
  });

  // Fetch available vehicles for the optional dropdown
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const data = await api.get('/inventory/vehicles/?status=READY&page_size=200');
        setVehicles(data.results || data || []);
      } catch {
        // Silently fail — dropdown stays empty
      }
    };
    fetchVehicles();
  }, []);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  // ── Validation per step ──────────────────────────────────
  const validateStep = () => {
    if (step === 1) {
      if (!form.name || !form.email || !form.phone) {
        setError('Name, Email, and Phone are required.');
        return false;
      }
      if (!/\S+@\S+\.\S+/.test(form.email)) {
        setError('Please enter a valid email address.');
        return false;
      }
    }
    if (step === 2) {
      if (!form.employment_status || !form.monthly_income || !form.credit_score) {
        setError('Employment Status, Monthly Income, and Credit Score are required.');
        return false;
      }
    }
    setError('');
    return true;
  };

  const next = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, 3));
  };
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  // ── Build notes string with financial info ───────────────
  const buildNotes = () => {
    const lines = [
      `Financing Application`,
      `Employment: ${form.employment_status}`,
      `Monthly Income: $${Number(form.monthly_income).toLocaleString()}`,
      `Est. Credit Score: ${form.credit_score}`,
    ];
    if (form.dob) lines.push(`DOB: ${form.dob}`);
    if (form.vehicle_interest) {
      const v = vehicles.find((x) => String(x.id) === String(form.vehicle_interest));
      if (v) lines.push(`Interested in: ${v.year} ${v.make} ${v.model} (Stock #${v.id})`);
    }
    lines.push(`Consent to credit check: ${form.consent ? 'Yes' : 'No'}`);
    return lines.join('\n');
  };

  // ── Submit to /api/crm/leads/ ─────────────────────────────
  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (step < 3) {
      next();
      return;
    }
    if (!validateStep()) return;

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        lead_type: 'FINANCING',
        source: 'WEBSITE',
        notes: buildNotes(),
        credit_check_consent: form.consent,
      };

      // If they selected a vehicle, include desired_make/model
      if (form.vehicle_interest) {
        const v = vehicles.find((x) => String(x.id) === String(form.vehicle_interest));
        if (v) {
          payload.desired_make = v.make;
          payload.desired_model = v.model;
        }
      }

      await api.post('/crm/leads/', payload);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar transparent={false} />
        <div className="flex items-center justify-center py-32">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-5">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Application Received!
            </h2>
            <p className="text-gray-500">
              Our finance team will review your application and reach out within 1–2
              business days. Keep an eye on your inbox.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar transparent={false} />

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            Finance Your Dream Car
          </h1>
          <p className="text-lg text-gray-300 max-w-xl mx-auto">
            Complete our quick credit application and our team will find the best
            loan options for you.
          </p>
        </div>
      </div>

      {/* Form container */}
      <div className="container mx-auto px-6 py-12 max-w-3xl">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                    active
                      ? 'bg-brand-600 text-white'
                      : done
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {s.title}
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                )}
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} noValidate>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">

            {/* ─── Step 1: Personal Info ──────────────────── */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <User className="w-5 h-5 text-brand-600" /> Personal Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Full Name *" name="name" value={form.name} onChange={onChange} placeholder="John Doe" />
                  <Field label="Email *" name="email" value={form.email} onChange={onChange} type="email" placeholder="john@example.com" />
                  <Field label="Phone *" name="phone" value={form.phone} onChange={onChange} placeholder="(555) 123-4567" />
                  <Field label="Date of Birth" name="dob" value={form.dob} onChange={onChange} type="date" />
                </div>
              </div>
            )}

            {/* ─── Step 2: Financial Info ─────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-brand-600" /> Financial Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Employment Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employment Status *
                    </label>
                    <select
                      name="employment_status"
                      value={form.employment_status}
                      onChange={onChange}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none bg-white"
                    >
                      <option value="">Select...</option>
                      {EMPLOYMENT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Monthly Income */}
                  <Field
                    label="Monthly Income *"
                    name="monthly_income"
                    value={form.monthly_income}
                    onChange={onChange}
                    type="number"
                    placeholder="e.g. 5000"
                  />

                  {/* Credit Score */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Credit Score *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {CREDIT_SCORE_OPTIONS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, credit_score: c.value }))}
                          className={`border rounded-xl p-3 text-left transition ${
                            form.credit_score === c.value
                              ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-600/20'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <p className="text-sm font-semibold text-slate-800">{c.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Step 3: Vehicle Interest & Consent ──────── */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Car className="w-5 h-5 text-brand-600" /> Vehicle Interest & Consent
                </h2>

                {/* Vehicle Dropdown (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interested in a specific vehicle? (Optional)
                  </label>
                  <select
                    name="vehicle_interest"
                    value={form.vehicle_interest}
                    onChange={onChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none bg-white"
                  >
                    <option value="">— No preference —</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model} {v.trim ? `(${v.trim})` : ''} — ${Number(v.price).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Consent Checkbox */}
                <label className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                  form.consent
                    ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-600/20'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    name="consent"
                    checked={form.consent}
                    onChange={onChange}
                    className="mt-0.5 h-5 w-5 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      I consent to a credit check{' '}
                      <span className="text-xs font-normal text-gray-400">(optional)</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      By checking this box, you authorize us to obtain your credit report
                      for the purpose of evaluating your financing application. You can
                      still submit without consenting — our team will follow up with you.
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* ─── Navigation buttons ───────────────────────── */}
          <div className="flex items-center justify-between mt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={prev}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                key="step-nav-next"
                type="button"
                onClick={next}
                className="flex items-center gap-2 bg-brand-600 hover:bg-[#e65100] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                key="step-nav-submit"
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 bg-brand-600 hover:bg-[#e65100] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Submit Application
              </button>
            )}
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
}

// ─── Reusable Field sub-component ────────────────────────────

function Field({ label, name, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none"
      />
    </div>
  );
}
