import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import api from '../../services/api';

/* ── Shared staff cache so every row doesn't re-fetch ── */
let _staffCache = null;
let _staffPromise = null;

const fetchStaffOnce = () => {
  if (_staffCache) return Promise.resolve(_staffCache);
  if (_staffPromise) return _staffPromise;
  _staffPromise = api.get('/config/staff-list/').then((data) => {
    _staffCache = data;
    return data;
  });
  return _staffPromise;
};

/**
 * Inline dropdown for reassigning a lead to a staff member.
 *
 * Props:
 *  - leadId        : number
 *  - assignedTo    : number | null   (current user id)
 *  - assignedName  : string | null   (current display name)
 *  - onAssigned    : ({ id, name }) => void  — called after successful PATCH
 */
export default function LeadAssigneeSelector({ leadId, assignedTo, assignedName, onAssigned }) {
  const [staff, setStaff] = useState(_staffCache || []);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const ref = useRef(null);

  /* Fetch staff list (from cache or API) */
  useEffect(() => {
    fetchStaffOnce().then(setStaff);
  }, []);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* Auto-dismiss toast */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSelect = async (user) => {
    if (user.id === assignedTo) { setOpen(false); return; }
    setSaving(true);
    setOpen(false);
    try {
      await api.patch(`/crm/leads/${leadId}/`, { assigned_to: user.id });
      onAssigned?.({ id: user.id, name: user.name });
      setToast(`Assigned to ${user.name}`);
    } catch (err) {
      console.error('Failed to assign lead:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async () => {
    setSaving(true);
    setOpen(false);
    try {
      await api.patch(`/crm/leads/${leadId}/`, { assigned_to: null });
      onAssigned?.({ id: null, name: null });
      setToast('Unassigned');
    } catch (err) {
      console.error('Failed to unassign lead:', err);
    } finally {
      setSaving(false);
    }
  };

  const displayName = saving ? '…' : assignedName || 'Unassigned';

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors
          ${assignedTo
            ? 'text-gray-700 bg-gray-50 hover:bg-gray-100'
            : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
          } ${saving ? 'opacity-50' : ''}`}
      >
        <span className="truncate max-w-[100px]">{displayName}</span>
        <ChevronDown size={12} className="shrink-0 text-gray-400" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-30 mt-1 left-0 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 max-h-56 overflow-y-auto">
          {/* Unassign option */}
          <button
            onClick={handleUnassign}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
              !assignedTo ? 'text-brand-600 font-semibold' : 'text-gray-500'
            }`}
          >
            {!assignedTo && <Check size={12} className="shrink-0" />}
            <span className={!assignedTo ? '' : 'pl-5'}>Unassigned</span>
          </button>

          <div className="border-t border-gray-100 my-0.5" />

          {staff.map((u) => (
            <button
              key={u.id}
              onClick={() => handleSelect(u)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                u.id === assignedTo ? 'text-brand-600 font-semibold' : 'text-gray-700'
              }`}
            >
              {u.id === assignedTo && <Check size={12} className="shrink-0" />}
              <span className={u.id === assignedTo ? '' : 'pl-5'}>{u.name}</span>
              <span className="ml-auto text-[10px] text-gray-400">{u.role}</span>
            </button>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute z-40 -top-8 left-0 whitespace-nowrap px-2.5 py-1 rounded-lg bg-green-600 text-white text-[11px] font-medium shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
