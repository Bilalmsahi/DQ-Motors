import { useState, useEffect, useCallback } from 'react';
import { 
  Users, Search, Eye, Mail, Calendar, Car,
  ChevronDown, Trash2
} from 'lucide-react';
import api from '../../services/api';
import PaginationControls from '../../components/common/PaginationControls';
import SortDropdown from '../../components/common/SortDropdown';
import LeadAssigneeSelector from '../../components/common/LeadAssigneeSelector';
import LeadDetailModal from './LeadDetailModal';

/**
 * AdminLeads - CRM Lead Management Page
 * 
 * Features:
 * - Tabs: All Leads | General Inquiries | Vehicle Requests
 * - Data table with sortable columns
 * - Lead detail modal with full info
 * - Actions: Convert to Customer, Mark Closed
 */
const AdminLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedLead, setSelectedLead] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Sort
  const [sortBy, setSortBy] = useState('-created_at');
  const sortOptions = [
    { value: '-created_at', label: 'Newest First' },
    { value: 'created_at',  label: 'Oldest First' },
    { value: 'status',      label: 'Status A → Z' },
    { value: '-status',     label: 'Status Z → A' },
  ];

  // ── Fetch ──
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab === 'GENERAL') params.set('lead_type', 'GENERAL_INQUIRY');
      if (activeTab === 'VEHICLE') params.set('lead_type', 'VEHICLE_REQUEST');
      if (activeTab === 'FINANCING') params.set('lead_type', 'FINANCING');
      if (activeTab === 'TEST_DRIVE') params.set('lead_type', 'TEST_DRIVE');
      if (activeTab === 'TRADE_IN') params.set('lead_type', 'TRADE_IN');
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      if (sortBy) params.set('ordering', sortBy);
      params.set('page', currentPage);
      const data = await api.get(`/crm/leads/?${params.toString()}`);
      setLeads(data.results ?? []);
      setTotalCount(data.count ?? 0);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, searchQuery, sortBy, currentPage]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') setCurrentPage(1);
  };
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // ── Actions ──
  const openLeadDetail = (lead) => {
    setSelectedLead(lead);
    setModalOpen(true);
  };

  const handleLeadUpdated = (updatedLead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? { ...l, ...updatedLead } : l));
    setSelectedLead(prev => prev?.id === updatedLead.id ? { ...prev, ...updatedLead } : prev);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/crm/leads/${deleteTarget.id}/`);
      setLeads(prev => prev.filter(l => l.id !== deleteTarget.id));
      setTotalCount(prev => prev - 1);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete lead:', error);
    } finally {
      setDeleting(false);
    }
  };

  // ── Badge helpers ──
  const StatusBadge = ({ status }) => {
    const styles = {
      NEW:    'bg-blue-50 text-blue-700 ring-blue-600/20',
      HOT:    'bg-brand-50 text-brand-800 ring-brand-700/20',
      COLD:   'bg-gray-50 text-gray-600 ring-gray-500/20',
      CLOSED: 'bg-green-50 text-green-700 ring-green-600/20',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ring-inset ${styles[status] || styles.NEW}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${
          status === 'NEW' ? 'bg-blue-500' : status === 'HOT' ? 'bg-brand-600' : status === 'COLD' ? 'bg-gray-400' : 'bg-green-500'
        }`} />
        {status}
      </span>
    );
  };

  const TypeSourceBadge = ({ lead }) => {
    const typeMap = {
      VEHICLE_REQUEST: { label: 'Vehicle', bg: 'bg-purple-50 text-purple-700' },
      FINANCING:       { label: 'Finance', bg: 'bg-emerald-50 text-emerald-700' },
      TEST_DRIVE:      { label: 'Test Drive', bg: 'bg-cyan-50 text-cyan-700' },
      TRADE_IN:        { label: 'Trade-In', bg: 'bg-amber-50 text-amber-700' },
      GENERAL_INQUIRY: { label: 'General', bg: 'bg-gray-50 text-gray-600' },
    };
    const srcMap = {
      WEBSITE:  'bg-blue-50 text-blue-600',
      WALKIN:   'bg-amber-50 text-amber-700',
      REFERRAL: 'bg-pink-50 text-pink-700',
    };
    const t = typeMap[lead.lead_type] || typeMap.GENERAL_INQUIRY;
    return (
      <div className="flex flex-col gap-1">
        <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${t.bg}`}>
          {t.label}
        </span>
        <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${srcMap[lead.source] || srcMap.WEBSITE}`}>
          {lead.source}
        </span>
      </div>
    );
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-gray-500 mt-1">Track and manage customer inquiries</p>
        </div>
        <span className="text-sm text-gray-500">{totalCount} lead{totalCount !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabs */}
      {/* Tabs - Mobile Fixed */}
      {/* ── Responsive Tabs / Category Filter ── */}
      <div className="w-full">
        
        {/* MOBILE VIEW: Dropdown */}
        <div className="block md:hidden relative w-full mb-4">
          <select
            value={activeTab}
            onChange={(e) => { setActiveTab(e.target.value); setCurrentPage(1); }}
            className="w-full appearance-none pl-4 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent bg-gray-50 text-gray-900 font-semibold shadow-sm"
          >
            <option value="ALL">All Leads {activeTab === 'ALL' && totalCount > 0 ? `(${totalCount})` : ''}</option>
            <option value="GENERAL">General Inquiries {activeTab === 'GENERAL' && totalCount > 0 ? `(${totalCount})` : ''}</option>
            <option value="VEHICLE">Vehicle Requests {activeTab === 'VEHICLE' && totalCount > 0 ? `(${totalCount})` : ''}</option>
            <option value="FINANCING">Financing {activeTab === 'FINANCING' && totalCount > 0 ? `(${totalCount})` : ''}</option>
            <option value="TEST_DRIVE">Test Drives {activeTab === 'TEST_DRIVE' && totalCount > 0 ? `(${totalCount})` : ''}</option>
            <option value="TRADE_IN">Trade-Ins {activeTab === 'TRADE_IN' && totalCount > 0 ? `(${totalCount})` : ''}</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none" />
        </div>

        {/* DESKTOP VIEW: Standard Tabs */}
        <div className="hidden md:flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-4">
          {[
            { key: 'ALL', label: 'All Leads' },
            { key: 'GENERAL', label: 'General Inquiries' },
            { key: 'VEHICLE', label: 'Vehicle Requests' },
            { key: 'FINANCING', label: 'Financing' },
            { key: 'TEST_DRIVE', label: 'Test Drives' },
            { key: 'TRADE_IN', label: 'Trade-Ins' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {tab.key === activeTab && totalCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-brand-600 text-white">
                  {totalCount}
                </span>
              )}
            </button>
          ))}
        </div>
        
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent"
          />
        </div>
        <SortDropdown
          options={sortOptions}
          currentValue={sortBy}
          onChange={(val) => { setSortBy(val); setCurrentPage(1); }}
        />
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="HOT">Hot</option>
            <option value="COLD">Cold</option>
            <option value="CLOSED">Closed</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="mt-3 text-gray-500">Loading leads…</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No leads found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <table className="w-full block md:table">
            <thead className="hidden md:table-header-group">
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Type / Source</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Vehicle Interest</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Assigned To</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group">
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="block md:table-row bg-white border border-gray-200 md:border-b md:border-x-0 md:border-t-0 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50/60 transition-colors cursor-pointer group"
                  onClick={() => openLeadDetail(lead)}
                >
                  {/* Contact */}
                  <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm gap-4">
                    <span className="md:hidden font-semibold text-gray-500 shrink-0">Contact:</span>
                    <div className="flex items-center gap-3 min-w-0 text-right md:text-left">
                      {/* Avatar */}
                      <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center text-white text-xs md:text-sm font-bold shrink-0">
                        {lead.customer_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      {/* Text Details (Must have min-w-0 to allow truncation) */}
                      <div className="min-w-0 flex flex-col items-end md:items-start">
                        <p className="font-semibold text-gray-900 text-sm truncate w-full">{lead.customer_name}</p>
                        <div className="flex items-center justify-end md:justify-start gap-1 mt-0.5 min-w-0 w-full">
                          {lead.customer_email && (
                            <span className="flex items-center gap-1 text-xs text-gray-500 truncate max-w-[130px] sm:max-w-xs">
                              <Mail size={11} className="shrink-0 text-gray-400" />
                              <span className="truncate">{lead.customer_email}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Type / Source */}
                  <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm gap-4">
                    <span className="md:hidden font-semibold text-gray-500 shrink-0">Type:</span>
                    <TypeSourceBadge lead={lead} />
                  </td>

                  {/* Vehicle Interest */}
                  <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm gap-4">
                    <span className="md:hidden font-semibold text-gray-500 shrink-0">Interest:</span>
                    {(lead.desired_make || lead.desired_model) ? (
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                          <Car size={15} className="text-purple-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {lead.desired_make} {lead.desired_model}
                          </p>
                          {lead.max_budget && (
                            <p className="text-xs text-brand-600 font-medium">
                              Budget: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(lead.max_budget)}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm gap-4">
                    <span className="md:hidden font-semibold text-gray-500 shrink-0">Status:</span>
                    <StatusBadge status={lead.status} />
                  </td>

                  {/* Assigned To */}
                  <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm gap-4" onClick={e => e.stopPropagation()}>
                    <span className="md:hidden font-semibold text-gray-500 shrink-0">Assigned:</span>
                    <LeadAssigneeSelector
                      leadId={lead.id}
                      assignedTo={lead.assigned_to}
                      assignedName={lead.assigned_to_name}
                      onAssigned={({ id, name }) => {
                        setLeads(prev => prev.map(l =>
                          l.id === lead.id ? { ...l, assigned_to: id, assigned_to_name: name } : l
                        ));
                      }}
                    />
                  </td>

                  {/* Date */}
                  <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-5 border-b border-gray-100 md:border-0 last:border-0 text-sm gap-4">
                    <span className="md:hidden font-semibold text-gray-500 shrink-0">Date:</span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(lead.created_at)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="flex justify-end gap-2 mt-3 md:mt-0 pt-3 md:pt-0 border-t border-gray-100 md:border-0 md:table-cell md:py-4 md:px-5 text-sm w-full md:w-auto">
                    <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => openLeadDetail(lead)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} className="text-gray-400 group-hover:text-gray-600" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(lead)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Lead"
                      >
                        <Trash2 size={16} className="text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && leads.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          label="leads"
          onPageChange={setCurrentPage}
        />
      )}

      {/* Lead Detail Modal */}
      {modalOpen && selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => { setModalOpen(false); setSelectedLead(null); }}
          onLeadUpdated={handleLeadUpdated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Delete Lead</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete the lead for <span className="font-semibold">{deleteTarget.customer_name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeads;
