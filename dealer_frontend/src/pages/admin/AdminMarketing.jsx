import { useState, useEffect, useCallback } from 'react';
import {
  Megaphone, Plus, X, Trash2, Eye, Users, DollarSign,
  Calendar, Tag, Image, Loader2, Search, ChevronDown, ChevronUp,
  CheckCircle2, Clock, XCircle, Pencil, BarChart3
} from 'lucide-react';
import api from '../../services/api';

// ─── Status badge helper ────────────────────────────────────
const statusConfig = {
  RUNNING:   { color: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Running' },
  SCHEDULED: { color: 'bg-blue-100 text-blue-700',   icon: Clock,        label: 'Scheduled' },
  ENDED:     { color: 'bg-gray-100 text-gray-500',   icon: XCircle,      label: 'Ended' },
  INACTIVE:  { color: 'bg-red-100 text-red-600',     icon: XCircle,      label: 'Inactive' },
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.INACTIVE;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
      <Icon size={12} /> {cfg.label}
    </span>
  );
};

// ─── Stat card ───────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color = 'text-brand-600' }) => (
  <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
    <div className={`flex h-11 w-11 items-center justify-center rounded-lg bg-gray-50 ${color}`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════
const AdminMarketing = () => {
  // ── Campaign list state ────────────────────────────────────
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // ── Form state ─────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(emptyForm());

  // ── Vehicle selector state ─────────────────────────────────
  const [allVehicles, setAllVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');

  // ── Fetch campaigns ────────────────────────────────────────
  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get('/marketing/campaigns/');
      const list = Array.isArray(data) ? data : data.results ?? [];
      setCampaigns(list);
    } catch {
      console.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // ── Fetch vehicles for selector ────────────────────────────
  const fetchVehicles = useCallback(async () => {
    if (allVehicles.length > 0) return; // cached
    try {
      setVehiclesLoading(true);
      const data = await api.get('/inventory/vehicles/?page_size=500');
      const list = Array.isArray(data) ? data : data.results ?? [];
      setAllVehicles(list);
    } catch {
      console.error('Failed to load vehicles');
    } finally {
      setVehiclesLoading(false);
    }
  }, [allVehicles.length]);

  // ── Computed stats ─────────────────────────────────────────
  const totalViews   = campaigns.reduce((s, c) => s + (c.views || 0), 0);
  const totalLeads   = campaigns.reduce((s, c) => s + (c.leads_generated || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status_label === 'RUNNING').length;

  // ── Filter ─────────────────────────────────────────────────
  const filtered = filterStatus === 'ALL'
    ? campaigns
    : campaigns.filter(c => c.status_label === filterStatus);

  // ── Handlers ───────────────────────────────────────────────
  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setFormError('');
    setShowForm(true);
    fetchVehicles();
  };

  const openEdit = (c) => {
    setForm({
      title: c.title,
      description: c.description || '',
      start_date: toLocalInput(c.start_date),
      end_date: toLocalInput(c.end_date),
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      is_active: c.is_active,
      vehicle_ids: (c.vehicles_detail || []).map(v => v.id),
      banner_image: null,            // keep existing unless replaced
    });
    setEditingId(c.id);
    setFormError('');
    setShowForm(true);
    fetchVehicles();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign permanently?')) return;
    try {
      await api.delete(`/marketing/campaigns/${id}/`);
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch {
      alert('Failed to delete campaign');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('start_date', new Date(form.start_date).toISOString());
      fd.append('end_date', new Date(form.end_date).toISOString());
      fd.append('discount_type', form.discount_type);
      fd.append('discount_value', form.discount_value);
      fd.append('is_active', form.is_active);
      form.vehicle_ids.forEach(id => fd.append('vehicle_ids', id));
      if (form.banner_image) {
        fd.append('banner_image', form.banner_image);
      }

      if (editingId) {
        await api.uploadPatch(`/marketing/campaigns/${editingId}/`, fd);
      } else {
        await api.upload('/marketing/campaigns/', fd);
      }
      setShowForm(false);
      fetchCampaigns();
    } catch (err) {
      setFormError(err.message || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  // ── Vehicle toggle helpers ─────────────────────────────────
  const toggleVehicle = (id) => {
    setForm(prev => ({
      ...prev,
      vehicle_ids: prev.vehicle_ids.includes(id)
        ? prev.vehicle_ids.filter(v => v !== id)
        : [...prev.vehicle_ids, id],
    }));
  };

  const selectAllFiltered = () => {
    const ids = filteredVehicles.map(v => v.id);
    setForm(prev => ({
      ...prev,
      vehicle_ids: [...new Set([...prev.vehicle_ids, ...ids])],
    }));
  };

  const deselectAll = () => setForm(prev => ({ ...prev, vehicle_ids: [] }));

  const filteredVehicles = allVehicles.filter(v => {
    if (!vehicleSearch.trim()) return true;
    const q = vehicleSearch.toLowerCase();
    return (
      v.make?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q) ||
      String(v.year).includes(q) ||
      v.vin?.toLowerCase().includes(q)
    );
  });

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Megaphone className="text-brand-600" size={24} /> Campaigns & Promotions
          </h1>
          <p className="text-sm text-gray-500 mt-1">Create flash sales, attach vehicles, and track performance.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#e65100] transition-colors"
        >
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Eye}    label="Total Reach (Views)" value={totalViews.toLocaleString()} />
        <StatCard icon={Users}  label="Leads Generated"     value={totalLeads.toLocaleString()} color="text-blue-600" />
        <StatCard icon={BarChart3} label="Active Campaigns" value={activeCampaigns} color="text-green-600" />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'RUNNING', 'SCHEDULED', 'ENDED', 'INACTIVE'].map(st => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition-colors
              ${filterStatus === st
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-600 hover:text-brand-600'}`}
          >
            {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading campaigns…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-100 p-12 text-center shadow-sm">
          <Megaphone className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-500 font-medium">No campaigns found</p>
          <p className="text-sm text-gray-400 mt-1">Click "New Campaign" to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(c => (
            <CampaignRow
              key={c.id}
              campaign={c}
              expanded={expandedId === c.id}
              onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
              onEdit={() => openEdit(c)}
              onDelete={() => handleDelete(c.id)}
            />
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ───────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto pt-10 pb-10">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? 'Edit Campaign' : 'Create Campaign'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">{formError}</div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder='e.g. "End of Year Sale"'
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-600 focus:ring-1 focus:ring-brand-600 outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-600 focus:ring-1 focus:ring-brand-600 outline-none resize-none"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.start_date}
                    onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-600 focus:ring-1 focus:ring-brand-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.end_date}
                    onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-600 focus:ring-1 focus:ring-brand-600 outline-none"
                  />
                </div>
              </div>

              {/* Discount Rules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type *</label>
                  <select
                    value={form.discount_type}
                    onChange={e => setForm(p => ({ ...p, discount_type: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-600 focus:ring-1 focus:ring-brand-600 outline-none"
                  >
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Value * {form.discount_type === 'PERCENT' ? '(%)' : '($)'}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.discount_value}
                    onChange={e => setForm(p => ({ ...p, discount_value: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-600 focus:ring-1 focus:ring-brand-600 outline-none"
                  />
                </div>
              </div>

              {/* Banner Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm text-gray-500 hover:border-brand-600 hover:text-brand-600 transition-colors">
                    <Image size={16} />
                    {form.banner_image ? form.banner_image.name : 'Choose file…'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => setForm(p => ({ ...p, banner_image: e.target.files[0] || null }))}
                    />
                  </label>
                  {form.banner_image && (
                    <button type="button" onClick={() => setForm(p => ({ ...p, banner_image: null }))} className="text-gray-400 hover:text-red-500">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                />
                <span className="text-sm text-gray-700">Active (publish immediately when dates match)</span>
              </label>

              {/* ── Vehicle Selector ──────────────────────────────── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicles in Campaign ({form.vehicle_ids.length} selected)
                </label>

                {/* Quick actions + search */}
                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by make, model, year, VIN…"
                      value={vehicleSearch}
                      onChange={e => setVehicleSearch(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-2 text-sm focus:border-brand-600 focus:ring-1 focus:ring-brand-600 outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={selectAllFiltered} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      Select All Shown
                    </button>
                    <button type="button" onClick={deselectAll} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      Clear
                    </button>
                  </div>
                </div>

                {/* Vehicle list */}
                <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {vehiclesLoading ? (
                    <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                      <Loader2 className="animate-spin mr-2" size={16} /> Loading vehicles…
                    </div>
                  ) : filteredVehicles.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-400">No vehicles match your search.</p>
                  ) : (
                    filteredVehicles.map(v => {
                      const selected = form.vehicle_ids.includes(v.id);
                      return (
                        <label
                          key={v.id}
                          className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${selected ? 'bg-brand-50/60' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleVehicle(v.id)}
                            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                          />
                          {v.images?.[0]?.image && (
                            <img src={v.images[0].image} alt="" className="h-8 w-12 rounded object-cover" />
                          )}
                          <span className="text-sm text-gray-700 flex-1 truncate">
                            {v.year} {v.make} {v.model} {v.trim && `(${v.trim})`}
                          </span>
                          <span className="text-xs text-gray-400 shrink-0">${parseFloat(v.price).toLocaleString()}</span>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${v.status === 'READY' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {v.status}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-[#e65100] disabled:opacity-50 transition-colors"
                >
                  {saving && <Loader2 className="animate-spin" size={14} />}
                  {editingId ? 'Save Changes' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Campaign Row (expandable)
// ═══════════════════════════════════════════════════════════════
const CampaignRow = ({ campaign: c, expanded, onToggle, onEdit, onDelete }) => {
  const discountLabel = c.discount_type === 'PERCENT'
    ? `${parseFloat(c.discount_value)}%`
    : `$${parseFloat(c.discount_value).toLocaleString()}`;

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      {/* Summary row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-800 truncate">{c.title}</h3>
            <StatusBadge status={c.status_label} />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {fmtDate(c.start_date)} → {fmtDate(c.end_date)}
          </p>
        </div>

        {/* Mini stats */}
        <div className="hidden sm:flex items-center gap-6 text-sm text-gray-500 shrink-0">
          <span className="flex items-center gap-1"><Tag size={14} className="text-brand-600" /> {discountLabel}</span>
          <span className="flex items-center gap-1"><Eye size={14} /> {c.views}</span>
          <span className="flex items-center gap-1"><Users size={14} /> {c.leads_generated}</span>
          <span className="flex items-center gap-1"><DollarSign size={14} /> {(c.vehicles_detail || []).length} cars</span>
        </div>

        {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-5 space-y-4">
          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniStat label="Views"  value={c.views} />
            <MiniStat label="Leads"  value={c.leads_generated} />
            <MiniStat label="Vehicles" value={(c.vehicles_detail || []).length} />
            <MiniStat label="Discount" value={discountLabel} />
          </div>

          {/* Description */}
          {c.description && (
            <p className="text-sm text-gray-500">{c.description}</p>
          )}

          {/* Vehicles grid */}
          {c.vehicles_detail && c.vehicles_detail.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Vehicles in Campaign</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {c.vehicles_detail.map(v => (
                  <div key={v.id} className="rounded-lg border border-gray-100 p-2 text-center">
                    {v.thumbnail && (
                      <img src={v.thumbnail} alt="" className="h-16 w-full object-cover rounded mb-1" />
                    )}
                    <p className="text-xs font-medium text-gray-700 truncate">{v.title}</p>
                    <p className="text-[10px] text-gray-400">${parseFloat(v.price).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const MiniStat = ({ label, value }) => (
  <div className="rounded-lg bg-gray-50 p-3 text-center">
    <p className="text-lg font-bold text-slate-800">{value}</p>
    <p className="text-[10px] text-gray-400 uppercase">{label}</p>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════
function emptyForm() {
  return {
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    discount_type: 'PERCENT',
    discount_value: '',
    is_active: true,
    vehicle_ids: [],
    banner_image: null,
  };
}

function toLocalInput(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDate(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default AdminMarketing;
