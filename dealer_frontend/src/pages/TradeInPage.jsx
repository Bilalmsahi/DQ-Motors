import { useState } from 'react';
import {
  Car, Camera, User, Send, CheckCircle, AlertCircle,
  ChevronRight, ChevronLeft, Loader2, Upload, Wand2, DollarSign, Info
} from 'lucide-react';
import Navbar from '../components/home/Navbar';
import Footer from '../components/home/Footer';
import api from '../services/api';
import { useConfig, FEATURES } from '../context/ConfigContext';

const CONDITION_OPTIONS = [
  { value: 'EXCELLENT', label: 'Excellent', desc: 'Like new, no visible wear' },
  { value: 'GOOD', label: 'Good', desc: 'Minor cosmetic blemishes' },
  { value: 'FAIR', label: 'Fair', desc: 'Noticeable wear, runs well' },
  { value: 'POOR', label: 'Poor', desc: 'Significant wear or issues' },
];

const STEPS = [
  { id: 1, title: 'Vehicle Info', icon: Car },
  { id: 2, title: 'Estimate', icon: DollarSign },
  { id: 3, title: 'Photos', icon: Camera },
  { id: 4, title: 'Contact', icon: User },
];

const formatCAD = (n) => {
  if (n === null || n === undefined || n === '') return '';
  const num = typeof n === 'number' ? n : parseFloat(n);
  if (Number.isNaN(num)) return '';
  return num.toLocaleString('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  });
};

export default function TradeInPage() {
  const { isFeatureEnabled } = useConfig();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [vinDecoding, setVinDecoding] = useState(false);
  const [vinDecoded, setVinDecoded] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);

  const [form, setForm] = useState({
    vin: '',
    year: '',
    make: '',
    model: '',
    mileage: '',
    condition: 'GOOD',
    name: '',
    email: '',
    phone: '',
  });

  const [photos, setPhotos] = useState({
    front_photo: null,
    back_photo: null,
    side_photo: null,
    interior_photo: null,
  });

  const [previews, setPreviews] = useState({
    front_photo: null,
    back_photo: null,
    side_photo: null,
    interior_photo: null,
  });

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleVinChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
    setForm((p) => ({ ...p, vin: val }));
    setVinDecoded(false);
    if (val.length === 17) decodeVin(val);
  };

  const decodeVin = async (vin) => {
    setVinDecoding(true);
    try {
      // Try backend first
      try {
        const data = await api.post('/inventory/decode-vin/', { vin });
        if (data) {
          setForm((p) => ({
            ...p,
            make: data.make || p.make,
            model: data.model || p.model,
            year: data.year ? String(data.year) : p.year,
          }));
          setVinDecoded(true);
          return;
        }
      } catch {
        // fall through to NHTSA
      }

      // Fallback to NHTSA public API
      const res = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`
      );
      const data = await res.json();
      if (data.Results) {
        const get = (id) => data.Results.find((r) => r.VariableId === id)?.Value || '';
        setForm((p) => ({
          ...p,
          make: get(26) || p.make,
          model: get(28) || p.model,
          year: get(29) ? String(parseInt(get(29))) : p.year,
        }));
        setVinDecoded(true);
      }
    } catch (err) {
      console.error('VIN decode failed:', err);
    } finally {
      setVinDecoding(false);
    }
  };

  const onFileChange = (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotos((p) => ({ ...p, [field]: file }));
    setPreviews((p) => ({ ...p, [field]: URL.createObjectURL(file) }));
  };

  // ── Validation per step ────────────────────────────────────────────
  const validateStep = () => {
    if (step === 1) {
      if (!form.year || !form.make || !form.model || !form.mileage) {
        setError('Year, Make, Model, and Mileage are required.');
        return false;
      }
    }
    // Step 2 (estimate) and Step 3 (photos) are optional
    if (step === 4) {
      if (!form.name || !form.email) {
        setError('Name and Email are required.');
        return false;
      }
    }
    setError('');
    return true;
  };

  const fetchEstimate = async () => {
    setEstimating(true);
    setEstimate(null);
    try {
      const data = await api.post('/crm/trade-ins/estimate/', {
        vin: form.vin,
        make: form.make,
        model: form.model,
        year: form.year,
        mileage: form.mileage,
        condition: form.condition,
      });
      setEstimate(data);
    } catch (err) {
      console.error('Estimate failed:', err);
      setEstimate({ error: true });
    } finally {
      setEstimating(false);
    }
  };

  const next = () => {
    if (!validateStep()) return;
    const target = Math.min(step + 1, STEPS.length);
    // When entering the estimate step, kick off the fetch.
    if (step === 1 && target === 2) {
      fetchEstimate();
    }
    setStep(target);
  };
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  // ── Submit ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;

    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      // Text fields
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      // Photo fields
      Object.entries(photos).forEach(([k, file]) => {
        if (file) fd.append(k, file);
      });

      await api.upload('/crm/trade-ins/', fd);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────
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
              Appraisal Received!
            </h2>
            <p className="text-gray-500">
              We will email you an offer shortly. Keep an eye on your inbox.
            </p>
            {estimate && !estimate.error && (
              <div className="mt-5 pt-5 border-t border-gray-100 text-left">
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                  Your estimated range
                </p>
                <p className="text-lg font-semibold text-slate-800">
                  {formatCAD(estimate.low)} – {formatCAD(estimate.high)}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  This is an estimate. The real offer may differ after inspection.
                </p>
              </div>
            )}
          </div>
        </div>
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
            Trade-In Your Vehicle
          </h1>
          <p className="text-lg text-gray-300 max-w-xl mx-auto">
            Get a no-obligation appraisal in minutes. Submit your vehicle details
            and we'll send you a competitive offer.
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

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            {/* ─── Step 1: Vehicle Info ─────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Car className="w-5 h-5 text-brand-600" /> Vehicle Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* VIN field with optional decode button */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      VIN (optional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="vin"
                        value={form.vin}
                        onChange={handleVinChange}
                        placeholder="Enter 17-character VIN to auto-fill details"
                        maxLength={17}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none font-mono tracking-wider"
                      />
                      {isFeatureEnabled(FEATURES.VIN_DECODER) && (
                        <button
                          type="button"
                          onClick={() => decodeVin(form.vin)}
                          disabled={form.vin.length !== 17 || vinDecoding}
                          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-40 whitespace-nowrap"
                        >
                          {vinDecoding ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Wand2 className="w-4 h-4" />
                          )}
                          {vinDecoding ? 'Decoding…' : 'Auto-fill'}
                        </button>
                      )}
                    </div>
                    {vinDecoded && (
                      <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Year, Make &amp; Model filled from VIN
                      </p>
                    )}
                  </div>
                  <Field label="Year *" name="year" value={form.year} onChange={onChange} type="number" placeholder="e.g. 2020" />
                  <Field label="Make *" name="make" value={form.make} onChange={onChange} placeholder="e.g. Toyota" />
                  <Field label="Model *" name="model" value={form.model} onChange={onChange} placeholder="e.g. Camry" />
                  <Field label="Mileage *" name="mileage" value={form.mileage} onChange={onChange} type="number" placeholder="e.g. 45000" />
                </div>

                {/* Condition picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condition *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {CONDITION_OPTIONS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, condition: c.value }))}
                        className={`border rounded-xl p-3 text-left transition ${
                          form.condition === c.value
                            ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-600/20'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-800">{c.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{c.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── Step 2: Estimate ────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-brand-600" /> Estimated Value
                </h2>

                {estimating && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm py-8 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" /> Calculating estimate…
                  </div>
                )}

                {!estimating && estimate?.error && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
                    We couldn't generate an estimate right now. You can still continue —
                    our team will appraise your vehicle and send you an offer.
                  </div>
                )}

                {!estimating && estimate && !estimate.error && (
                  <>
                    <div className="bg-gradient-to-br from-brand-50 to-orange-50 border border-brand-100 rounded-2xl p-6 text-center">
                      <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                        Estimated Trade-In Range
                      </p>
                      <p className="text-3xl md:text-4xl font-bold text-slate-800">
                        {formatCAD(estimate.low)} – {formatCAD(estimate.high)}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Midpoint: <span className="font-semibold text-slate-700">{formatCAD(estimate.estimate)}</span> {estimate.currency}
                      </p>
                      {estimate.method === 'marketcheck' && (
                        <p className="text-[11px] text-gray-400 mt-2">
                          Based on real used-car market data.
                        </p>
                      )}
                    </div>

                    <div className="flex items-start gap-2 bg-accent-50 border border-accent-200 text-accent-800 px-4 py-3 rounded-xl text-sm">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">This is an estimate, not a final offer.</p>
                        <p className="text-accent-700/90 mt-0.5">
                          {estimate.disclaimer ||
                            'The real price can differ once our team inspects the vehicle in person.'}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ─── Step 3: Photos ──────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-brand-600" /> Upload Photos
                </h2>
                <p className="text-sm text-gray-500">
                  Photos help us give you a more accurate offer. All uploads are optional.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { field: 'front_photo', label: 'Front' },
                    { field: 'back_photo', label: 'Back' },
                    { field: 'side_photo', label: 'Side' },
                    { field: 'interior_photo', label: 'Interior' },
                  ].map(({ field, label }) => (
                    <PhotoInput
                      key={field}
                      label={label}
                      preview={previews[field]}
                      onChange={(e) => onFileChange(field, e)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ─── Step 4: Contact ─────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <User className="w-5 h-5 text-brand-600" /> Your Contact Info
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Full Name *" name="name" value={form.name} onChange={onChange} placeholder="John Doe" />
                  <Field label="Email *" name="email" value={form.email} onChange={onChange} type="email" placeholder="john@example.com" />
                  <Field label="Phone" name="phone" value={form.phone} onChange={onChange} placeholder="(555) 123-4567" />
                </div>
              </div>
            )}
          </div>

          {/* ─── Navigation buttons ─────────────────────────────── */}
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

            {step < 4 ? (
              <button
                type="button"
                onClick={next}
                className="flex items-center gap-2 bg-brand-600 hover:bg-[#e65100] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-brand-600 hover:bg-[#e65100] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Submit Appraisal
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

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

function PhotoInput({ label, preview, onChange }) {
  return (
    <label className="cursor-pointer group">
      <div
        className={`border-2 border-dashed rounded-xl h-40 flex flex-col items-center justify-center transition overflow-hidden ${
          preview
            ? 'border-brand-600/40'
            : 'border-gray-200 group-hover:border-gray-300'
        }`}
      >
        {preview ? (
          <img
            src={preview}
            alt={label}
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            <Upload className="w-6 h-6 text-gray-300 mb-1" />
            <span className="text-xs text-gray-400">{label}</span>
          </>
        )}
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={onChange} />
    </label>
  );
}
