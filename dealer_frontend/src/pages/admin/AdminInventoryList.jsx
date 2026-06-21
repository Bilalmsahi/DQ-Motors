import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Car,
  AlertCircle,
  Loader2,
  ImageOff,
  FileText,
  Wrench,
  ScrollText,
  SlidersHorizontal,
  X,
  Share2
} from 'lucide-react';
import api from '../../services/api';
import VehicleDocumentsModal from '../../components/admin/VehicleDocumentsModal';
import VehicleMaintenanceModal from '../../components/admin/VehicleMaintenanceModal';
import PaginationControls from '../../components/common/PaginationControls';
import SortDropdown from '../../components/common/SortDropdown';
import SocialPostModal from '../../components/admin/SocialPostModal';

const AdminInventoryList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, vehicle: null });
  const [socialModal, setSocialModal] = useState({ open: false, vehicle: null });
  const [deleting, setDeleting] = useState(false);
  const [documentsModal, setDocumentsModal] = useState({ open: false, vehicle: null });
  const [maintenanceModal, setMaintenanceModal] = useState({ open: false, vehicle: null });

  // ── Pagination state ──────────────────────────────────────
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // ── Sort / Filter state ───────────────────────────────────
  const [sortBy, setSortBy] = useState('-created_at');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterYear, setFilterYear] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const filterRef = useRef(null);

  // Sort options for the reusable SortDropdown
  const sortOptions = [
    { value: '-created_at', label: 'Newest First' },
    { value: 'created_at',  label: 'Oldest First' },
    { value: '-price',      label: 'Price: High → Low' },
    { value: 'price',       label: 'Price: Low → High' },
    { value: '-year',       label: 'Year: Newest' },
    { value: 'year',        label: 'Year: Oldest' },
    { value: 'mileage',     label: 'Mileage: Low → High' },
    { value: '-mileage',    label: 'Mileage: High → Low' },
  ];

  // Get initial status from URL query param or default to 'ALL'
  const [statusFilter, setStatusFilter] = useState(() => {
    const urlStatus = searchParams.get('status');
    return urlStatus ? urlStatus.toUpperCase() : 'ALL';
  });

  // Update URL when status filter changes
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
    if (status === 'ALL') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', status);
    }
    setSearchParams(searchParams);
  };

  // Status tabs configuration
  const statusTabs = [
    { key: 'ALL', label: 'All Vehicles', color: 'gray' },
    { key: 'ACQUIRED', label: 'Acquired', color: 'gray' },
    { key: 'PREP', label: 'In Prep', color: 'orange' },
    { key: 'READY', label: 'Ready to Sell', color: 'green' },
    { key: 'PENDING', label: 'Pending Deal', color: 'yellow' },
    { key: 'SOLD', label: 'Sold', color: 'red' },
  ];

  // Close filter popover on outside click
  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch vehicles whenever filters / sort / page change
  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      if (sortBy) params.set('ordering', sortBy);
      if (filterYear) params.set('year', filterYear);
      if (filterCondition) params.set('condition', filterCondition);
      params.set('page', currentPage);
      const data = await api.get(`/inventory/vehicles/?${params.toString()}`);
      setVehicles(data.results ?? []);
      setTotalCount(data.count ?? 0);
    } catch (err) {
      setError('Failed to load inventory. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sortBy, currentPage, filterYear, filterCondition, searchQuery]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Search on Enter key
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      setCurrentPage(1);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Delete handler
  const handleDelete = async () => {
    if (!deleteModal.vehicle) return;
    
    try {
      setDeleting(true);
      await api.delete(`/inventory/vehicles/${deleteModal.vehicle.slug}/`);
      setVehicles(vehicles.filter(v => v.id !== deleteModal.vehicle.id));
      setDeleteModal({ open: false, vehicle: null });
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete vehicle. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Status badge styles with lifecycle colors
  const getStatusBadge = (status) => {
    const styles = {
      'ACQUIRED': 'bg-slate-100 text-slate-600 border border-slate-200',
      'PREP': 'bg-brand-100 text-brand-800 border border-brand-200',
      'READY': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      'PENDING': 'bg-amber-100 text-amber-700 border border-amber-200',
      'SOLD': 'bg-red-100 text-red-700 border border-red-200',
    };
    return styles[status] || styles['ACQUIRED'];
  };

  // Status display labels
  const getStatusLabel = (status) => {
    const labels = {
      'ACQUIRED': 'Acquired',
      'PREP': 'In Prep',
      'READY': 'Ready',
      'PENDING': 'Pending',
      'SOLD': 'Sold',
    };
    return labels[status] || status;
  };

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Format mileage
  const formatMileage = (mileage) => {
    return new Intl.NumberFormat('en-US').format(mileage) + ' mi';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
          <p className="text-gray-500 mt-1">Manage your vehicle fleet</p>
        </div>
        <Link
          to="/admin/inventory/new"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white 
            shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors"
        >
          <Plus size={18} />
          Add Vehicle
        </Link>
      </div>

      {/* Search, Sort & Filters */}
      <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by make, model, year, or VIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 
                text-sm text-slate-800 placeholder-gray-400
                focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100
                transition-all"
            />
          </div>

          {/* Sort Dropdown */}
          <SortDropdown
            options={sortOptions}
            currentValue={sortBy}
            onChange={(val) => { setSortBy(val); setCurrentPage(1); }}
          />

          {/* Filter Button + Popover */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5
                text-sm font-medium transition-colors whitespace-nowrap
                ${(filterYear || filterCondition)
                  ? 'border-brand-600 bg-brand-50 text-brand-600'
                  : 'border-gray-200 bg-gray-50 text-slate-700 hover:bg-gray-100'}`}
            >
              <SlidersHorizontal size={16} />
              Filters
              {(filterYear || filterCondition) && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {[filterYear, filterCondition].filter(Boolean).length}
                </span>
              )}
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-12 w-72 rounded-xl border border-gray-100 bg-white shadow-xl z-40 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">Advanced Filters</h4>
                  {(filterYear || filterCondition) && (
                    <button
                      onClick={() => { setFilterYear(''); setFilterCondition(''); setCurrentPage(1); }}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Year */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Year</label>
                  <input
                    type="number"
                    placeholder="e.g. 2024"
                    value={filterYear}
                    onChange={(e) => { setFilterYear(e.target.value); setCurrentPage(1); }}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm
                      focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Condition</label>
                  <div className="flex gap-2">
                    {[
                      { value: '', label: 'All' },
                      { value: 'NEW', label: 'New' },
                      { value: 'USED', label: 'Used' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setFilterCondition(opt.value); setCurrentPage(1); }}
                        className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors
                          ${filterCondition === opt.value
                            ? 'border-brand-600 bg-brand-50 text-brand-600'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setFilterOpen(false)}
                  className="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {(filterYear || filterCondition) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {filterYear && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-medium text-brand-800">
                Year: {filterYear}
                <button onClick={() => { setFilterYear(''); setCurrentPage(1); }}><X size={12} /></button>
              </span>
            )}
            {filterCondition && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-medium text-brand-800">
                {filterCondition}
                <button onClick={() => { setFilterCondition(''); setCurrentPage(1); }}><X size={12} /></button>
              </span>
            )}
          </div>
        )}

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.key;
            const colorClasses = {
              gray: isActive ? 'bg-slate-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100',
              orange: isActive ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700 hover:bg-brand-100',
              green: isActive ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
              yellow: isActive ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100',
              red: isActive ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100',
            };
            return (
              <button
                key={tab.key}
                onClick={() => handleStatusFilterChange(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${colorClasses[tab.color]}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            <span className="ml-3 text-gray-500">Loading inventory...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-500">
            <AlertCircle size={40} className="mb-3" />
            <p>{error}</p>
            <button 
              onClick={fetchVehicles}
              className="mt-4 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Try Again
            </button>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Car size={48} className="mb-3 text-gray-300" />
            <p className="text-lg font-medium">No vehicles found</p>
            <p className="text-sm mt-1">
              {searchQuery ? 'Try a different search term' : 'Add your first vehicle to get started'}
            </p>
            {!searchQuery && (
              <Link 
                to="/admin/inventory/new"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                <Plus size={16} />
                Add Vehicle
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full block md:table">
            {/* Table header – visible on desktop only */}
            <thead className="hidden md:table-header-group bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  VIN
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Mileage
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="block md:table-row-group divide-y md:divide-y divide-gray-100">
              {vehicles.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className="flex flex-col md:table-row border border-gray-100 md:border-0 mb-4 md:mb-0 rounded-xl md:rounded-none shadow-sm md:shadow-none p-4 md:p-0 bg-white hover:bg-gray-50/50 transition-colors"
                >
                  {/* ── Vehicle Info ── */}
                  <td className="flex items-center gap-4 py-2 md:py-4 md:px-6">
                    {/* Thumbnail */}
                    <div className="h-14 w-20 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                      {vehicle.images && vehicle.images.length > 0 ? (
                        <img
                          src={vehicle.images[0].image}
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <ImageOff size={20} className="text-gray-300" />
                        </div>
                      )}
                    </div>
                    {/* Title */}
                    <div>
                      <Link
                        to={`/admin/inventory/edit/${vehicle.slug}`}
                        className="font-semibold text-slate-800 hover:text-brand-600 transition-colors"
                      >
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </Link>
                      {vehicle.trim && (
                        <p className="text-sm text-gray-500">{vehicle.trim}</p>
                      )}
                    </div>
                  </td>

                  {/* ── VIN ── */}
                  <td className="flex justify-between items-center md:table-cell py-2 md:py-4 md:px-6">
                    <span className="md:hidden font-semibold text-gray-500 text-xs uppercase">VIN</span>
                    <span className="font-mono text-sm text-gray-600">{vehicle.vin}</span>
                  </td>

                  {/* ── Price ── */}
                  <td className="flex justify-between items-center md:table-cell py-2 md:py-4 md:px-6">
                    <span className="md:hidden font-semibold text-gray-500 text-xs uppercase">Price</span>
                    <span className="font-semibold text-slate-800">{formatPrice(vehicle.price)}</span>
                  </td>

                  {/* ── Mileage ── */}
                  <td className="flex justify-between items-center md:table-cell py-2 md:py-4 md:px-6">
                    <span className="md:hidden font-semibold text-gray-500 text-xs uppercase">Mileage</span>
                    <span className="text-gray-600">{formatMileage(vehicle.mileage)}</span>
                  </td>

                  {/* ── Status ── */}
                  <td className="flex justify-between items-center md:table-cell py-2 md:py-4 md:px-6">
                    <span className="md:hidden font-semibold text-gray-500 text-xs uppercase">Status</span>
                    <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusBadge(vehicle.status)}`}>
                      {getStatusLabel(vehicle.status)}
                    </span>
                  </td>

                  {/* ── Actions ── */}
                  <td className="flex justify-center md:justify-end items-center md:table-cell py-3 md:py-4 md:px-6 mt-2 md:mt-0 border-t border-gray-100 md:border-t-0">
                    <div className="flex items-center gap-2 flex-wrap justify-center md:justify-end">
                      <button
                        onClick={() => setMaintenanceModal({ open: true, vehicle })}
                        className="p-2 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Service & Repairs"
                      >
                        <Wrench size={18} />
                      </button>
                      <button
                        onClick={() => setDocumentsModal({ open: true, vehicle })}
                        className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Documents"
                      >
                        <FileText size={18} />
                      </button>
                      <button
                        onClick={() => window.open(`/report/${vehicle.vin}`, '_blank')}
                        className="p-2 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="View History Report"
                      >
                        <ScrollText size={18} />
                      </button>
                      <button
                        onClick={() => setSocialModal({ open: true, vehicle })}
                        className="p-2 rounded-lg text-gray-500 hover:text-[#1877F2] hover:bg-blue-50 transition-colors"
                        title="Post to Social Media"
                      >
                        <Share2 size={18} />
                      </button>
                      <Link
                        to={`/admin/inventory/edit/${vehicle.slug}`}
                        className="p-2 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </Link>
                      <button
                        onClick={() => setDeleteModal({ open: true, vehicle })}
                        className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
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
      {!loading && !error && vehicles.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          label="vehicles"
          onPageChange={setCurrentPage}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Delete Vehicle</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-800">
                {deleteModal.vehicle?.year} {deleteModal.vehicle?.make} {deleteModal.vehicle?.model}
              </span>
              ? This action cannot be undone.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal({ open: false, vehicle: null })}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 
                  hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-sm font-medium text-white 
                  hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting && <Loader2 size={16} className="animate-spin" />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Documents Modal */}
      {documentsModal.open && documentsModal.vehicle && (
        <VehicleDocumentsModal
          isOpen={true}
          vehicle={documentsModal.vehicle}
          onClose={() => setDocumentsModal({ open: false, vehicle: null })}
        />
      )}

      {/* Vehicle Maintenance Modal */}
      {maintenanceModal.open && maintenanceModal.vehicle && (
        <VehicleMaintenanceModal
          isOpen={true}
          vehicle={maintenanceModal.vehicle}
          onClose={() => setMaintenanceModal({ open: false, vehicle: null })}
        />
      )}

      {/* Social Media Post Modal */}
      {socialModal.open && socialModal.vehicle && (
        <SocialPostModal
          vehicle={socialModal.vehicle}
          onClose={() => setSocialModal({ open: false, vehicle: null })}
        />
      )}
    </div>
  );
};

export default AdminInventoryList;
