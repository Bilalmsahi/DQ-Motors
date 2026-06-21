import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Handshake, Search, Eye, Pencil, Trash2, Plus, Printer,
  FileText, CheckCircle, Clock, XCircle, Archive,
} from 'lucide-react';
import api from '../../services/api';

/**
 * AdminDeals – Deal Manager Page
 *
 * Tabs:
 *  - Active / Drafts  (DRAFT, SENT)
 *  - Won / Sold       (ACCEPTED)
 *  - Lost / Archived  (REJECTED)
 *
 * Table: Date | Customer | Vehicle | Deal Value | Status | Actions
 */
export default function AdminDeals() {
  const navigate = useNavigate();

  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch deals ───────────────────────────────────────────
  const fetchDeals = useCallback(async () => {
    const statusMap = {
      ACTIVE: ['DRAFT', 'SENT'],
      WON: ['ACCEPTED'],
      LOST: ['REJECTED'],
    };
    try {
      setLoading(true);
      const statuses = statusMap[activeTab];
      // Fetch each status in parallel then merge
      const results = await Promise.all(
        statuses.map((s) => api.get(`/crm/deals/?status=${s}`))
      );
      let merged = results.flatMap((r) => (r.results ?? r));
      // Sort newest first
      merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setDeals(merged);
    } catch (err) {
      console.error('Failed to fetch deals:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  // ── Delete deal ───────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/crm/deals/${deleteId}/`);
      setDeals((prev) => prev.filter((d) => d.id !== deleteId));
    } catch (err) {
      console.error('Failed to delete deal:', err);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  // ── Helpers ───────────────────────────────────────────────
  const formatDate = (str) =>
    new Date(str).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

  const fmt = (v) =>
    Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  // ── Status badge ──────────────────────────────────────────
  const StatusBadge = ({ status }) => {
    const map = {
      DRAFT:    { color: 'bg-gray-100 text-gray-700',   icon: Clock },
      SENT:     { color: 'bg-blue-100 text-blue-700',   icon: FileText },
      ACCEPTED: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      REJECTED: { color: 'bg-red-100 text-red-700',     icon: XCircle },
    };
    const cfg = map[status] || map.DRAFT;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
        <Icon size={12} />
        {status}
      </span>
    );
  };

  // ── Filter by search ──────────────────────────────────────
  const filtered = deals.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (d.customer_name || '').toLowerCase().includes(q) ||
      (d.vehicle_title || '').toLowerCase().includes(q) ||
      (d.version_name || '').toLowerCase().includes(q)
    );
  });

  // ── Counts per tab ────────────────────────────────────────
  // We store total counts for badge display (re-uses current filtered list isn't ideal,
  // so we just show the filtered length for the active tab)
  const tabCount = filtered.length;

  // ── Tab config ────────────────────────────────────────────
  const tabs = [
    { key: 'ACTIVE', label: 'Active / Drafts', icon: Clock },
    { key: 'WON',    label: 'Won / Sold',      icon: CheckCircle },
    { key: 'LOST',   label: 'Lost / Archived',  icon: Archive },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deal Manager</h1>
          <p className="text-gray-500 mt-1">View, edit, and manage all offers and deals</p>
        </div>
        <button
          onClick={() => navigate('/admin/deals/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-medium hover:bg-[#e04f00] transition-colors"
        >
          <Plus size={18} />
          New Deal
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
            {activeTab === tab.key && tabCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-brand-600 text-white">
                {tabCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search by customer, vehicle, or offer name…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Handshake size={48} strokeWidth={1} />
            <p className="mt-3 text-lg font-medium">No deals found</p>
            <p className="text-sm">
              {activeTab === 'ACTIVE'
                ? 'Create a new deal from the Deal Builder.'
                : 'Deals will appear here once their status changes.'}
            </p>
          </div>
        ) : (
          <table className="w-full block md:table">
            <thead className="hidden md:table-header-group">
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Vehicle</th>
                <th className="px-6 py-4">Offer Name</th>
                <th className="px-6 py-4 text-right">Deal Value</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group">
              {filtered.map((deal) => (
                <tr key={deal.id} className="block md:table-row bg-white border border-gray-200 md:border-b md:border-x-0 md:border-t-0 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50/50 transition-colors">
                  <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                    <span className="md:hidden font-semibold text-gray-500">Date</span>
                    <span className="text-gray-600">{formatDate(deal.created_at)}</span>
                  </td>
                  <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                    <span className="md:hidden font-semibold text-gray-500">Customer</span>
                    <div className="text-right md:text-left">
                      <p className="font-medium text-gray-900">{deal.customer_name || '—'}</p>
                      <p className="text-xs text-gray-500">{deal.lead_title || ''}</p>
                    </div>
                  </td>
                  <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                    <span className="md:hidden font-semibold text-gray-500">Vehicle</span>
                    <span className="text-gray-700">{deal.vehicle_title || '—'}</span>
                  </td>
                  <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                    <span className="md:hidden font-semibold text-gray-500">Offer Name</span>
                    <span className="text-gray-600">{deal.version_name || '—'}</span>
                  </td>
                  <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                    <span className="md:hidden font-semibold text-gray-500">Deal Value</span>
                    <span className="font-semibold text-gray-900">{fmt(deal.total_price)}</span>
                  </td>
                  <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                    <span className="md:hidden font-semibold text-gray-500">Status</span>
                    <StatusBadge status={deal.status} />
                  </td>
                  <td className="flex justify-end gap-2 mt-2 md:mt-0 pt-2 md:pt-0 border-t border-gray-100 md:border-0 md:table-cell md:py-4 md:px-6 text-sm">
                    <div className="flex items-center justify-end gap-1">
                      {/* Edit – only for DRAFT/SENT */}
                      {(deal.status === 'DRAFT' || deal.status === 'SENT') && (
                        <button
                          onClick={() => navigate(`/admin/deals/edit/${deal.id}`)}
                          className="p-2 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Edit Deal"
                        >
                          <Pencil size={16} />
                        </button>
                      )}

                      {/* View / Print – for ACCEPTED */}
                      {deal.status === 'ACCEPTED' && (
                        <button
                          onClick={() => navigate(`/admin/deals/${deal.id}`)}
                          className="p-2 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="View Deal Sheet"
                        >
                          <Eye size={16} />
                        </button>
                      )}

                      {/* View – for any status */}
                      {deal.status !== 'ACCEPTED' && deal.status !== 'DRAFT' && deal.status !== 'SENT' && (
                        <button
                          onClick={() => navigate(`/admin/deals/${deal.id}`)}
                          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      )}

                      {/* Delete – only DRAFT */}
                      {deal.status === 'DRAFT' && (
                        <button
                          onClick={() => setDeleteId(deal.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Draft"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900">Delete Draft?</h3>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone. The draft deal will be permanently removed.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
