import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, Shield, ShieldCheck, Wrench,
  MoreVertical, UserCheck, UserX, Loader2, X, Eye, EyeOff,
  Mail, Phone, Calendar, Clock, ChevronDown, AlertCircle, CheckCircle,
} from 'lucide-react';
import api from '../../services/api';

/* ── helpers ─────────────────────────────────────────────── */

const ROLE_CONFIG = {
  ADMIN:      { label: 'Admin',      icon: ShieldCheck, color: 'bg-purple-100 text-purple-700',  dot: 'bg-purple-500' },
  SALES:      { label: 'Sales Rep',  icon: Users,       color: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-500' },
  TECHNICIAN: { label: 'Technician', icon: Wrench,      color: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500' },
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtDatetime = (d) => {
  if (!d) return 'Never';
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
};

const EMPTY_FORM = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  password: '',
  role: 'SALES',
};

/* ════════════════════════════════════════════════════════════ */
export default function AdminTeam() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // actions
  const [togglingId, setTogglingId] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [toast, setToast] = useState(null);

  /* ── fetch ──────────────────────────────────────────────── */
  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/config/team/');
      setMembers(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Failed to load team:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  /* ── filtering ──────────────────────────────────────────── */
  const filtered = members.filter((m) => {
    const matchSearch =
      !search ||
      m.username.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()) ||
      m.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'ALL' || m.role === roleFilter;
    return matchSearch && matchRole;
  });

  /* ── add / edit modal ───────────────────────────────────── */
  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setFormErrors({});
    setShowPassword(false);
    setShowModal(true);
  };

  const openEdit = (member) => {
    setFormData({
      username: member.username,
      email: member.email || '',
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      phone: member.phone || '',
      password: '',
      role: member.role,
    });
    setEditingId(member.id);
    setFormErrors({});
    setShowPassword(false);
    setShowModal(true);
    setOpenMenu(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors({});

    try {
      const payload = { ...formData };
      // Don't send empty password on edit
      if (editingId && !payload.password) delete payload.password;

      if (editingId) {
        await api.patch(`/config/team/${editingId}/`, payload);
        showToast('Team member updated');
      } else {
        await api.post('/config/team/', payload);
        showToast('Team member added');
      }
      setShowModal(false);
      fetchTeam();
    } catch (err) {
      if (err.response?.data) {
        setFormErrors(err.response.data);
      } else if (typeof err === 'object' && err !== null) {
        setFormErrors(err);
      }
    } finally {
      setSaving(false);
    }
  };

  /* ── toggle active ──────────────────────────────────────── */
  const toggleActive = async (member) => {
    setTogglingId(member.id);
    setOpenMenu(null);
    try {
      await api.patch(`/config/team/${member.id}/`, { is_active: !member.is_active });
      showToast(member.is_active ? 'User deactivated' : 'User activated');
      fetchTeam();
    } catch (err) {
      console.error('Toggle failed:', err);
    } finally {
      setTogglingId(null);
    }
  };

  /* ── toast ──────────────────────────────────────────────── */
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  /* ── stats ──────────────────────────────────────────────── */
  const totalActive = members.filter((m) => m.is_active).length;
  const byRole = { ADMIN: 0, SALES: 0, TECHNICIAN: 0 };
  members.forEach((m) => { if (byRole[m.role] !== undefined) byRole[m.role]++; });

  /* ────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Team Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            {members.length} team member{members.length !== 1 && 's'} · {totalActive} active
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-xl 
            text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus size={18} /> Add Employee
        </button>
      </div>

      {/* Role Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div
              key={key}
              className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setRoleFilter(roleFilter === key ? 'ALL' : key)}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${cfg.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{byRole[key]}</p>
                <p className="text-sm text-gray-500">{cfg.label}s</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm
              focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm
              focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="SALES">Sales Rep</option>
            <option value="TECHNICIAN">Technician</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Team Table */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium">No team members found</p>
            <p className="text-sm mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          <table className="w-full block md:table">
            <thead className="hidden md:table-header-group">
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-4">Employee</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-4">Contact</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-4">Role</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-4">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-4">Last Login</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-4">Joined</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group">
              {filtered.map((m) => {
                const rcfg = ROLE_CONFIG[m.role] || ROLE_CONFIG.SALES;
                const RoleIcon = rcfg.icon;
                const initials = (
                  (m.first_name?.[0] || '') + (m.last_name?.[0] || '') || m.username?.[0] || '?'
                ).toUpperCase();

                return (
                  <tr key={m.id} className="block md:table-row bg-white border border-gray-200 md:border-b md:border-x-0 md:border-t-0 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50/60 transition-colors">
                    {/* Employee */}
                    <td className="flex items-center gap-3 py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-700 text-white text-sm font-bold shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {m.full_name || m.username}
                        </p>
                        <p className="text-xs text-gray-400">@{m.username}</p>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Contact</span>
                      <div className="space-y-1 text-right md:text-left">
                        {m.email && (
                          <p className="text-sm text-gray-600 flex items-center gap-1.5 justify-end md:justify-start">
                            <Mail size={13} className="text-gray-400" /> {m.email}
                          </p>
                        )}
                        {m.phone && (
                          <p className="text-sm text-gray-600 flex items-center gap-1.5 justify-end md:justify-start">
                            <Phone size={13} className="text-gray-400" /> {m.phone}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Role</span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${rcfg.color}`}>
                        <RoleIcon size={13} /> {rcfg.label}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Status</span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        m.is_active ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        <span className={`h-2 w-2 rounded-full ${m.is_active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Last Login */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Last Login</span>
                      <p className="text-sm text-gray-600 flex items-center gap-1.5">
                        <Clock size={13} className="text-gray-400" />
                        {fmtDatetime(m.last_login)}
                      </p>
                    </td>

                    {/* Joined */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Joined</span>
                      <p className="text-sm text-gray-500">{fmtDate(m.date_joined)}</p>
                    </td>

                    {/* Actions */}
                    <td className="flex justify-end gap-2 mt-2 md:mt-0 pt-2 md:pt-0 border-t border-gray-100 md:border-0 md:table-cell md:py-4 md:px-6 text-sm text-right relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {openMenu === m.id && (
                        <div className="absolute right-6 top-12 z-20 w-44 rounded-xl border border-gray-100 bg-white shadow-xl py-1">
                          <button
                            onClick={() => openEdit(m)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Shield size={14} /> Edit Details
                          </button>
                          <button
                            onClick={() => toggleActive(m)}
                            disabled={togglingId === m.id}
                            className={`flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${
                              m.is_active ? 'text-red-600' : 'text-emerald-600'
                            }`}
                          >
                            {togglingId === m.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : m.is_active ? (
                              <UserX size={14} />
                            ) : (
                              <UserCheck size={14} />
                            )}
                            {m.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Click-away for action menus */}
      {openMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
      )}

      {/* ── Add / Edit Modal ─────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Team Member' : 'Add New Employee'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Name Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm
                      focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm
                      focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!!editingId}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm
                    focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100
                    disabled:bg-gray-50 disabled:text-gray-500"
                />
                {formErrors.username && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {formErrors.username}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm
                    focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                {formErrors.email && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {formErrors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm
                    focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {!editingId && <span className="text-red-500">*</span>}
                  {editingId && <span className="text-gray-400 font-normal ml-1">(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingId}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm
                      focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {Array.isArray(formErrors.password) ? formErrors.password[0] : formErrors.password}
                  </p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const selected = formData.role === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: key })}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          selected
                            ? 'border-brand-600 bg-brand-50 text-brand-600'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <Icon size={20} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Non-field errors */}
              {formErrors.non_field_errors && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle size={16} /> {formErrors.non_field_errors}
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-2.5 
                    rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors
                    disabled:opacity-60 shadow-sm"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3
          rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800 shadow-lg text-sm font-medium">
          <CheckCircle className="h-4 w-4" />
          {toast}
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
