import { useState, useEffect, useCallback } from 'react';
import {
  Mail, Loader2, RefreshCw, Download, Search, X,
  CheckCircle, XCircle, Users,
} from 'lucide-react';
import api from '../../services/api';

/* ── CSV export utility ──────────────────────────────────── */
function exportToCsv(rows) {
  const header = 'Email,Date Subscribed,Status';
  const lines = rows.map((r) => {
    const date = new Date(r.subscribed_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
    const status = r.is_active ? 'Active' : 'Unsubscribed';
    // Escape any commas in email (unlikely but safe)
    return `"${r.email}",${date},${status}`;
  });
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Helpers ─────────────────────────────────────────────── */
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/marketing/newsletter/subscribers/');
      setSubscribers(Array.isArray(data) ? data : data.results ?? []);
    } catch {
      console.error('Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);

  const filtered = subscribers.filter((s) => {
    if (!search) return true;
    return s.email.toLowerCase().includes(search.toLowerCase());
  });

  const activeCount = subscribers.filter((s) => s.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Mail className="text-brand-600" size={24} /> Newsletter Subscribers
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {subscribers.length} total · {activeCount} active
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToCsv(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={fetchSubscribers}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by email…"
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

      {/* Table */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Users className="h-12 w-12 mb-3 opacity-40" />
            <p className="font-medium">No subscribers found</p>
            <p className="text-sm mt-1">Newsletter signups will appear here.</p>
          </div>
        ) : (
          <table className="w-full block md:table text-sm">
            <thead className="hidden md:table-header-group bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">#</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Date Subscribed</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group">
              {filtered.map((sub, idx) => (
                <tr key={sub.id} className="block md:table-row bg-white border border-gray-200 md:border-b md:border-x-0 md:border-t-0 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50/60 transition-colors">
                  <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                    <span className="md:hidden font-semibold text-gray-500">#</span>
                    <span className="text-gray-400 font-medium">{idx + 1}</span>
                  </td>
                  <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                    <span className="md:hidden font-semibold text-gray-500">Email</span>
                    <span className="font-medium text-slate-800">{sub.email}</span>
                  </td>
                  <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                    <span className="md:hidden font-semibold text-gray-500">Date Subscribed</span>
                    <span className="text-gray-600">{fmtDate(sub.subscribed_at)}</span>
                  </td>
                  <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                    <span className="md:hidden font-semibold text-gray-500">Status</span>
                    {sub.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
                        <CheckCircle className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                        <XCircle className="h-3 w-3" /> Unsubscribed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
