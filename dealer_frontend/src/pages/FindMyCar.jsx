import { useState, useEffect } from 'react';
import { Search, Car, User, CheckCircle, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/home/Navbar';
import Footer from '../components/home/Footer';
import api from '../services/api';

/**
 * FindMyCar - Vehicle Finder Request Form
 * 
 * Allows users to submit a request for a specific car they're looking for.
 * Creates a Lead in the CRM with lead_type = 'VEHICLE_REQUEST'.
 * 
 * Features:
 * - 2-step form (Car Details → Contact Info)
 * - Auto-fills contact info if user is logged in
 * - Orange accent design with search icon
 */
const FindMyCar = () => {
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Car Details
    desired_make: '',
    desired_model: '',
    preferred_year_min: '',
    preferred_year_max: '',
    max_budget: '',
    notes: '',
    // Step 2: Contact Info
    name: '',
    email: '',
    phone: '',
  });

  // Auto-fill contact info if user is logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
        email: user.email || '',
        phone: user.phone || '',
      }));
    }
  }, [isAuthenticated, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.desired_make.trim()) {
      setError('Please enter the make of the car you\'re looking for');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.name.trim()) {
      setError('Please enter your name');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Please enter your email');
      return false;
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep2()) return;

    setLoading(true);
    setError('');

    try {
      await api.post('/crm/leads/', {
        lead_type: 'VEHICLE_REQUEST',
        source: 'WEBSITE',
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        desired_make: formData.desired_make.trim(),
        desired_model: formData.desired_model.trim(),
        preferred_year_min: formData.preferred_year_min ? parseInt(formData.preferred_year_min) : null,
        preferred_year_max: formData.preferred_year_max ? parseInt(formData.preferred_year_max) : null,
        max_budget: formData.max_budget ? parseFloat(formData.max_budget) : null,
        notes: formData.notes.trim(),
      });

      setSuccess(true);
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate year options (current year to 20 years ago)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 25 }, (_, i) => currentYear - i);

  // Popular makes for quick selection
  const popularMakes = ['Toyota', 'Honda', 'BMW', 'Mercedes-Benz', 'Audi', 'Ford', 'Chevrolet', 'Lexus'];

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-6 py-20">
          <div className="max-w-lg mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Request Received!</h1>
            <p className="text-lg text-gray-600 mb-8">
              We'll search our network for a <span className="font-semibold text-brand-600">{formData.desired_make} {formData.desired_model}</span> and contact you at <span className="font-semibold">{formData.email}</span> when we find a match.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/inventory"
                className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#e65100] transition-colors"
              >
                <Car className="h-5 w-5" />
                Browse Current Inventory
              </a>
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600/10 rounded-full mb-4">
            <Search className="h-8 w-8 text-brand-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Can't Find What You're Looking For?
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Tell us what car you need and we'll search our network to find it for you.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-brand-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-brand-600 text-white' : 'bg-gray-200'}`}>
              1
            </div>
            <span className="font-medium hidden sm:inline">Car Details</span>
          </div>
          <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-brand-600' : 'bg-gray-200'}`} />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-brand-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-brand-600 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <span className="font-medium hidden sm:inline">Contact Info</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Step 1: Car Details */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Car className="h-6 w-6 text-brand-600" />
                    <h2 className="text-xl font-bold text-gray-900">What Car Are You Looking For?</h2>
                  </div>

                  {/* Make */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Make <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="desired_make"
                      value={formData.desired_make}
                      onChange={handleChange}
                      placeholder="e.g., Toyota, BMW, Honda"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent transition-all"
                      list="popular-makes"
                    />
                    <datalist id="popular-makes">
                      {popularMakes.map(make => (
                        <option key={make} value={make} />
                      ))}
                    </datalist>
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model
                    </label>
                    <input
                      type="text"
                      name="desired_model"
                      value={formData.desired_model}
                      onChange={handleChange}
                      placeholder="e.g., Camry, 3 Series, Civic"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Year Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Year From
                      </label>
                      <select
                        name="preferred_year_min"
                        value={formData.preferred_year_min}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent transition-all"
                      >
                        <option value="">Any</option>
                        {yearOptions.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Year To
                      </label>
                      <select
                        name="preferred_year_max"
                        value={formData.preferred_year_max}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent transition-all"
                      >
                        <option value="">Any</option>
                        {yearOptions.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Budget */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Budget
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        name="max_budget"
                        value={formData.max_budget}
                        onChange={handleChange}
                        placeholder="50000"
                        min="0"
                        className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Details
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Any specific features, color preferences, or other requirements..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent transition-all resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-[#e65100] transition-colors"
                  >
                    Continue
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Step 2: Contact Info */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <User className="h-6 w-6 text-brand-600" />
                    <h2 className="text-xl font-bold text-gray-900">Your Contact Information</h2>
                  </div>

                  {isAuthenticated && (
                    <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm mb-4">
                      ✓ We've pre-filled your information from your account.
                    </div>
                  )}

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-600 mb-2">You're looking for:</p>
                    <p className="font-semibold text-gray-900">
                      {formData.desired_make} {formData.desired_model}
                      {formData.preferred_year_min || formData.preferred_year_max ? (
                        <span className="text-gray-500 font-normal">
                          {' '}({formData.preferred_year_min || 'Any'} - {formData.preferred_year_max || 'Any'})
                        </span>
                      ) : null}
                      {formData.max_budget && (
                        <span className="text-brand-600"> under ${parseInt(formData.max_budget).toLocaleString()}</span>
                      )}
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-[#e65100] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Search className="h-5 w-5" />
                          Submit Request
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Trust Badge */}
          <p className="text-center text-sm text-gray-500 mt-6">
            🔒 Your information is secure and will only be used to help find your dream car.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FindMyCar;
