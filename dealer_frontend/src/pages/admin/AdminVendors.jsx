import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  MapPin,
  Star,
  DollarSign,
  Wrench,
  Edit3,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ExternalLink,
  Calendar,
  Car,
  TrendingUp,
  BarChart3,
  Filter,
  CreditCard,
  Landmark
} from 'lucide-react';
import api from '../../services/api';

// Service category configuration
const CATEGORY_CONFIG = {
  MECHANIC: { label: 'Mechanic / Repair Shop', icon: '🔧', color: 'bg-amber-100 text-amber-700' },
  BODY_SHOP: { label: 'Body Shop / Paint', icon: '🎨', color: 'bg-pink-100 text-pink-700' },
  TRANSPORTER: { label: 'Transporter / Shipping', icon: '🚚', color: 'bg-blue-100 text-blue-700' },
  DMV_TITLE: { label: 'DMV / Title Services', icon: '📋', color: 'bg-purple-100 text-purple-700' },
  DETAILING: { label: 'Detailing / Cleaning', icon: '✨', color: 'bg-cyan-100 text-cyan-700' },
  PARTS: { label: 'Parts Supplier', icon: '⚙️', color: 'bg-slate-100 text-slate-700' },
  OTHER: { label: 'Other', icon: '📦', color: 'bg-gray-100 text-gray-700' },
};

