import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  History,
  Wrench,
  Car,
  Calendar,
  DollarSign,
  FileText,
  ExternalLink,
  Loader2,
  AlertCircle,
  Filter,
  X,
  ChevronDown,
  CheckCircle,
  Download
} from 'lucide-react';
import api from '../../services/api';

// Service type configuration
const SERVICE_TYPE_CONFIG = {
  OIL_CHANGE: { label: 'Oil Change', icon: '🛢️', color: 'bg-amber-100 text-amber-700' },
  TIRE_ROTATION: { label: 'Tire Rotation', icon: '🔄', color: 'bg-blue-100 text-blue-700' },
  TIRE_REPLACEMENT: { label: 'Tire Replacement', icon: '🛞', color: 'bg-slate-100 text-slate-700' },
  BRAKE_SERVICE: { label: 'Brake Service', icon: '🛑', color: 'bg-red-100 text-red-700' },
  TRANSMISSION: { label: 'Transmission', icon: '⚙️', color: 'bg-purple-100 text-purple-700' },
  ENGINE_REPAIR: { label: 'Engine Repair', icon: '🔧', color: 'bg-brand-100 text-brand-800' },
  BODY_WORK: { label: 'Body Work', icon: '🚗', color: 'bg-indigo-100 text-indigo-700' },
  PAINT: { label: 'Paint', icon: '🎨', color: 'bg-pink-100 text-pink-700' },
  ELECTRICAL: { label: 'Electrical', icon: '⚡', color: 'bg-yellow-100 text-yellow-700' },
  AC_HEATING: { label: 'AC / Heating', icon: '❄️', color: 'bg-cyan-100 text-cyan-700' },
  SUSPENSION: { label: 'Suspension', icon: '🔩', color: 'bg-gray-100 text-gray-700' },
  EXHAUST: { label: 'Exhaust', icon: '💨', color: 'bg-stone-100 text-stone-700' },
  INSPECTION: { label: 'Inspection', icon: '📋', color: 'bg-emerald-100 text-emerald-700' },
  DETAILING: { label: 'Detailing', icon: '✨', color: 'bg-violet-100 text-violet-700' },
  OTHER: { label: 'Other', icon: '📦', color: 'bg-gray-100 text-gray-700' },
};

const AdminHistorySearch = () => {
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Data state
  const [records, setRecords] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch service types on mount
  useEffect(() => {
    const fetchServiceTypes = async () => {
      try {
        const types = await api.get('/financials/expenses/service_types/');
        setServiceTypes(types);
      } catch (err) {
        console.error('Failed to fetch service types:', err);
      }
    };
    fetchServiceTypes();
  }, []);

  // Fetch records when filters change
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();
      
      // Only include service records (REPAIR category or has service_type)
      params.append('category', 'REPAIR');
      
      if (debouncedQuery) {
        params.append('search', debouncedQuery);
      }
      if (serviceTypeFilter) {
        params.append('service_type', serviceTypeFilter);
      }
      if (dateFrom) {
        params.append('date_from', dateFrom);
      }
      if (dateTo) {
        params.append('date_to', dateTo);
      }

      const data = await api.get(`/financials/expenses/?${params.toString()}`);
      setRecords(data.results || data);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to fetch records:', err);
      setError('Failed to load service records');
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, serviceTypeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setServiceTypeFilter('');
    setDateFrom('');
    setDateTo('');
  };

  // Pagination logic
  const totalPages = Math.ceil(records.length / recordsPerPage);
  const paginatedRecords = records.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // Check if any filters are active
  const hasActiveFilters = searchQuery || serviceTypeFilter || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Global Work History</h1>
          <p className="text-gray-500 mt-1">Search across all service records for all vehicles</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <History className="h-4 w-4" />
          <span>{records.length} records found</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {/* Main Search Bar */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search service records... (e.g., 'Alternator', 'Oil Change', 'Brake pads')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 
                  focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  text-gray-900 placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-5 w-5" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-xs">
                  !
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Service Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                <div className="relative">
                  <select
                    value={serviceTypeFilter}
                    onChange={(e) => setServiceTypeFilter(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2.5 pr-10
                      text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">All Service Types</option>
                    {serviceTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {SERVICE_TYPE_CONFIG[type.value]?.icon} {type.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5
                    text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5
                    text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <X className="h-4 w-4" />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Searching records...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-red-600">
            <AlertCircle className="h-6 w-6 mr-2" />
            <span>{error}</span>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Wrench className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-lg font-medium">No service records found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <table className="w-full block md:table">
            <thead className="hidden md:table-header-group">
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Service Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group">
              {paginatedRecords.map((record) => {
                const serviceConfig = SERVICE_TYPE_CONFIG[record.service_type] || SERVICE_TYPE_CONFIG.OTHER;
                
                return (
                  <tr key={record.id} className="block md:table-row bg-white border border-gray-200 md:border-b md:border-x-0 md:border-t-0 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50 transition-colors">
                    {/* Date */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Date</span>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{formatDate(record.date)}</span>
                      </div>
                    </td>

                    {/* Vehicle */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Vehicle</span>
                      <Link
                        to={`/admin/inventory/edit/${record.vehicle_slug}`}
                        className="group flex items-center gap-2"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 shrink-0">
                          <Car className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {record.vehicle_title}
                        </span>
                        <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </td>

                    {/* Service Type */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Service Type</span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${serviceConfig.color}`}>
                        <span>{serviceConfig.icon}</span>
                        <span>{serviceConfig.label}</span>
                      </span>
                    </td>

                    {/* Vendor */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Vendor</span>
                      <span className="text-gray-600">
                        {record.vendor_display || record.vendor_name || '—'}
                      </span>
                    </td>

                    {/* Cost */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Cost</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(record.amount)}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Description</span>
                      <p className="text-gray-600 md:max-w-xs truncate" title={record.description}>
                        {record.description || '—'}
                      </p>
                    </td>

                    {/* Invoice */}
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                      <span className="md:hidden font-semibold text-gray-500">Invoice</span>
                      {record.invoice_url ? (
                        <a
                          href={record.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 
                            text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">View</span>
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * recordsPerPage + 1} to {Math.min(currentPage * recordsPerPage, records.length)} of {records.length} records
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium
                  disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium
                  disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {records.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{records.length}</p>
                <p className="text-sm text-gray-500">Total Records</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(records.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0))}
                </p>
                <p className="text-sm text-gray-500">Total Spent</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Car className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(records.map(r => r.vehicle)).size}
                </p>
                <p className="text-sm text-gray-500">Vehicles Serviced</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHistorySearch;
