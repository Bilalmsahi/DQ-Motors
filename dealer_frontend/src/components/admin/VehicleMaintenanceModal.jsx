import { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Wrench,
  Eye,
  EyeOff,
  Trash2,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Calendar,
  DollarSign,
  FileText,
  Image as ImageIcon,
  Camera
} from 'lucide-react';
import api from '../../services/api';

// Service type configuration with icons
const SERVICE_TYPE_CONFIG = {
  OIL_CHANGE: { label: 'Oil Change', icon: '🛢️', color: 'bg-amber-100 text-amber-700' },
  TIRE_ROTATION: { label: 'Tire Rotation', icon: '🔄', color: 'bg-blue-100 text-blue-700' },
  TIRE_REPLACEMENT: { label: 'Tire Replacement', icon: '🛞', color: 'bg-slate-100 text-slate-700' },
  BRAKE_SERVICE: { label: 'Brake Service', icon: '🛑', color: 'bg-red-100 text-red-700' },
  TRANSMISSION: { label: 'Transmission Service', icon: '⚙️', color: 'bg-purple-100 text-purple-700' },
  ENGINE_REPAIR: { label: 'Engine Repair', icon: '🔧', color: 'bg-brand-100 text-brand-800' },
  BODY_WORK: { label: 'Body Work', icon: '🚗', color: 'bg-indigo-100 text-indigo-700' },
  PAINT: { label: 'Paint / Touch-up', icon: '🎨', color: 'bg-pink-100 text-pink-700' },
  ELECTRICAL: { label: 'Electrical', icon: '⚡', color: 'bg-yellow-100 text-yellow-700' },
  AC_HEATING: { label: 'AC / Heating', icon: '❄️', color: 'bg-cyan-100 text-cyan-700' },
  SUSPENSION: { label: 'Suspension', icon: '🔩', color: 'bg-gray-100 text-gray-700' },
  EXHAUST: { label: 'Exhaust System', icon: '💨', color: 'bg-stone-100 text-stone-700' },
  INSPECTION: { label: 'Inspection', icon: '🔍', color: 'bg-green-100 text-green-700' },
  DETAILING: { label: 'Detailing', icon: '✨', color: 'bg-emerald-100 text-emerald-700' },
  OTHER: { label: 'Other', icon: '📋', color: 'bg-gray-100 text-gray-700' },
};

