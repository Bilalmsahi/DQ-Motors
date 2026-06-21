import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  ArrowLeft,
  Car,
  Hash,
  DollarSign,
  Gauge,
  FileText,
  Image,
  X,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2,
  Wand2,
  Info,
} from 'lucide-react';

const UserAddCar = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { isFeatureEnabled } = useConfig();
  const { user } = useAuth();
  
  const isEditMode = !!slug;
  
  const [formData, setFormData] = useState({
    vin: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    trim: '',
    price: '',
    mileage: '',
    color: '',
    description: '',
    condition: 'USED',
  });
  
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vinDecoding, setVinDecoding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load vehicle data for edit mode
  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        setLoading(true);
        const data = await api.get(`/inventory/vehicles/${slug}/`);
        
        setFormData({
          vin: data.vin || '',
          make: data.make || '',
          model: data.model || '',
          year: data.year || new Date().getFullYear(),
          trim: data.trim || '',
          price: data.price || '',
          mileage: data.mileage || '',
          color: data.color || '',
          description: data.description || '',
          condition: data.condition || 'USED',
        });
        setExistingImages(data.images || []);
      } catch {
        setError('Failed to load vehicle data');
      } finally {
        setLoading(false);
      }
    };

    if (isEditMode && slug) {
      fetchVehicle();
    }
  }, [slug, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length + existingImages.length > 10) {
      setError('Maximum 10 images allowed');
      return;
    }
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeNewImage = (index) => {
    setImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const removeExistingImage = (imageId) => {
    setImagesToDelete(prev => [...prev, imageId]);
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleVinDecode = async () => {
    if (!formData.vin || formData.vin.length !== 17) {
      setError('Please enter a valid 17-character VIN');
      return;
    }
    
    setVinDecoding(true);
    setError('');
    
    try {
      const data = await api.post('/inventory/decode-vin/', { vin: formData.vin });
      
      setFormData(prev => ({
        ...prev,
        make: data.make || prev.make,
        model: data.model || prev.model,
        year: data.year || prev.year,
        trim: data.trim || prev.trim,
        color: data.color || prev.color,
      }));
      
      setSuccess('VIN decoded successfully. Mileage must be entered manually.');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to decode VIN. Please enter details manually.');
    } finally {
      setVinDecoding(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.vin || !formData.make || !formData.model || !formData.year || !formData.price || !formData.mileage) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (images.length === 0 && existingImages.length === 0) {
      setError('Please add at least one photo of your vehicle');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      let vehicle;
      
      if (isEditMode) {
        vehicle = await api.put(`/inventory/vehicles/${slug}/`, {
          ...formData,
          seller_id: user?.id,
        });
      } else {
        vehicle = await api.post('/inventory/vehicles/', {
          ...formData,
          status: 'READY',
          seller_id: user?.id,
        });
      }
      
      // Upload new images
      for (const img of images) {
        const imageFormData = new FormData();
        imageFormData.append('image', img.file);
        imageFormData.append('vehicle', vehicle.id);
        await api.upload('/inventory/images/', imageFormData);
      }
      
      // Delete removed images
      for (const imageId of imagesToDelete) {
        await api.delete(`/inventory/images/${imageId}/`);
      }
      
      setSuccess(isEditMode ? 'Listing updated!' : 'Listing created successfully!');
      setTimeout(() => {
        navigate('/account/listings');
      }, 1500);
      
    } catch (err) {
      setError(err.message || 'Failed to save listing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/account/listings')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Listing' : 'List Your Car'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEditMode ? 'Update your vehicle information' : 'Fill in the details to list your car for sale'}
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* VIN Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-brand-100 rounded-lg">
              <Hash className="h-5 w-5 text-brand-700" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Vehicle VIN</h2>
              <p className="text-sm text-gray-500">Enter your VIN to auto-fill vehicle details</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <input
              type="text"
              name="vin"
              value={formData.vin}
              onChange={handleChange}
              placeholder="Enter 17-character VIN"
              maxLength={17}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent uppercase font-mono"
            />
            {isFeatureEnabled('enable_vin_decoder') && (
              <button
                type="button"
                onClick={handleVinDecode}
                disabled={vinDecoding || formData.vin.length !== 17}
                className="px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
              >
                {vinDecoding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Decode
              </button>
            )}
          </div>
          
          <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Find your VIN on the driver's side dashboard or door jamb
          </p>
        </div>

        {/* Vehicle Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Car className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="font-semibold text-gray-900">Vehicle Details</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                min="1900"
                max={new Date().getFullYear() + 1}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Make <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="make"
                value={formData.make}
                onChange={handleChange}
                placeholder="e.g., Toyota"
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Model <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="e.g., Camry"
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Trim
              </label>
              <input
                type="text"
                name="trim"
                value={formData.trim}
                onChange={handleChange}
                placeholder="e.g., XLE, Sport"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Condition
              </label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent bg-white"
              >
                <option value="USED">Used</option>
                <option value="NEW">New</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Exterior Color
              </label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                placeholder="e.g., Silver, Black"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Price & Mileage */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="font-semibold text-gray-900">Price & Mileage</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Asking Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="25,000"
                  required
                  min="0"
                  className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mileage <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="mileage"
                  value={formData.mileage}
                  onChange={handleChange}
                  placeholder="45,000"
                  required
                  min="0"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">miles</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="font-semibold text-gray-900">Description</h2>
          </div>
          
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder="Describe your vehicle - condition, features, service history, reason for selling..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent resize-none"
          />
          
          <p className="mt-2 text-xs text-gray-400">
            A good description helps attract serious buyers
          </p>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Image className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Photos <span className="text-red-500">*</span></h2>
              <p className="text-sm text-gray-500">Add up to 10 photos (exterior, interior, engine)</p>
            </div>
          </div>
          
          {/* Image Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-4">
            {/* Existing Images */}
            {existingImages.map((img) => (
              <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-200">
                <img
                  src={img.image}
                  alt="Vehicle"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeExistingImage(img.id)}
                  className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            
            {/* New Images */}
            {images.map((img, index) => (
              <div key={index} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-200">
                <img
                  src={img.preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">New</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeNewImage(index)}
                  className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            
            {/* Upload Button */}
            {(images.length + existingImages.length) < 10 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-brand-300 transition-colors">
                <Upload className="h-6 w-6 text-gray-400 mb-1" />
                <span className="text-xs text-gray-500">Add Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
          
          <p className="text-xs text-gray-400">
            {10 - images.length - existingImages.length} photos remaining
          </p>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/account/listings')}
            className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg shadow-brand-600/25"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving...' : isEditMode ? 'Update Listing' : 'Publish Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserAddCar;
