import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, Search, ChevronDown, ChevronRight, Calendar,
  Plus, Pencil, Trash2, ArrowRight, User, Clock, Filter, X,
  Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import PaginationControls from '../../components/common/PaginationControls';

// ── Constants ────────────────────────────────────────────────
const MODULE_OPTIONS = [
  { value: '', label: 'All Modules' },
  { value: 'Vehicle', label: 'Vehicle' },
  { value: 'Lead', label: 'Lead' },
  { value: 'Deal', label: 'Deal' },
  { value: 'Expense', label: 'Expense' },
  { value: 'Customer', label: 'Customer' },
  { value: 'Vendor', label: 'Vendor' },
];

const ACTION_MAP = {
  CREATE: { label: 'Created', color: 'bg-emerald-100 text-emerald-700', icon: Plus },
  UPDATE: { label: 'Updated', color: 'bg-blue-100 text-blue-700', icon: Pencil },
  DELETE: { label: 'Deleted', color: 'bg-red-100 text-red-700', icon: Trash2 },
  LOGIN:  { label: 'Login',   color: 'bg-purple-100 text-purple-700', icon: User },
  EXPORT: { label: 'Export',  color: 'bg-amber-100 text-amber-700', icon: ArrowRight },
};

// ── Helper: format relative time ────────────────────────────
const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

// ── Helper: format a value for display ──────────────────────
const formatValue = (val) => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') {
    // Check if it looks like a price (has decimals)
    if (Number.isFinite(val) && val >= 100) {
      return `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    return val.toLocaleString();
  }
  if (typeof val === 'string' && val.length > 80) return val.slice(0, 80) + '…';
  return String(val);
};

// ── User avatar ─────────────────────────────────────────────
const UserAvatar = ({ name }) => {
  const initials = (name || '?')
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-bold text-white shrink-0">
      {initials}
    </div>
  );
};

// ── Action badge ────────────────────────────────────────────
const ActionBadge = ({ action }) => {
  const info = ACTION_MAP[action] || { label: action, color: 'bg-gray-100 text-gray-700', icon: AlertCircle };
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${info.color}`}>
      <Icon size={12} />
      {info.label}
    </span>
  );
};

