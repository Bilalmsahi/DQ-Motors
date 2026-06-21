import { useState, useEffect } from 'react';
import {
  X,
  Upload,
  FileText,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  File,
  FileImage,
  FilePlus
} from 'lucide-react';
import api from '../../services/api';
import FilePreviewModal from '../common/FilePreviewModal';

// Document type configuration
const DOC_TYPE_CONFIG = {
  INSPECTION: { label: 'Inspection Report', icon: '🔍', color: 'bg-green-100 text-green-700' },
  SERVICE_RECORD: { label: 'Service Record', icon: '🔧', color: 'bg-blue-100 text-blue-700' },
  OWNERSHIP: { label: 'Ownership / Title', icon: '📜', color: 'bg-purple-100 text-purple-700' },
  WARRANTY: { label: 'Warranty Document', icon: '🛡️', color: 'bg-amber-100 text-amber-700' },
  CARFAX: { label: 'Carfax / Vehicle History', icon: '📊', color: 'bg-cyan-100 text-cyan-700' },
  OTHER: { label: 'Other', icon: '📄', color: 'bg-gray-100 text-gray-700' },
};

const VehicleDocumentsModal = ({ isOpen, onClose, vehicle }) => {
  // Documents state
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Upload form state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    doc_type: 'OTHER',
    is_public: false,
    description: '',
    file: null,
  });
  const [uploading, setUploading] = useState(false);

  // Action loading states
  const [actionLoading, setActionLoading] = useState(null);

  // File preview state
  const [previewDoc, setPreviewDoc] = useState(null);

  const fetchDocuments = async () => {
    if (!vehicle) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/inventory/documents/?vehicle=${vehicle.id}`);
      setDocuments(data);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  // Fetch documents when modal opens
  useEffect(() => {
    if (isOpen && vehicle) {
      fetchDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, vehicle]);

  // Upload document
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.title) {
      setError('Please provide a title and select a file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('vehicle', vehicle.id);
      formData.append('title', uploadForm.title);
      formData.append('doc_type', uploadForm.doc_type);
      formData.append('is_public', uploadForm.is_public);
      formData.append('description', uploadForm.description);
      formData.append('file', uploadForm.file);

      await api.upload('/inventory/documents/', formData);

      setSuccess('Document uploaded successfully!');
      setUploadForm({
        title: '',
        doc_type: 'OTHER',
        is_public: false,
        description: '',
        file: null,
      });
      setShowUploadForm(false);
      fetchDocuments();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload document: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Toggle visibility
  const handleToggleVisibility = async (doc) => {
    setActionLoading(doc.id);
    try {
      await api.patch(`/inventory/documents/${doc.id}/`, {
        is_public: !doc.is_public
      });
      
      // Update local state immediately
      setDocuments(prev => prev.map(d => 
        d.id === doc.id ? { ...d, is_public: !d.is_public } : d
      ));
      
      setSuccess(`Document ${!doc.is_public ? 'now visible' : 'hidden from'} customers`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Toggle visibility failed:', err);
      setError('Failed to update visibility');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete document
  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    setActionLoading(docId);
    try {
      await api.delete(`/inventory/documents/${docId}/`);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setSuccess('Document deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete document');
    } finally {
      setActionLoading(null);
    }
  };

  // Get file icon based on extension
  const getFileIcon = (fileName) => {
    if (!fileName) return <File size={20} />;
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return <FileImage size={20} className="text-purple-500" />;
    }
    if (ext === 'pdf') {
      return <FileText size={20} className="text-red-500" />;
    }
    return <File size={20} className="text-gray-500" />;
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
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Vehicle Documents</h2>
            {vehicle && (
              <p className="text-sm text-gray-500 mt-1">
                {vehicle.year} {vehicle.make} {vehicle.model} • {vehicle.vin}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Success/Error Messages */}
          {success && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
              <CheckCircle size={20} />
              {success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <AlertCircle size={20} />
              {error}
              <button onClick={() => setError(null)} className="ml-auto">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Upload Section */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Upload Document</h3>
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition ${
                  showUploadForm 
                    ? 'bg-gray-200 text-gray-600' 
                    : 'bg-brand-600 text-white hover:bg-brand-700'
                }`}
              >
                {showUploadForm ? <X size={18} /> : <FilePlus size={18} />}
                {showUploadForm ? 'Cancel' : 'New Document'}
              </button>
            </div>

            {showUploadForm && (
              <form onSubmit={handleUpload} className="space-y-4 border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Document Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Pre-Purchase Inspection"
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                    />
                  </div>

                  {/* Document Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Document Type
                    </label>
                    <div className="relative">
                      <select
                        value={uploadForm.doc_type}
                        onChange={(e) => setUploadForm({ ...uploadForm, doc_type: e.target.value })}
                        className="w-full appearance-none px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 bg-white"
                      >
                        {Object.entries(DOC_TYPE_CONFIG).map(([key, config]) => (
                          <option key={key} value={key}>{config.icon} {config.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Brief notes about this document..."
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                  />
                </div>

                {/* Visibility Toggle */}
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    {uploadForm.is_public ? (
                      <Eye size={20} className="text-green-600" />
                    ) : (
                      <EyeOff size={20} className="text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">Visible to Customers?</p>
                      <p className="text-sm text-gray-500">
                        {uploadForm.is_public 
                          ? 'This document will be shown on the vehicle listing' 
                          : 'Only admins can see this document'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadForm({ ...uploadForm, is_public: !uploadForm.is_public })}
                    className={`relative w-14 h-8 rounded-full transition-colors ${
                      uploadForm.is_public ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
                      uploadForm.is_public ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select File *
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      required
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                      onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                      className="w-full px-4 py-3 rounded-xl border border-dashed border-gray-300 focus:border-brand-600 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-600 hover:file:bg-brand-100"
                    />
                  </div>
                  {uploadForm.file && (
                    <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle size={14} />
                      {uploadForm.file.name}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={uploading || !uploadForm.file || !uploadForm.title}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Upload size={18} />
                  )}
                  Upload Document
                </button>
              </form>
            )}
          </div>

          {/* Documents List */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">
              Uploaded Documents ({documents.length})
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-brand-600" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No documents uploaded yet</p>
                <p className="text-sm text-gray-400 mt-1">Upload inspection reports, service records, and more</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => {
                  const config = DOC_TYPE_CONFIG[doc.doc_type] || DOC_TYPE_CONFIG.OTHER;
                  const isLoading = actionLoading === doc.id;

                  return (
                    <div 
                      key={doc.id}
                      className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition"
                    >
                      {/* File Icon */}
                      <div className="flex-shrink-0">
                        {getFileIcon(doc.file_name)}
                      </div>

                      {/* Document Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-gray-900 truncate">{doc.title}</h4>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}>
                            {config.icon} {config.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>{formatDate(doc.created_at)}</span>
                          {doc.description && (
                            <>
                              <span>•</span>
                              <span className="truncate">{doc.description}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Visibility Status */}
                      <div className="flex-shrink-0">
                        {doc.is_public ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                            <Eye size={16} />
                            Public
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-400 text-sm font-medium">
                            <EyeOff size={16} />
                            Private
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Preview */}
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                          title="Preview"
                        >
                          <Eye size={18} />
                        </button>

                        {/* Download */}
                        <a
                          href={doc.file_url}
                          download
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Download"
                        >
                          <Download size={18} />
                        </a>

                        {/* Toggle Visibility */}
                        <button
                          onClick={() => handleToggleVisibility(doc)}
                          disabled={isLoading}
                          className={`p-2 rounded-lg transition ${
                            doc.is_public 
                              ? 'text-green-600 hover:bg-green-50' 
                              : 'text-gray-400 hover:bg-gray-100'
                          } disabled:opacity-50`}
                          title={doc.is_public ? 'Make Private' : 'Make Public'}
                        >
                          {isLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : doc.is_public ? (
                            <Eye size={18} />
                          ) : (
                            <EyeOff size={18} />
                          )}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={isLoading}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              <Eye size={14} className="inline text-green-500 mr-1" />
              Public documents are visible on the vehicle listing page
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      {previewDoc && (
        <FilePreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          fileUrl={previewDoc.file_url}
          fileName={previewDoc.file_name || previewDoc.title}
          mimeType=""
        />
      )}
    </div>
  );
};

export default VehicleDocumentsModal;
