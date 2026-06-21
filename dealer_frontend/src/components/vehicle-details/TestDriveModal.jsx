import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Mail, Phone, Car, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const TestDriveModal = ({ isOpen, onClose, vehicle }) => {
  const { user } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    date: '',
    time_slot: '',
    name: '',
    email: '',
    phone: '',
    notes: '',
    appointment_type: 'TEST_DRIVE', // or 'INSPECTION'
  });
  
  // Available slots state
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-fill user info if logged in
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || '',
        email: user.email || '',
        phone: user.phone || '',
      }));
    }
  }, [user]);

  // Fetch available slots when date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!formData.date || !vehicle?.id) return;
      
      setLoadingSlots(true);
      try {
        const response = await api.get(`/crm/appointments/available_slots/?vehicle=${vehicle.id}&date=${formData.date}`);
        setAvailableSlots(response.slots || []);
        // Clear selected slot if it's no longer available
        if (formData.time_slot) {
          const isStillAvailable = response.slots?.find(s => s.value === formData.time_slot && s.available);
          if (!isStillAvailable) {
            setFormData(prev => ({ ...prev, time_slot: '' }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch slots:', error);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    
    fetchSlots();
  }, [formData.date, vehicle?.id]);

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get maximum date (30 days from now)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage('');

    try {
      await api.post('/crm/appointments/', {
        vehicle: vehicle.id,
        date: formData.date,
        time_slot: formData.time_slot,
        appointment_type: formData.appointment_type,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        notes: formData.notes,
      });
      
      setSubmitStatus('success');
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error.message || 'Failed to book appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form on close
    setSubmitStatus(null);
    setErrorMessage('');
    setFormData(prev => ({
      ...prev,
      date: '',
      time_slot: '',
      notes: '',
    }));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Book an Appointment</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {vehicle?.year} {vehicle?.make} {vehicle?.model}
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Success State */}
        {submitStatus === 'success' ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Appointment Requested!
            </h3>
            <p className="text-gray-600 mb-6">
              Your appointment is <span className="font-semibold text-brand-600">Pending Confirmation</span>. 
              We'll contact you shortly to confirm the details.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(formData.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Time</p>
                  <p className="font-medium text-gray-900">
                    {availableSlots.find(s => s.value === formData.time_slot)?.label || formData.time_slot}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">Type</p>
                  <p className="font-medium text-gray-900">
                    {formData.appointment_type === 'TEST_DRIVE' ? 'Test Drive' : 'Inspection'}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 transition"
            >
              Done
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Appointment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Appointment Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, appointment_type: 'TEST_DRIVE' }))}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 font-medium transition ${
                    formData.appointment_type === 'TEST_DRIVE'
                      ? 'border-brand-600 bg-brand-50 text-brand-600'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Car size={18} />
                  Test Drive
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, appointment_type: 'INSPECTION' }))}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 font-medium transition ${
                    formData.appointment_type === 'INSPECTION'
                      ? 'border-brand-600 bg-brand-50 text-brand-600'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <CheckCircle size={18} />
                  Inspection
                </button>
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} className="inline mr-1" />
                Select Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                min={getMinDate()}
                max={getMaxDate()}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
              />
            </div>

            {/* Time Slot Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock size={16} className="inline mr-1" />
                Select Time
              </label>
              {!formData.date ? (
                <p className="text-sm text-gray-400 italic">Please select a date first</p>
              ) : loadingSlots ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 size={16} className="animate-spin" />
                  Loading available slots...
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.value}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setFormData(prev => ({ ...prev, time_slot: slot.value }))}
                      className={`py-2 px-2 rounded-lg text-sm font-medium transition ${
                        !slot.available
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                          : formData.time_slot === slot.value
                            ? 'bg-brand-600 text-white'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              )}
              {formData.date && !loadingSlots && availableSlots.length === 0 && (
                <p className="text-sm text-red-500 mt-2">No slots available for this date.</p>
              )}
            </div>

            {/* Contact Information */}
            <div className="border-t border-gray-100 pt-5">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Contact Information</h4>
              
              <div className="space-y-3">
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Full Name"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                  />
                </div>
                
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email Address"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                  />
                </div>
                
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Phone Number"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Any special requests or questions..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent resize-none"
              />
            </div>

            {/* Error Message */}
            {submitStatus === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle size={18} />
                {errorMessage}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !formData.date || !formData.time_slot}
              className="w-full py-3.5 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <Calendar size={20} />
                  Book {formData.appointment_type === 'TEST_DRIVE' ? 'Test Drive' : 'Inspection'}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default TestDriveModal;