// ── Changes detail panel ────────────────────────────────────
const ChangesDetail = ({ action, changes }) => {
  if (!changes || Object.keys(changes).length === 0) {
    return <p className="text-sm text-gray-400 italic">No details available.</p>;
  }

  // UPDATE – field-level diff table
  if (action === 'UPDATE') {
    const fields = Object.entries(changes);
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-2 pr-4 text-left font-semibold text-gray-500 uppercase text-xs tracking-wider">Field</th>
              <th className="py-2 pr-4 text-left font-semibold text-gray-500 uppercase text-xs tracking-wider">Old Value</th>
              <th className="py-2 text-left font-semibold text-gray-500 uppercase text-xs tracking-wider">New Value</th>
            </tr>
          </thead>
          <tbody>
            {fields.map(([field, diff]) => (
              <tr key={field} className="border-b border-gray-100 last:border-0">
                <td className="py-2 pr-4 font-medium text-slate-700 capitalize whitespace-nowrap">
                  {field.replace(/_/g, ' ')}
                </td>
                <td className="py-2 pr-4 text-red-600 line-through">
                  {formatValue(diff.old)}
                </td>
                <td className="py-2 text-emerald-600 font-medium">
                  {formatValue(diff.new)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // CREATE – show created fields
  if (action === 'CREATE' && changes.created) {
    const data = changes.created;
    const entries = Object.entries(data).filter(([k]) => !['id', 'pk', 'slug', 'created_at', 'updated_at'].includes(k));
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-baseline gap-2 text-sm">
            <span className="font-medium text-gray-500 capitalize whitespace-nowrap">{key.replace(/_/g, ' ')}:</span>
            <span className="text-slate-700 truncate">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  // DELETE – show deleted snapshot
  if (action === 'DELETE' && changes.deleted) {
    const data = changes.deleted;
    const entries = Object.entries(data).filter(([k]) => !['id', 'pk', 'slug', 'created_at', 'updated_at'].includes(k));
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-baseline gap-2 text-sm">
            <span className="font-medium text-gray-500 capitalize whitespace-nowrap">{key.replace(/_/g, ' ')}:</span>
            <span className="text-slate-700 line-through truncate">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  // Fallback: dump JSON
  return (
    <pre className="text-xs bg-gray-50 rounded-lg p-3 overflow-x-auto text-slate-600 whitespace-pre-wrap">
      {JSON.stringify(changes, null, 2)}
    </pre>
  );
};

// ── Target link builder ─────────────────────────────────────
const getTargetLink = (log) => {
  const { target_model, target_object_id, action } = log;
  if (action === 'DELETE') return null; // deleted objects can't be linked
  switch (target_model) {
    case 'Vehicle': return `/admin/inventory/edit/${target_object_id}`;
    case 'Lead': return '/admin/leads';
    case 'Deal': return '/admin/deals/new';
    case 'Expense': return '/admin/financials';
    case 'Vendor': return `/admin/vendors/${target_object_id}`;
    default: return null;
  }
};

// ════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════
const AdminActivityLog = () => {
  // ── Data state ──────────────────────────────────────────
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Pagination ──────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // ── Filters ─────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Expanded rows ───────────────────────────────────────
  const [expandedId, setExpandedId] = useState(null);

  // ── Users for dropdown ──────────────────────────────────
  const [users, setUsers] = useState([]);

  // Debounce ref
  const debounceRef = useRef(null);

  // Fetch team users for the user filter dropdown
  useEffect(() => {
    api.get('/config/team/')
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results ?? [];
        setUsers(list);
      })
      .catch(() => setUsers([]));
  }, []);

  // ── Fetch audit logs ───────────────────────────────────
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', currentPage);
      params.set('ordering', '-timestamp');
      if (searchQuery) params.set('search', searchQuery);
      if (moduleFilter) params.set('target_model', moduleFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (userFilter) params.set('user', userFilter);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const data = await api.get(`/config/audit-logs/?${params.toString()}`);
      setLogs(data.results ?? []);
      setTotalCount(data.count ?? 0);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError(err.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, moduleFilter, actionFilter, userFilter, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Debounced search
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1);
    }, 350);
  };

  // Reset filters
  const clearFilters = () => {
    setSearchQuery('');
    setModuleFilter('');
    setActionFilter('');
    setUserFilter('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || moduleFilter || actionFilter || userFilter || startDate || endDate;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="h-7 w-7 text-brand-600" />
            Activity Log
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Security center — track every create, update, and delete across the system.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5
            text-sm font-medium text-slate-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Filters Card ──────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm">
        {/* Top row: search + toggle filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by target name or ID…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm
                text-slate-800 placeholder-gray-400 focus:border-brand-600 focus:bg-white
                focus:outline-none focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors
              ${hasActiveFilters
                ? 'border-brand-600 bg-brand-50 text-brand-600'
                : 'border-gray-200 bg-white text-slate-700 hover:bg-gray-50'
              }`}
          >
            <Filter size={16} />
            Filters
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {[moduleFilter, actionFilter, userFilter, startDate, endDate].filter(Boolean).length}
              </span>
            )}
            <ChevronDown size={14} className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5
                text-sm text-gray-500 hover:text-red-500 hover:border-red-200 transition-colors"
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>

        {/* Expandable filter row */}
        {filtersOpen && (
          <div className="flex flex-wrap items-end gap-3 border-t border-gray-100 p-4">
            {/* User */}
            <div className="min-w-[160px]">
              <label className="mb-1 block text-xs font-medium text-gray-500">User</label>
              <select
                value={userFilter}
                onChange={(e) => { setUserFilter(e.target.value); setCurrentPage(1); }}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-8
                  text-sm text-slate-700 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="">All Users</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                  </option>
                ))}
              </select>
            </div>

            {/* Module */}
            <div className="min-w-[150px]">
              <label className="mb-1 block text-xs font-medium text-gray-500">Module</label>
              <select
                value={moduleFilter}
                onChange={(e) => { setModuleFilter(e.target.value); setCurrentPage(1); }}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-8
                  text-sm text-slate-700 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                {MODULE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Action */}
            <div className="min-w-[140px]">
              <label className="mb-1 block text-xs font-medium text-gray-500">Action</label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-8
                  text-sm text-slate-700 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
              </select>
            </div>

            {/* Date range */}
            <div className="min-w-[150px]">
              <label className="mb-1 block text-xs font-medium text-gray-500">From</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3
                    text-sm text-slate-700 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>
            <div className="min-w-[150px]">
              <label className="mb-1 block text-xs font-medium text-gray-500">To</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3
                    text-sm text-slate-700 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Data Table ────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <p className="text-sm">Loading activity logs…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-400">
            <AlertCircle className="h-8 w-8 mb-3" />
            <p className="text-sm font-medium">{error}</p>
            <button onClick={fetchLogs} className="mt-3 text-sm text-brand-600 hover:underline">Retry</button>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Shield className="h-10 w-10 mb-3" />
            <p className="text-sm font-medium">No activity logs found</p>
            <p className="text-xs mt-1">
              {hasActiveFilters ? 'Try adjusting your filters.' : 'Actions will appear here once users interact with the system.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="w-8 px-4 py-3"></th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-xs tracking-wider">User</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-xs tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-xs tracking-wider">Module</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-xs tracking-wider">Target</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-xs tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const isExpanded = expandedId === log.id;
                    const targetLink = getTargetLink(log);
                    return (
                      <>
                        <tr
                          key={log.id}
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          className={`border-b border-gray-50 cursor-pointer transition-colors
                            ${isExpanded ? 'bg-brand-50/40' : 'hover:bg-gray-50/80'}`}
                        >
                          {/* Expand chevron */}
                          <td className="px-4 py-3 text-gray-400">
                            <ChevronRight
                              size={16}
                              className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            />
                          </td>

                          {/* User */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <UserAvatar name={log.user_display} />
                              <div>
                                <p className="font-medium text-slate-800 text-sm leading-tight">
                                  {log.user_display || 'System'}
                                </p>
                                {log.ip_address && (
                                  <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{log.ip_address}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Action badge */}
                          <td className="px-4 py-3">
                            <ActionBadge action={log.action} />
                          </td>

                          {/* Module */}
                          <td className="px-4 py-3 text-slate-700 font-medium">{log.target_model}</td>

                          {/* Target */}
                          <td className="px-4 py-3 max-w-[220px]">
                            {targetLink ? (
                              <a
                                href={targetLink}
                                onClick={(e) => e.stopPropagation()}
                                className="text-brand-600 hover:underline truncate block text-sm"
                                title={log.target_repr}
                              >
                                {log.target_repr?.length > 50 ? log.target_repr.slice(0, 50) + '…' : log.target_repr}
                              </a>
                            ) : (
                              <span className="text-slate-600 truncate block text-sm" title={log.target_repr}>
                                {log.target_repr?.length > 50 ? log.target_repr.slice(0, 50) + '…' : log.target_repr}
                              </span>
                            )}
                          </td>

                          {/* Time */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>
                              <p className="text-sm text-slate-700">{timeAgo(log.timestamp)}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {new Date(log.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded detail row */}
                        {isExpanded && (
                          <tr key={`${log.id}-detail`} className="bg-brand-50/20">
                            <td></td>
                            <td colSpan={5} className="px-4 py-4">
                              <div className="rounded-xl border border-gray-200 bg-white p-4">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                                  <Clock size={12} />
                                  Change Details
                                </h4>
                                <ChangesDetail action={log.action} changes={log.changes} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {logs.map((log) => {
                const isExpanded = expandedId === log.id;
                const targetLink = getTargetLink(log);
                return (
                  <div key={log.id} className="p-4 space-y-2">
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="flex items-start gap-3 cursor-pointer"
                    >
                      <UserAvatar name={log.user_display} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-slate-800 text-sm truncate">
                            {log.user_display || 'System'}
                          </p>
                          <ActionBadge action={log.action} />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {log.target_model} ·{' '}
                          {targetLink ? (
                            <a
                              href={targetLink}
                              onClick={(e) => e.stopPropagation()}
                              className="text-brand-600 hover:underline"
                            >
                              {log.target_repr?.length > 40 ? log.target_repr.slice(0, 40) + '…' : log.target_repr}
                            </a>
                          ) : (
                            <span>{log.target_repr?.length > 40 ? log.target_repr.slice(0, 40) + '…' : log.target_repr}</span>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(log.timestamp)}</p>
                      </div>
                      <ChevronRight
                        size={16}
                        className={`text-gray-400 shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </div>
                    {isExpanded && (
                      <div className="ml-11 mt-2 rounded-xl border border-gray-200 bg-white p-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Details</h4>
                        <ChangesDetail action={log.action} changes={log.changes} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────── */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        label="log entries"
      />
    </div>
  );
};

export default AdminActivityLog;
