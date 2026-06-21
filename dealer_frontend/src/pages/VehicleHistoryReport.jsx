import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Printer, Loader2, Wrench, ClipboardCheck, Car, FileText,
  CheckCircle, Shield, Calendar, Gauge, AlertTriangle,
  Truck, ArrowLeft,
} from 'lucide-react';
import api from '../services/api';

/* ─── icon map for timeline events ────────────────────────── */
const EVENT_ICONS = {
  ACQUIRED:  { Icon: Truck,          bg: 'bg-blue-100',   fg: 'text-blue-600' },
  SERVICE:   { Icon: Wrench,         bg: 'bg-amber-100',  fg: 'text-amber-600' },
  DOCUMENT:  { Icon: ClipboardCheck, bg: 'bg-emerald-100', fg: 'text-emerald-600' },
  SOLD:      { Icon: CheckCircle,    bg: 'bg-purple-100', fg: 'text-purple-600' },
};

/* ─── currency formatter ─────────────────────────────────── */
const fmt = (v) =>
  Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
};

/* ════════════════════════════════════════════════════════════ */
export default function VehicleHistoryReport() {
  const { vin } = useParams();
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get(`/inventory/vehicle/vin/${vin}/history-report/`);
        setReport(data);
      } catch (err) {
        setError(err.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    if (vin) fetchReport();
  }, [vin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-brand-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Generating report…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Report Not Found</h2>
          <p className="text-gray-500 mb-6">{error || 'The vehicle could not be found. Please check the VIN and try again.'}</p>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { is_admin_view, vehicle_details: v, timeline, summary } = report;
  const generatedDate = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <>
      {/* ─── Print-specific styles ─────────────────────────── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-break { page-break-inside: avoid; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-100 text-slate-800">
        {/* ─── Top Bar (print hidden) ──────────────────────── */}
        <div className="no-print bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-3">
            <Link to="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700 transition-colors"
            >
              <Printer className="h-4 w-4" /> Print Report
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
          {/* ─── Report Document ───────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print-break">

            {/* ── Branded Header ──────────────────────────── */}
            <div className="bg-slate-900 text-white px-8 py-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600">
                  <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <circle cx="12" cy="12" r="4" fill="currentColor"/>
                  </svg>
                </div>
                <div>
                  <span className="text-lg font-bold tracking-wide">
                    Auto<span className="text-brand-600">Decar</span>
                  </span>
                  <p className="text-slate-400 text-[11px]">Certified Dealer</p>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-base font-bold tracking-wide">Vehicle History Report</h1>
                <p className="text-slate-400 text-xs mt-0.5">Generated {generatedDate}</p>
              </div>
            </div>

            {/* ── Vehicle Header ──────────────────────────── */}
            <div className="bg-gray-50 border-b border-gray-200 px-8 py-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {v.year} {v.make} {v.model}
                    {v.trim ? ` ${v.trim}` : ''}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-1.5 text-sm text-gray-500">
                    <span className="font-mono text-xs bg-white border border-gray-200 rounded px-2 py-0.5">
                      VIN: {v.vin}
                    </span>
                    {v.color && (
                      <span className="flex items-center gap-1">
                        <span className="h-3 w-3 rounded-full border border-gray-300" style={{ backgroundColor: v.color.toLowerCase() }} />
                        {v.color}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5" /> {Number(v.mileage).toLocaleString()} mi
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                    {v.condition}
                  </span>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {v.status}
                  </span>
                </div>
              </div>

              {/* Admin financial strip */}
              {is_admin_view && v.price != null && (
                <div className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap gap-6 text-sm no-print">
                  <span>Listed: <strong>{fmt(v.price)}</strong></span>
                  <span>Total Cost: <strong className="text-red-600">{fmt(v.total_cost)}</strong></span>
                  <span>Margin: <strong className={v.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}>{fmt(v.profit_margin)}</strong></span>
                </div>
              )}
            </div>

            {/* ── Summary Badges ──────────────────────────── */}
            <div className="px-8 py-5 border-b border-gray-100">
              <div className="flex flex-wrap gap-3">
                <Badge icon={Shield} label="Clean Title" color="emerald" />
                <Badge icon={CheckCircle} label="No Accidents Reported" color="emerald" />
                <Badge icon={Wrench} label={`${summary.total_services} Service Record${summary.total_services !== 1 ? 's' : ''}`} color="blue" />
                {summary.inspections_passed > 0 && (
                  <Badge icon={ClipboardCheck} label={`${summary.inspections_passed} Inspection${summary.inspections_passed !== 1 ? 's' : ''} Passed`} color="green" />
                )}
                {summary.documents_on_file > 0 && (
                  <Badge icon={FileText} label={`${summary.documents_on_file} Document${summary.documents_on_file !== 1 ? 's' : ''} on File`} color="slate" />
                )}
                {summary.last_service_date && (
                  <Badge icon={Calendar} label={`Last Service: ${fmtDate(summary.last_service_date)}`} color="gray" />
                )}
              </div>
            </div>

            {/* ── Admin Summary Strip ─────────────────────── */}
            {is_admin_view && summary.total_service_cost != null && (
              <div className="px-8 py-3 bg-red-50/60 border-b border-red-100 text-sm no-print">
                <span className="font-semibold text-red-700">Admin:</span>{' '}
                Total Service Spend: <strong className="text-red-700">{fmt(summary.total_service_cost)}</strong>
              </div>
            )}

            {/* ── Timeline ────────────────────────────────── */}
            <div className="px-8 py-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-5">Service &amp; Event History</h3>

              {timeline.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No events recorded for this vehicle.</p>
              ) : (
                <ol className="relative border-l-2 border-gray-200 ml-4">
                  {timeline.map((evt, i) => {
                    const meta = EVENT_ICONS[evt.event_type] || EVENT_ICONS.SERVICE;
                    const IconComp = meta.Icon;

                    return (
                      <li key={i} className="mb-8 ml-8 print-break">
                        {/* Dot on the line */}
                        <span className={`absolute -left-[17px] flex h-8 w-8 items-center justify-center rounded-full ${meta.bg} ring-4 ring-white`}>
                          <IconComp className={`h-4 w-4 ${meta.fg}`} />
                        </span>

                        {/* Content */}
                        <div>
                          <time className="text-xs text-gray-400 font-medium">{fmtDate(evt.date)}</time>
                          <h4 className="text-sm font-semibold text-slate-800 mt-0.5">{evt.title}</h4>

                          {evt.category && (
                            <span className="inline-block mt-1 text-[11px] font-medium bg-gray-100 text-gray-500 rounded px-2 py-0.5">
                              {evt.category}
                            </span>
                          )}

                          {evt.description && (
                            <p className="text-sm text-gray-500 mt-1">{evt.description}</p>
                          )}

                          {/* Admin-only: cost + vendor */}
                          {is_admin_view && evt.amount != null && (
                            <p className="text-sm font-semibold text-red-600 mt-1 no-print">
                              Cost: {fmt(evt.amount)}
                              {evt.vendor && <span className="font-normal text-gray-400 ml-2">— {evt.vendor}</span>}
                            </p>
                          )}

                          {/* File link */}
                          {evt.file_url && (
                            <a
                              href={evt.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-brand-600 font-medium mt-1 hover:underline"
                            >
                              <FileText className="h-3 w-3" /> View Document
                            </a>
                          )}

                          {/* Before/After images */}
                          {evt.images?.length > 0 && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {evt.images.map((img, j) => (
                                <div key={j} className="relative group">
                                  <img
                                    src={img.url}
                                    alt={img.caption || 'Service photo'}
                                    className="h-16 w-20 object-cover rounded-lg border border-gray-200"
                                  />
                                  {img.caption && (
                                    <span className="absolute bottom-0 inset-x-0 text-[9px] text-center bg-black/50 text-white rounded-b-lg py-0.5">
                                      {img.caption}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {/* ── Footer ──────────────────────────────────── */}
            <div className="bg-gray-50 border-t border-gray-200 px-8 py-4 text-center text-xs text-gray-400">
              This report was generated by <strong className="text-slate-500">DQ Motors</strong> on {generatedDate}.
              Data is based on records maintained by the dealership. This is not a substitute for a professional vehicle inspection.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Badge sub-component ────────────────────────────────── */
function Badge({ icon: Icon, label, color = 'gray' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    green:   'bg-green-50 text-green-700 border-green-200',
    blue:    'bg-blue-50 text-blue-700 border-blue-200',
    slate:   'bg-slate-50 text-slate-600 border-slate-200',
    gray:    'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${colors[color] || colors.gray}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}