const VehicleMaintenanceModal = ({ isOpen, onClose, vehicle }) => {
  // Records state
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    category: 'REPAIR',
    service_type: '',
    custom_service_type: '',
    vendor: '',
    vendor_name: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    is_public: false,
  });
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoCaptions, setPhotoCaptions] = useState([]);
  const [saving, setSaving] = useState(false);

  // Action loading states
  const [actionLoading, setActionLoading] = useState(null);

  // Refs
  const invoiceInputRef = useRef(null);
  const photosInputRef = useRef(null);

  // Fetch service types
  const [serviceTypes, setServiceTypes] = useState([]);

  // Fetch vendors
  const [vendors, setVendors] = useState([]);

  const fetchRecords = async () => {
    if (!vehicle) return;
    
    setLoading(true);
    setError(null);
    try {
      // Fetch repair/maintenance expenses for this vehicle
      const data = await api.get(`/financials/expenses/?vehicle=${vehicle.id}&category=REPAIR`);
      setRecords(data.results || data);
    } catch (err) {
      console.error('Failed to fetch records:', err);
      setError('Failed to load service records');
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceTypes = async () => {
    try {
      const data = await api.get('/financials/expenses/service_types/');
      setServiceTypes(data);
    } catch (err) {
      console.error('Failed to fetch service types:', err);
    }
  };

  const fetchVendors = async () => {
    try {
      const data = await api.get('/financials/vendors/active/');
      setVendors(data);
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    }
  };

  // Fetch records when modal opens
  useEffect(() => {
    if (isOpen && vehicle) {
      fetchRecords();
      fetchServiceTypes();
      fetchVendors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, vehicle]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle invoice file selection
  const handleInvoiceChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setInvoiceFile(file);
    }
  };

  // Handle photo files selection
  const handlePhotosChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPhotoFiles(prev => [...prev, ...files]);
      // Initialize captions for new photos
      setPhotoCaptions(prev => [...prev, ...files.map(() => 'OTHER')]);
    }
  };

  // Remove a photo
  const removePhoto = (index) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoCaptions(prev => prev.filter((_, i) => i !== index));
  };

  // Update photo caption
  const updatePhotoCaption = (index, caption) => {
    setPhotoCaptions(prev => {
      const newCaptions = [...prev];
      newCaptions[index] = caption;
      return newCaptions;
    });
  };

  // Submit new record
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Create the expense record
      const expenseFormData = new FormData();
      expenseFormData.append('vehicle', vehicle.id);
      expenseFormData.append('category', 'REPAIR');
      expenseFormData.append('service_type', formData.service_type || 'OTHER');
      expenseFormData.append('amount', formData.amount);
      expenseFormData.append('date', formData.date);
      
      // Use vendor FK if selected, otherwise use vendor_name text
      if (formData.vendor) {
        expenseFormData.append('vendor', formData.vendor);
      } else if (formData.vendor_name) {
        expenseFormData.append('vendor_name', formData.vendor_name);
      }
      
      expenseFormData.append('description', formData.description);
      expenseFormData.append('is_public', formData.is_public);
      
      if (invoiceFile) {
        expenseFormData.append('invoice_file', invoiceFile);
      }

      const newRecord = await api.upload('/financials/expenses/', expenseFormData);

      // Upload photos if any
      if (photoFiles.length > 0) {
        for (let i = 0; i < photoFiles.length; i++) {
          const photoFormData = new FormData();
          photoFormData.append('expense', newRecord.id);
          photoFormData.append('image', photoFiles[i]);
          photoFormData.append('caption', photoCaptions[i] || 'OTHER');
          photoFormData.append('order', i);
          
          await api.upload('/financials/expense-images/', photoFormData);
        }
      }

      setSuccess('Service record added successfully!');
      
      // Reset form
      setFormData({
        category: 'REPAIR',
        service_type: '',
        custom_service_type: '',
        vendor: '',
        vendor_name: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        is_public: false,
      });
      setInvoiceFile(null);
      setPhotoFiles([]);
      setPhotoCaptions([]);
      setShowAddForm(false);
      
      // Refresh list
      fetchRecords();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      setError('Failed to add service record: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle visibility
  const handleToggleVisibility = async (record) => {
    setActionLoading(record.id);
    try {
      await api.patch(`/financials/expenses/${record.id}/`, {
        is_public: !record.is_public
      });
      
      setRecords(prev => prev.map(r => 
        r.id === record.id ? { ...r, is_public: !r.is_public } : r
      ));
      
      setSuccess(`Record ${!record.is_public ? 'now visible' : 'hidden from'} customers`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Toggle visibility failed:', err);
      setError('Failed to update visibility');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete record
  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this service record?')) return;

    setActionLoading(recordId);
    try {
      await api.delete(`/financials/expenses/${recordId}/`);
      setRecords(prev => prev.filter(r => r.id !== recordId));
      setSuccess('Record deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete record');
    } finally {
      setActionLoading(null);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100">
              <Wrench className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Service & Repairs</h2>
              {vehicle && (
                <p className="text-sm text-gray-500">
                  {vehicle.year} {vehicle.make} {vehicle.model} • {vehicle.vin}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-green-700">
              <CheckCircle size={18} />
              <span className="text-sm font-medium">{success}</span>
            </div>
          )}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-red-700">
              <AlertCircle size={18} />
              <span className="text-sm font-medium">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Add New Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mb-6 flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white 
                shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors"
            >
              <Plus size={18} />
              Add Service Record
            </button>
          )}

          {/* Add Form */}
          {showAddForm && (
            <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">New Service Record</h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              {/* ── Invoice Upload — prominent at top ── */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                  <FileText size={15} className="text-brand-600" />
                  Invoice / Receipt
                </label>
                <input
                  type="file"
                  ref={invoiceInputRef}
                  onChange={handleInvoiceChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => invoiceInputRef.current?.click()}
                  className={`w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-sm transition-colors ${
                    invoiceFile
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-gray-300 bg-white text-gray-500 hover:border-brand-600 hover:bg-brand-50'
                  }`}
                >
                  <Upload size={22} className={invoiceFile ? 'text-brand-600' : 'text-gray-400'} />
                  {invoiceFile ? (
                    <span className="font-medium">{invoiceFile.name}</span>
                  ) : (
                    <>
                      <span className="font-medium text-gray-700">Click to upload invoice</span>
                      <span className="text-xs text-gray-400">PDF, JPG or PNG</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Service Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Type *
                  </label>
                  <div className="relative">
                    <select
                      name="service_type"
                      value={formData.service_type}
                      onChange={handleInputChange}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 
                        text-sm text-gray-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      required
                    >
                      <option value="">Select service type...</option>
                      {serviceTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {SERVICE_TYPE_CONFIG[type.value]?.icon || '📋'} {type.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Vendor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor / Shop
                  </label>
                  <div className="relative">
                    <select
                      name="vendor"
                      value={formData.vendor}
                      onChange={handleInputChange}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10
                        text-sm text-gray-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    >
                      <option value="">Select a vendor...</option>
                      {vendors.map(vendor => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name} ({vendor.service_category_display})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {/* Fallback text input if vendor not in list */}
                  {!formData.vendor && (
                    <input
                      type="text"
                      name="vendor_name"
                      value={formData.vendor_name}
                      onChange={handleInputChange}
                      placeholder="Or type vendor name if not in list..."
                      className="w-full mt-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 
                        text-sm text-gray-900 placeholder-gray-400
                        focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  )}
                </div>

                {/* Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost *
                  </label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 
                        text-sm text-gray-900 placeholder-gray-400
                        focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      required
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 
                        text-sm text-gray-900
                        focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      required
                    />
                  </div>
                </div>

                {/* Description - Full Width */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description / Work Done
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Detailed log of work performed..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 
                      text-sm text-gray-900 placeholder-gray-400 resize-none
                      focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                {/* Visibility Toggle */}
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_public"
                      checked={formData.is_public}
                      onChange={handleInputChange}
                      className="h-5 w-5 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Show on Public Website</span>
                      <p className="text-xs text-gray-500">
                        If checked, this service record will be visible to customers on the vehicle detail page
                      </p>
                    </div>
                  </label>
                </div>

                {/* Photos Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Before/After Photos
                  </label>
                  <input
                    type="file"
                    ref={photosInputRef}
                    onChange={handlePhotosChange}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => photosInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 
                      bg-white px-4 py-3 text-sm text-gray-600 hover:border-brand-600 hover:bg-brand-50 transition-colors"
                  >
                    <Camera size={18} />
                    Add Photos ({photoFiles.length})
                  </button>
                </div>

                {/* Photo Previews */}
                {photoFiles.length > 0 && (
                  <div className="sm:col-span-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Photos</p>
                    <div className="flex flex-wrap gap-3">
                      {photoFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Photo ${index + 1}`}
                            className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                          />
                          <select
                            value={photoCaptions[index]}
                            onChange={(e) => updatePhotoCaption(index, e.target.value)}
                            className="absolute bottom-0 left-0 right-0 text-xs bg-black/70 text-white p-1 rounded-b-lg"
                          >
                            <option value="BEFORE">Before</option>
                            <option value="AFTER">After</option>
                            <option value="DURING">During</option>
                            <option value="PARTS">Parts</option>
                            <option value="OTHER">Other</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 
                    hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 text-sm font-semibold text-white 
                    hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          )}

          {/* Timeline View */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
              <span className="ml-3 text-gray-500">Loading service records...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Wrench size={48} className="mb-3 text-gray-300" />
              <p className="text-lg font-medium">No service records</p>
              <p className="text-sm mt-1">Add your first service record to start tracking</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

              {/* Timeline Items */}
              <div className="space-y-6">
                {records.map((record) => {
                  const config = SERVICE_TYPE_CONFIG[record.service_type] || SERVICE_TYPE_CONFIG.OTHER;
                  
                  return (
                    <div key={record.id} className="relative flex gap-4 pl-14">
                      {/* Timeline Dot */}
                      <div className="absolute left-4 flex h-5 w-5 items-center justify-center rounded-full bg-white border-2 border-gray-300">
                        <div className="h-2 w-2 rounded-full bg-brand-600" />
                      </div>

                      {/* Card */}
                      <div className="flex-1 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          {/* Left: Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
                                <span>{config.icon}</span>
                                {config.label}
                              </span>
                              {record.is_public && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                  <Eye size={12} />
                                  Public
                                </span>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">{record.description || 'No description provided'}</p>
                            
                            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {formatDate(record.date)}
                              </span>
                              {record.vendor_display && record.vendor_display !== 'N/A' && (
                                <span>Vendor: {record.vendor_display}</span>
                              )}
                              <span className="font-semibold text-gray-900">
                                {formatCurrency(record.amount)}
                              </span>
                            </div>

                            {/* Images Preview */}
                            {record.images && record.images.length > 0 && (
                              <div className="flex gap-2 mt-3">
                                {record.images.slice(0, 4).map((img, idx) => (
                                  <a
                                    key={img.id}
                                    href={img.image_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative"
                                  >
                                    <img
                                      src={img.image_url}
                                      alt={img.caption_display}
                                      className="h-12 w-12 rounded-lg object-cover border border-gray-200 hover:ring-2 hover:ring-brand-600 transition-all"
                                    />
                                    {idx === 3 && record.images.length > 4 && (
                                      <div className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center text-white text-xs font-medium">
                                        +{record.images.length - 4}
                                      </div>
                                    )}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-1 ml-4">
                            {/* Toggle Visibility */}
                            <button
                              onClick={() => handleToggleVisibility(record)}
                              disabled={actionLoading === record.id}
                              className={`p-2 rounded-lg transition-colors ${
                                record.is_public 
                                  ? 'text-green-600 hover:bg-green-50' 
                                  : 'text-gray-400 hover:bg-gray-100'
                              }`}
                              title={record.is_public ? 'Hide from customers' : 'Show to customers'}
                            >
                              {actionLoading === record.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : record.is_public ? (
                                <Eye size={16} />
                              ) : (
                                <EyeOff size={16} />
                              )}
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(record.id)}
                              disabled={actionLoading === record.id}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete record"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {records.length} service record{records.length !== 1 ? 's' : ''} • 
            {records.filter(r => r.is_public).length} visible to customers
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 
              hover:bg-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleMaintenanceModal;
