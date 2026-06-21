import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Loader2,
  Upload,
  X,
  Sparkles,
  Save,
  Car,
  AlertCircle,
  CheckCircle,
  ImagePlus,
  Video
} from 'lucide-react';
import api from '../../services/api';

const AdminVehicleForm = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const isEditMode = !!slug;
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    vin: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    trim: '',
    price: '',
    mileage: '',
    color: '',
    condition: 'USED',
    status: 'ACQUIRED',
    description: '',
    featured: false,
    feature_ids: [],
    transmission: '',
    fuel_type: '',
    body_style: '',
    drivetrain: '',
    engine: '',
    doors: '',
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vinDecoding, setVinDecoding] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Images state
  const [existingImages, setExistingImages] = useState([]); // Images already on server
  const [newImages, setNewImages] = useState([]); // New images to upload
  const [imagePreviews, setImagePreviews] = useState([]); // Preview URLs for new images

  // Video state
  const [existingVideos, setExistingVideos] = useState([]);
  const [newVideos, setNewVideos] = useState([]);
  const [newVideoPreviews, setNewVideoPreviews] = useState([]);

  // Features state
  const [availableFeatures, setAvailableFeatures] = useState([]);

  // Dropdown choices (matching backend TextChoices)
  const transmissionChoices = [
    { value: 'AUTOMATIC', label: 'Automatic' },
    { value: 'MANUAL', label: 'Manual' },
    { value: 'CVT', label: 'CVT' },
    { value: 'OTHER', label: 'Other' },
  ];
  const fuelTypeChoices = [
    { value: 'GASOLINE', label: 'Gasoline' },
    { value: 'DIESEL', label: 'Diesel' },
    { value: 'ELECTRIC', label: 'Electric' },
    { value: 'HYBRID', label: 'Hybrid' },
    { value: 'PHEV', label: 'Plug-in Hybrid' },
    { value: 'OTHER', label: 'Other' },
  ];
  const bodyStyleChoices = [
    { value: 'SEDAN', label: 'Sedan' },
    { value: 'SUV', label: 'SUV' },
    { value: 'HATCHBACK', label: 'Hatchback' },
    { value: 'COUPE', label: 'Coupe' },
    { value: 'TRUCK', label: 'Truck' },
    { value: 'MINIVAN', label: 'Minivan' },
    { value: 'WAGON', label: 'Wagon' },
    { value: 'CONVERTIBLE', label: 'Convertible' },
    { value: 'OTHER', label: 'Other' },
  ];
  const drivetrainChoices = [
    { value: 'FWD', label: 'Front-Wheel Drive' },
    { value: 'RWD', label: 'Rear-Wheel Drive' },
    { value: 'AWD', label: 'All-Wheel Drive' },
    { value: '4WD', label: 'Four-Wheel Drive' },
  ];
  const colors = ['Black', 'White', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Brown', 'Beige', 'Other'];

  // Fetch existing vehicle data if editing
  useEffect(() => {
    if (isEditMode) {
      fetchVehicle();
    }
    fetchFeatures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isEditMode]);

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
        condition: data.condition || 'USED',
        status: data.status || 'ACQUIRED',
        description: data.description || '',
        featured: data.featured || false,
        feature_ids: data.features?.map(f => f.id) || [],
        transmission: data.transmission || '',
        fuel_type: data.fuel_type || '',
        body_style: data.body_style || '',
        drivetrain: data.drivetrain || '',
        engine: data.engine || '',
        doors: data.doors || '',
      });
      setExistingImages(data.images || []);
      setExistingVideos(data.videos || []);
    } catch (err) {
      setError('Failed to load vehicle data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatures = async () => {
    try {
      const data = await api.get('/inventory/features/');
      setAvailableFeatures(data);
    } catch (err) {
      console.error('Failed to load features:', err);
      // Use common features as fallback
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle status change with SOLD validation
  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    
    // If changing to SOLD, check if sale/purchase price is entered
    if (newStatus === 'SOLD' && isEditMode) {
      // Show confirmation prompt
      const confirmSold = window.confirm(
        'Are you sure you want to mark this vehicle as SOLD?\n\n' +
        'Make sure the Sale Price has been recorded in the Financials section before proceeding.'
      );
      
      if (!confirmSold) {
        return; // Don't change status
      }
    }
    
    setFormData(prev => ({
      ...prev,
      status: newStatus
    }));
  };

  // Get status styling for the prominent dropdown
  const getStatusStyle = (status) => {
    const styles = {
      'ACQUIRED': { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700', ring: 'ring-slate-200' },
      'PREP': { bg: 'bg-brand-100', border: 'border-brand-300', text: 'text-brand-800', ring: 'ring-brand-200' },
      'READY': { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700', ring: 'ring-emerald-200' },
      'PENDING': { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700', ring: 'ring-amber-200' },
      'SOLD': { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', ring: 'ring-red-200' },
    };
    return styles[status] || styles['ACQUIRED'];
  };

  // Handle feature toggle
  const handleFeatureToggle = (featureId) => {
    setFormData(prev => ({
      ...prev,
      feature_ids: prev.feature_ids.includes(featureId)
        ? prev.feature_ids.filter(id => id !== featureId)
        : [...prev.feature_ids, featureId]
    }));
  };

  // VIN Decode function
  const handleVinDecode = async () => {
    if (!formData.vin || formData.vin.length !== 17) {
      alert('Please enter a valid 17-character VIN');
      return;
    }

    try {
      setVinDecoding(true);
      // Try backend first
      try {
        const data = await api.post('/inventory/decode-vin/', { vin: formData.vin });
        if (data) {
          setFormData(prev => ({
            ...prev,
            make: data.make || prev.make,
            model: data.model || prev.model,
            year: data.year || prev.year,
            trim: data.trim || prev.trim,
            color: data.color || prev.color,
            transmission: data.transmission || prev.transmission,
            fuel_type: data.fuel_type || prev.fuel_type,
            body_style: data.body_style || prev.body_style,
            drivetrain: data.drivetrain || prev.drivetrain,
            engine: data.engine || prev.engine,
            doors: data.doors || prev.doors,
          }));
          return;
        }
      } catch {
        // Backend not available, use NHTSA API directly
        console.log('Backend VIN decode not available, using NHTSA API');
      }

      // Fallback to NHTSA API
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${formData.vin}?format=json`
      );
      const data = await response.json();
      
      if (data.Results) {
        const getValue = (variableId) => {
          const result = data.Results.find(r => r.VariableId === variableId);
          return result?.Value || '';
        };
        
        setFormData(prev => ({
          ...prev,
          make: getValue(26) || prev.make, // Make
          model: getValue(28) || prev.model, // Model
          year: parseInt(getValue(29)) || prev.year, // Model Year
          trim: getValue(38) || prev.trim, // Trim
        }));
        // Note: mileage cannot be decoded from VIN and must always be entered manually.
        // Detailed fields (transmission, fuel, body, drivetrain, engine, doors)
        // are only populated via the backend VIN decode which maps to TextChoices
      }
    } catch (err) {
      console.error('VIN decode failed:', err);
      alert('Failed to decode VIN. Please enter details manually.');
    } finally {
      setVinDecoding(false);
    }
  };

  // AI Description generation
  const handleAiGenerate = async () => {
    if (!formData.make || !formData.model || !formData.year) {
      alert('Please fill in Make, Model, and Year before generating description');
      return;
    }

    try {
      setAiGenerating(true);
      
      // Build feature names for description
      const selectedFeatureNames = availableFeatures
        .filter(f => formData.feature_ids.includes(f.id))
        .map(f => f.name);

      // Try backend AI endpoint
      try {
        const data = await api.post('/inventory/generate-description/', {
          make: formData.make,
          model: formData.model,
          year: formData.year,
          trim: formData.trim,
          mileage: formData.mileage,
          condition: formData.condition,
          color: formData.color,
          transmission: formData.transmission,
          fuel_type: formData.fuel_type,
          body_style: formData.body_style,
          drivetrain: formData.drivetrain,
          engine: formData.engine,
          doors: formData.doors,
          features: selectedFeatureNames,
        });
        
        if (data.description) {
          setFormData(prev => ({
            ...prev,
            description: data.description
          }));
          return;
        }
      } catch {
        console.log('Backend AI not available, using template');
      }

      // Fallback: Generate a template description
      const featuresText = selectedFeatureNames.length > 0 
        ? `Key features include ${selectedFeatureNames.slice(0, 5).join(', ')}.` 
        : '';
      
      const condition = formData.condition === 'NEW' ? 'brand new' : 'pre-owned';
      const mileageText = formData.mileage ? `with only ${parseInt(formData.mileage).toLocaleString()} miles` : '';
      
      const description = `Introducing this stunning ${formData.year} ${formData.make} ${formData.model}${formData.trim ? ` ${formData.trim}` : ''} - a ${condition} vehicle ${mileageText} that combines style, performance, and reliability.

${featuresText}

This ${formData.make} ${formData.model} has been meticulously maintained and is ready to provide years of dependable service. Whether you're commuting to work, running errands, or embarking on a road trip, this vehicle delivers an exceptional driving experience.

Don't miss this opportunity! Contact us today to schedule a test drive and experience the quality of this ${formData.make} firsthand.`;

      setFormData(prev => ({
        ...prev,
        description: description.trim()
      }));

    } catch (err) {
      console.error('AI generation failed:', err);
      alert('Failed to generate description. Please write one manually.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Handle image selection
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Create preview URLs
    const previews = files.map(file => URL.createObjectURL(file));
    
    setNewImages(prev => [...prev, ...files]);
    setImagePreviews(prev => [...prev, ...previews]);
  };

  // Remove new image
  const removeNewImage = (index) => {
    URL.revokeObjectURL(imagePreviews[index]); // Clean up URL
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Video handlers
  const handleVideoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    const toAdd = [];
    const previews = [];
    for (const file of files) {
      if (!allowed.includes(file.type)) {
        alert(`"${file.name}" is not a supported format. Use MP4, WebM, MOV, or AVI.`);
        continue;
      }
      if (file.size > 500 * 1024 * 1024) {
        alert(`"${file.name}" exceeds 500 MB.`);
        continue;
      }
      toAdd.push(file);
      previews.push(URL.createObjectURL(file));
    }
    setNewVideos(prev => [...prev, ...toAdd]);
    setNewVideoPreviews(prev => [...prev, ...previews]);
  };

  const removeNewVideo = (index) => {
    URL.revokeObjectURL(newVideoPreviews[index]);
    setNewVideos(prev => prev.filter((_, i) => i !== index));
    setNewVideoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingVideo = async (videoId) => {
    try {
      await api.delete(`/inventory/videos/${videoId}/`);
      setExistingVideos(prev => prev.filter(v => v.id !== videoId));
    } catch {
      alert('Failed to delete video');
    }
  };

  // Remove existing image
  const removeExistingImage = async (imageId) => {
    try {
      await api.delete(`/inventory/images/${imageId}/`);
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
    } catch (err) {
      console.error('Failed to delete image:', err);
      alert('Failed to delete image');
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.vin || !formData.make || !formData.model || !formData.year || !formData.price) {
      alert('Please fill in all required fields (VIN, Make, Model, Year, Price)');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Create FormData for file upload
      const submitData = new FormData();
      
      // Append all text fields
      submitData.append('vin', formData.vin);
      submitData.append('make', formData.make);
      submitData.append('model', formData.model);
      submitData.append('year', formData.year);
      submitData.append('trim', formData.trim);
      submitData.append('price', formData.price);
      submitData.append('mileage', formData.mileage || 0);
      submitData.append('color', formData.color);
      submitData.append('condition', formData.condition);
      submitData.append('status', formData.status);
      submitData.append('description', formData.description);
      submitData.append('featured', formData.featured);
      submitData.append('transmission', formData.transmission);
      submitData.append('fuel_type', formData.fuel_type);
      submitData.append('body_style', formData.body_style);
      submitData.append('drivetrain', formData.drivetrain);
      submitData.append('engine', formData.engine);
      if (formData.doors) submitData.append('doors', formData.doors);
      
      // Append feature IDs
      formData.feature_ids.forEach(id => {
        submitData.append('feature_ids', id);
      });

      let vehicleData;

      if (isEditMode) {
        vehicleData = await api.uploadPatch(`/inventory/vehicles/${slug}/`, submitData);
      } else {
        vehicleData = await api.upload('/inventory/vehicles/', submitData);
      }

      // Upload new images separately
      if (newImages.length > 0 && vehicleData) {
        for (const image of newImages) {
          const imageFormData = new FormData();
          imageFormData.append('vehicle', vehicleData.id);
          imageFormData.append('image', image);
          await api.upload('/inventory/images/', imageFormData);
        }
      }

      // Upload new videos separately
      if (newVideos.length > 0 && vehicleData) {
        for (const video of newVideos) {
          const videoFormData = new FormData();
          videoFormData.append('vehicle', vehicleData.id);
          videoFormData.append('video', video);
          await api.upload('/inventory/videos/', videoFormData);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/admin/inventory');
      }, 1500);

    } catch (err) {
      console.error('Save failed:', err);
      setError(err.message || 'Failed to save vehicle. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <span className="ml-3 text-gray-500">Loading vehicle data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/inventory')}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-slate-800 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isEditMode ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h1>
            <p className="text-gray-500 mt-1">
              {isEditMode ? 'Update vehicle information' : 'Fill in the details to list a new vehicle'}
            </p>
          </div>
        </div>

        {/* Prominent Status Dropdown - Only in Edit Mode */}
        {isEditMode && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <select
              value={formData.status}
              onChange={handleStatusChange}
              className={`px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all
                focus:outline-none focus:ring-2 cursor-pointer
                ${getStatusStyle(formData.status).bg} 
                ${getStatusStyle(formData.status).border} 
                ${getStatusStyle(formData.status).text}
                focus:${getStatusStyle(formData.status).ring}`}
            >
              <option value="ACQUIRED">🔵 Acquired</option>
              <option value="PREP">🔧 In Prep</option>
              <option value="READY">✅ Ready to Sell</option>
              <option value="PENDING">⏳ Pending Deal</option>
              <option value="SOLD">🔴 Sold</option>
            </select>
          </div>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          <p className="text-emerald-700 font-medium">Vehicle saved successfully! Redirecting...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section A: VIN Decoding */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Car className="h-5 w-5 text-brand-600" />
            VIN Decoding
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VIN Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="vin"
                value={formData.vin}
                onChange={handleChange}
                maxLength={17}
                placeholder="Enter 17-character VIN"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 
                  text-sm text-slate-800 font-mono uppercase tracking-wider
                  focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100
                  transition-all"
              />
              <p className="text-xs text-gray-400 mt-1">{formData.vin.length}/17 characters</p>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleVinDecode}
                disabled={vinDecoding || formData.vin.length !== 17}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white 
                  shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {vinDecoding ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Decoding...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Decode VIN
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Section B: Essential Details */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Essential Details</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Make */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Make <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="make"
                value={formData.make}
                onChange={handleChange}
                placeholder="e.g., Toyota"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 
                  text-sm text-slate-800 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="e.g., Camry"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 
                  text-sm text-slate-800 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 
                  text-sm text-slate-800 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {/* Trim */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trim</label>
              <input
                type="text"
                name="trim"
                value={formData.trim}
                onChange={handleChange}
                placeholder="e.g., XLE, Sport"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 
                  text-sm text-slate-800 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {/* Mileage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mileage</label>
              <input
                type="number"
                name="mileage"
                value={formData.mileage}
                onChange={handleChange}
                min="0"
                placeholder="e.g., 25000"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 
                  text-sm text-slate-800 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {/* Transmission */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transmission</label>
              <select
                name="transmission"
                value={formData.transmission}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 
                  text-sm text-slate-800 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="">Select Transmission</option>
                {transmissionChoices.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Fuel Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
              <select
                name="fuel_type"
                value={formData.fuel_type}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 
                  text-sm text-slate-800 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="">Select Fuel Type</option>
                {fuelTypeChoices.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Body Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body Style</label>
              <select
                name="body_style"
                value={formData.body_style}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 
                  text-sm text-slate-800 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="">Select Body Style</option>
                {bodyStyleChoices.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Drivetrain */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Drivetrain</label>
              <select
                name="drivetrain"
                value={formData.drivetrain}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 
                  text-sm text-slate-800 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="">Select Drivetrain</option>
                {drivetrainChoices.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Engine */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Engine</label>
              <input
                type="text"
                name="engine"
                value={formData.engine}
                onChange={handleChange}
                placeholder="e.g., 2.5L 4-Cylinder"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 
                  text-sm text-slate-800 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {/* Doors */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doors</label>
              <input
                type="number"
                name="doors"
                value={formData.doors}
                onChange={handleChange}
                min="1"
                max="6"
                placeholder="e.g., 4"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 
                  text-sm text-slate-800 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <select
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 
                  text-sm text-slate-800 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="">Select Color</option>
                {colors.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 
                  text-sm text-slate-800 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="NEW">New</option>
                <option value="USED">Used</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleStatusChange}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 
                  text-sm text-slate-800 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="ACQUIRED">Acquired</option>
                <option value="PREP">In Prep</option>
                <option value="READY">Ready</option>
                <option value="PENDING">Pending</option>
                <option value="SOLD">Sold</option>
              </select>
            </div>

            {/* Featured */}
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleChange}
                  className="h-5 w-5 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                />
                <span className="text-sm font-medium text-gray-700">Featured Vehicle</span>
              </label>
            </div>
          </div>

          {/* Price - Large field */}
          <div className="mt-6 max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-500">$</span>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 pl-8
                  text-2xl font-bold text-slate-800 
                  focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
        </div>

        {/* Section C: Media */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-brand-600" />
            Photos
          </h2>

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">Current Images</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {existingImages.map((img) => (
                  <div key={img.id} className="relative group aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
                    <img 
                      src={img.image} 
                      alt="Vehicle" 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(img.id)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white 
                        opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">New Images to Upload</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
                    <img 
                      src={preview} 
                      alt={`Preview ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white 
                        opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center 
              hover:border-brand-600 hover:bg-brand-50/30 transition-colors cursor-pointer"
          >
            <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB each</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>

        {/* Section D: Videos */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <Video className="h-5 w-5 text-[#FF5A00]" />
            Videos
          </h2>
          <p className="text-xs text-gray-400 mb-4">MP4, WebM, MOV or AVI · Max 500 MB each</p>

          {/* Existing Videos */}
          {existingVideos.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">Uploaded Videos</p>
              <div className="space-y-3">
                {existingVideos.map((v) => (
                  <div key={v.id} className="relative rounded-xl overflow-hidden bg-black group">
                    <video
                      src={v.video}
                      controls
                      preload="metadata"
                      className="w-full max-h-48"
                    />
                    {v.title && (
                      <p className="absolute bottom-2 left-3 text-xs text-white/80 font-medium">{v.title}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => removeExistingVideo(v.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white
                        opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Video Previews */}
          {newVideoPreviews.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">Videos to Upload</p>
              <div className="space-y-3">
                {newVideoPreviews.map((preview, index) => (
                  <div key={index} className="relative rounded-xl overflow-hidden bg-black group">
                    <video
                      src={preview}
                      controls
                      muted
                      preload="metadata"
                      className="w-full max-h-48"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewVideo(index)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white
                        opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div
            onClick={() => videoInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center
              hover:border-[#FF5A00] hover:bg-orange-50/30 transition-colors cursor-pointer"
          >
            <Video className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">Click to upload videos</p>
            <p className="text-xs text-gray-500 mt-1">MP4, WebM, MOV, AVI · up to 500 MB each · multiple allowed</p>
          </div>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
            multiple
            onChange={handleVideoSelect}
            className="hidden"
          />
        </div>

        {/* Section E: Features & Description */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Features & Description</h2>

          {/* Features Grid */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Vehicle Features</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableFeatures.length > 0 ? (
                availableFeatures.map((feature) => (
                  <label 
                    key={feature.id}
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all
                      ${formData.feature_ids.includes(feature.id)
                        ? 'border-brand-600 bg-brand-50 text-brand-600'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.feature_ids.includes(feature.id)}
                      onChange={() => handleFeatureToggle(feature.id)}
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                    />
                    <span className="text-sm font-medium">{feature.name}</span>
                  </label>
                ))
              ) : (
                // Fallback UI when no features loaded from backend
                <p className="text-sm text-gray-500 col-span-full">
                  No features available. Add features in the admin settings.
                </p>
              )}
            </div>
          </div>

          {/* Description with AI */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiGenerating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-600 
                  text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate AI Description
                  </>
                )}
              </button>
            </div>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={6}
              placeholder="Enter a compelling description for this vehicle..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 
                text-sm text-slate-800 resize-none
                focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>
      </form>

      {/* Sticky Save Button */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-gray-100 p-4 shadow-lg z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-sm text-gray-500 hidden sm:block">
            {isEditMode ? 'Editing' : 'Creating'}: {formData.year} {formData.make} {formData.model || 'New Vehicle'}
          </p>
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={() => navigate('/admin/inventory')}
              className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 
                hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 text-sm font-semibold text-white 
                shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Vehicle
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminVehicleForm;