// Star rating component
const StarRating = ({ rating, onChange, readonly = false, size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange && onChange(star)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}`}
        >
          <Star
            className={`${sizeClass} ${
              star <= rating
                ? 'fill-amber-400 text-amber-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const AdminVendors = () => {
  const navigate = useNavigate();
  // State
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    service_category: 'OTHER',
    phone: '',
    email: '',
    address: '',
    rating: 3,
    notes: '',
    is_active: true,
    tax_id: '',
    payment_terms: 'DUE_ON_RECEIPT',
    preferred_payment_method: 'CHECK',
    account_details: '',
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Fetch vendors
  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (categoryFilter) params.append('service_category', categoryFilter);
      if (activeFilter) params.append('is_active', activeFilter);

      const data = await api.get(`/financials/vendors/?${params.toString()}`);
      setVendors(data.results || data);
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
      setError('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, activeFilter]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await api.get('/financials/vendors/categories/');
        setCategories(data);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch vendors when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchVendors]);

  // Fetch vendor stats and expenses
  const fetchVendorDetails = async (vendor) => {
    navigate(`/admin/vendors/${vendor.id}`);
  };

  // Handle form input
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Open modal for new vendor
  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      name: '',
      service_category: 'OTHER',
      phone: '',
      email: '',
      address: '',
      rating: 3,
      notes: '',
      is_active: true,
      tax_id: '',
      payment_terms: 'DUE_ON_RECEIPT',
      preferred_payment_method: 'CHECK',
      account_details: '',
    });
    setShowModal(true);
  };

  // Open modal for editing
  const handleEdit = (vendor) => {
    setEditingId(vendor.id);
    setFormData({
      name: vendor.name,
      service_category: vendor.service_category,
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      rating: vendor.rating,
      notes: vendor.notes || '',
      is_active: vendor.is_active,
      tax_id: vendor.tax_id || '',
      payment_terms: vendor.payment_terms || 'DUE_ON_RECEIPT',
      preferred_payment_method: vendor.preferred_payment_method || 'CHECK',
      account_details: vendor.account_details || '',
    });
    setShowModal(true);
  };

  // Save vendor
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        await api.put(`/financials/vendors/${editingId}/`, formData);
        setSuccess('Vendor updated successfully');
      } else {
        await api.post('/financials/vendors/', formData);
        setSuccess('Vendor created successfully');
      }
      setShowModal(false);
      fetchVendors();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      setError('Failed to save vendor');
    } finally {
      setSaving(false);
    }
  };

  // Delete vendor
  const handleDelete = async (vendorId) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;

    try {
      await api.delete(`/financials/vendors/${vendorId}/`);
      setSuccess('Vendor deleted successfully');
      fetchVendors();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete vendor');
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-gray-500 mt-1">Manage your approved vendors and track spending</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 
            font-semibold text-white shadow-lg shadow-brand-600/25 
            hover:bg-brand-700 transition-all"
        >
          <Plus size={20} />
          Add Vendor
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-700">
          <CheckCircle size={20} />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 
                  focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter size={20} />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="p-4 bg-gray-50 border-b border-gray-100 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
          </div>
        )}

        {/* Vendors Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
          ) : vendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Building2 className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-lg font-medium">No vendors found</p>
              <p className="text-sm mt-1">Add your first vendor to get started</p>
            </div>
          ) : (
            <table className="w-full block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Rating</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Total Spend</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Jobs</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {vendors.map((vendor) => {
                  const categoryConfig = CATEGORY_CONFIG[vendor.service_category] || CATEGORY_CONFIG.OTHER;
                  
                  return (
                    <tr key={vendor.id} className="block md:table-row bg-white border border-gray-200 md:border-b md:border-x-0 md:border-t-0 rounded-xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50 transition-colors">
                      {/* Vendor Name & Contact */}
                      <td className="flex items-center gap-3 md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                        <button
                          onClick={() => fetchVendorDetails(vendor)}
                          className="text-left group"
                        >
                          <p className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
                            {vendor.name}
                          </p>
                          {vendor.phone && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {vendor.phone}
                            </p>
                          )}
                        </button>
                      </td>

                      {/* Category */}
                      <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                        <span className="md:hidden font-semibold text-gray-500">Category</span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${categoryConfig.color}`}>
                          <span>{categoryConfig.icon}</span>
                          <span>{categoryConfig.label}</span>
                        </span>
                      </td>

                      {/* Rating */}
                      <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                        <span className="md:hidden font-semibold text-gray-500">Rating</span>
                        <StarRating rating={vendor.rating} readonly size="sm" />
                      </td>

                      {/* Total Spend */}
                      <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                        <span className="md:hidden font-semibold text-gray-500">Total Spend</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(vendor.total_spend)}
                        </span>
                      </td>

                      {/* Job Count */}
                      <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                        <span className="md:hidden font-semibold text-gray-500">Jobs</span>
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                          {vendor.job_count}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="flex justify-between items-center md:table-cell py-3 md:py-4 md:px-6 border-b border-gray-100 md:border-0 last:border-0 text-sm">
                        <span className="md:hidden font-semibold text-gray-500">Status</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          vendor.is_active 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {vendor.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="flex justify-end gap-2 mt-2 md:mt-0 pt-2 md:pt-0 border-t border-gray-100 md:border-0 md:table-cell md:py-4 md:px-6 text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => fetchVendorDetails(vendor)}
                            className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                            title="View Details"
                          >
                            <BarChart3 size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(vendor)}
                            className="p-2 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                            title="Edit"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(vendor.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>

      {/* Add/Edit Vendor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Vendor' : 'Add New Vendor'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Joe's Auto Shop"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  required
                />
              </div>

              {/* Service Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Category *
                </label>
                <div className="relative">
                  <select
                    name="service_category"
                    value={formData.service_category}
                    onChange={handleInputChange}
                    className="w-full appearance-none rounded-xl border border-gray-200 px-4 py-3 pr-10 focus:border-brand-600 focus:outline-none"
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {CATEGORY_CONFIG[cat.value]?.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="(555) 123-4567"
                      className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 focus:border-brand-600 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="vendor@email.com"
                      className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 focus:border-brand-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="123 Main St, City, State ZIP"
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 focus:border-brand-600 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality Rating
                </label>
                <div className="flex items-center gap-3">
                  <StarRating
                    rating={formData.rating}
                    onChange={(rating) => setFormData(prev => ({ ...prev, rating }))}
                  />
                  <span className="text-sm text-gray-500">
                    {formData.rating} star{formData.rating !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Internal notes about this vendor..."
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-600 focus:outline-none resize-none"
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="h-5 w-5 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                />
                <div>
                  <p className="font-medium text-gray-900">Active Vendor</p>
                  <p className="text-sm text-gray-500">
                    Inactive vendors won't appear in dropdown selections
                  </p>
                </div>
              </div>

              {/* Financial Details Section */}
              <div className="border-t border-gray-200 pt-4 mt-2">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Landmark size={16} className="text-gray-400" />
                  Financial Details
                </h3>

                {/* Tax ID */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID (EIN / SSN)</label>
                  <input
                    type="text"
                    name="tax_id"
                    value={formData.tax_id}
                    onChange={handleInputChange}
                    placeholder="e.g., 12-3456789"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                {/* Payment Terms & Method */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                    <div className="relative">
                      <select
                        name="payment_terms"
                        value={formData.payment_terms}
                        onChange={handleInputChange}
                        className="w-full appearance-none rounded-xl border border-gray-200 px-4 py-3 pr-10 focus:border-brand-600 focus:outline-none"
                      >
                        <option value="DUE_ON_RECEIPT">Due on Receipt</option>
                        <option value="NET_15">Net 15</option>
                        <option value="NET_30">Net 30</option>
                        <option value="NET_60">Net 60</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <div className="relative">
                      <select
                        name="preferred_payment_method"
                        value={formData.preferred_payment_method}
                        onChange={handleInputChange}
                        className="w-full appearance-none rounded-xl border border-gray-200 px-4 py-3 pr-10 focus:border-brand-600 focus:outline-none"
                      >
                        <option value="CHECK">Check</option>
                        <option value="WIRE">Wire Transfer</option>
                        <option value="ACH">ACH</option>
                        <option value="CASH">Cash</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Account Details */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank / Account Details</label>
                  <textarea
                    name="account_details"
                    value={formData.account_details}
                    onChange={handleInputChange}
                    placeholder="e.g., Bank: Chase, Routing: 021000021, Acct: ****1234"
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-600 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <CheckCircle size={18} />
                  )}
                  {editingId ? 'Update Vendor' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminVendors;
