import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Car,
  User,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  X,
  Filter,
  List,
  Grid3X3,
  Loader2,
  AlertCircle,
  Search,
  MessageSquare,
  QrCode,
  Play,
  Square,
  Timer,
  Printer
} from 'lucide-react';
import api from '../../services/api';

// Status configuration for color coding
const STATUS_CONFIG = {
  PENDING: { 
    label: 'Pending', 
    bgColor: 'bg-amber-100', 
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
    dotColor: 'bg-amber-500'
  },
  CONFIRMED: { 
    label: 'Confirmed', 
    bgColor: 'bg-green-100', 
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
    dotColor: 'bg-green-500'
  },
  COMPLETED: { 
    label: 'Completed', 
    bgColor: 'bg-gray-100', 
    textColor: 'text-gray-600',
    borderColor: 'border-gray-300',
    dotColor: 'bg-gray-400'
  },
  CANCELLED: { 
    label: 'Cancelled', 
    bgColor: 'bg-red-50', 
    textColor: 'text-red-600',
    borderColor: 'border-red-200',
    dotColor: 'bg-red-400'
  },
  NO_SHOW: { 
    label: 'No Show', 
    bgColor: 'bg-slate-100', 
    textColor: 'text-slate-600',
    borderColor: 'border-slate-300',
    dotColor: 'bg-slate-500'
  },
};

const TYPE_CONFIG = {
  TEST_DRIVE: { label: 'Test Drive', icon: Car, color: 'text-blue-600' },
  INSPECTION: { label: 'Inspection', icon: CheckCircle, color: 'text-purple-600' },
};

// Helper to format elapsed time
const formatElapsedTime = (startTime) => {
  if (!startTime) return null;
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now - start;
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

const AdminCalendar = () => {
  // State
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(null);
  const timerRef = useRef(null);

  // Timer effect for in-progress appointments
  useEffect(() => {
    if (selectedAppointment?.check_in_time && !selectedAppointment?.check_out_time) {
      // Start timer
      const updateTimer = () => {
        setElapsedTime(formatElapsedTime(selectedAppointment.check_in_time));
      };
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime(null);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [selectedAppointment]);

  // Fetch appointments
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const data = await api.get('/crm/appointments/?upcoming=true');
      setAppointments(data);
      setError(null);
    } catch (err) {
      setError('Failed to load appointments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      // Status filter
      if (statusFilter !== 'ALL' && apt.status !== statusFilter) return false;
      
      // Type filter
      if (typeFilter !== 'ALL' && apt.appointment_type !== typeFilter) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const customerName = apt.customer_name?.toLowerCase() || '';
        const vehicleTitle = apt.vehicle_title?.toLowerCase() || '';
        if (!customerName.includes(query) && !vehicleTitle.includes(query)) return false;
      }
      
      return true;
    });
  }, [appointments, statusFilter, typeFilter, searchQuery]);

  // Group appointments by date
  const groupedByDate = useMemo(() => {
    const groups = {};
    filteredAppointments.forEach(apt => {
      const dateKey = apt.date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(apt);
    });
    
    // Sort each group by time_slot
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => a.time_slot.localeCompare(b.time_slot));
    });
    
    return groups;
  }, [filteredAppointments]);

  // Get sorted dates
  const sortedDates = useMemo(() => {
    return Object.keys(groupedByDate).sort();
  }, [groupedByDate]);

  // Calendar helpers
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
  
  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  // Get appointments for a specific date (for calendar view)
  const getAppointmentsForDate = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredAppointments.filter(apt => apt.date === dateStr);
  };

  // Action handlers
  const handleConfirm = async (appointmentId) => {
    setActionLoading(true);
    try {
      await api.post(`/crm/appointments/${appointmentId}/confirm/`);
      await fetchAppointments();
      setSelectedAppointment(null);
      // Show simulated notification
      alert('✅ Appointment confirmed! SMS and Email notification sent to customer.');
    } catch (err) {
      alert('Failed to confirm appointment: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    
    setActionLoading(true);
    try {
      await api.post(`/crm/appointments/${appointmentId}/cancel/`);
      await fetchAppointments();
      setSelectedAppointment(null);
    } catch (err) {
      alert('Failed to cancel appointment: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (appointmentId) => {
    setActionLoading(true);
    try {
      await api.post(`/crm/appointments/${appointmentId}/complete/`);
      await fetchAppointments();
      setSelectedAppointment(null);
    } catch (err) {
      alert('Failed to complete appointment: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleNoShow = async (appointmentId) => {
    if (!window.confirm('Mark this customer as No Show?')) return;
    
    setActionLoading(true);
    try {
      await api.post(`/crm/appointments/${appointmentId}/no_show/`);
      await fetchAppointments();
      setSelectedAppointment(null);
    } catch (err) {
      alert('Failed to mark as no-show: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Check-In handler
  const handleCheckIn = async (appointmentId) => {
    setActionLoading(true);
    try {
      const response = await api.post(`/crm/appointments/${appointmentId}/check_in/`);
      alert(`✅ Customer checked in! ${response.message || 'Test drive started.'}`);
      await fetchAppointments();
      // Update selected appointment with new data
      const updatedApt = await api.get(`/crm/appointments/${appointmentId}/`);
      setSelectedAppointment(updatedApt);
    } catch (err) {
      alert('Failed to check in: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Check-Out handler
  const handleCheckOut = async (appointmentId) => {
    setActionLoading(true);
    try {
      const response = await api.post(`/crm/appointments/${appointmentId}/check_out/`);
      alert(`✅ Customer checked out! Duration: ${response.duration || 'N/A'}`);
      await fetchAppointments();
      setSelectedAppointment(null);
    } catch (err) {
      alert('Failed to check out: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Print QR Code
  const handlePrintQR = (appointment) => {
    const qrUrl = appointment.qr_code_url;
    if (!qrUrl) {
      alert('No QR code available for this appointment.');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Appointment QR Code - ${appointment.customer_name}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }
            .ticket {
              border: 2px solid #333;
              border-radius: 12px;
              padding: 30px;
              max-width: 400px;
              text-align: center;
            }
            h1 { margin: 0 0 10px; font-size: 24px; }
            p { margin: 5px 0; color: #555; }
            img { margin: 20px 0; }
            .label { font-weight: bold; color: #333; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <h1>Test Drive Ticket</h1>
            <p><span class="label">Customer:</span> ${appointment.customer_name}</p>
            <p><span class="label">Vehicle:</span> ${appointment.vehicle_title}</p>
            <p><span class="label">Date:</span> ${appointment.date}</p>
            <p><span class="label">Time:</span> ${appointment.time_slot_display || appointment.time_slot}</p>
            <img src="${qrUrl}" alt="QR Code" width="200" height="200" />
            <p>Scan to check in/out</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Appointment Card Component
  const AppointmentCard = ({ appointment, compact = false }) => {
    const status = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.PENDING;
    const type = TYPE_CONFIG[appointment.appointment_type] || TYPE_CONFIG.TEST_DRIVE;
    const TypeIcon = type.icon;
    const isInProgress = appointment.check_in_time && !appointment.check_out_time;

    return (
      <div
        onClick={() => setSelectedAppointment(appointment)}
        className={`group cursor-pointer rounded-xl border-2 ${isInProgress ? 'border-blue-400 bg-blue-50' : `${status.borderColor} ${status.bgColor}`} 
          p-4 hover:shadow-md transition-all ${compact ? 'p-2' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Time & Type */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-gray-900">
                {appointment.time_slot_display || appointment.time_slot}
              </span>
              <span className={`flex items-center gap-1 text-xs font-medium ${type.color}`}>
                <TypeIcon size={12} />
                {type.label}
              </span>
            </div>
            
            {!compact && (
              <>
                {/* Customer */}
                <p className="font-semibold text-gray-900 truncate">
                  {appointment.customer_name}
                </p>
                
                {/* Vehicle */}
                <p className="text-sm text-gray-600 truncate mt-1">
                  {appointment.vehicle_title}
                </p>
              </>
            )}
          </div>
          
          {/* Status Badge */}
          {isInProgress ? (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
              <Timer size={12} className="animate-pulse" />
              In Progress
            </span>
          ) : (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.bgColor} ${status.textColor}`}>
              {status.label}
            </span>
          )}
        </div>
        
        {!compact && (
          <div className="mt-3 pt-3 border-t border-white/50 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-600">
              {isInProgress ? (
                <span className="flex items-center gap-1 text-blue-600 font-medium">
                  <Clock size={12} />
                  {formatElapsedTime(appointment.check_in_time)} elapsed
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Phone size={12} />
                  {appointment.customer_phone || 'N/A'}
                </span>
              )}
            </div>
            <Eye size={16} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
          </div>
        )}
      </div>
    );
  };

  // Calendar Grid View
  const CalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];
    
    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 bg-gray-50" />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayAppointments = getAppointmentsForDate(day);
      const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();
      
      days.push(
        <div 
          key={day} 
          className={`h-32 border border-gray-100 p-1 overflow-hidden ${isToday ? 'bg-brand-50' : 'bg-white'}`}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-brand-600' : 'text-gray-700'}`}>
            {day}
          </div>
          <div className="space-y-1 overflow-y-auto max-h-24">
            {dayAppointments.slice(0, 3).map(apt => (
              <div
                key={apt.id}
                onClick={() => setSelectedAppointment(apt)}
                className={`text-xs p-1 rounded cursor-pointer truncate ${STATUS_CONFIG[apt.status]?.bgColor} ${STATUS_CONFIG[apt.status]?.textColor}`}
              >
                {apt.time_slot_display} - {apt.customer_name?.split(' ')[0]}
              </div>
            ))}
            {dayAppointments.length > 3 && (
              <div className="text-xs text-gray-500 pl-1">
                +{dayAppointments.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="rounded-xl bg-white border border-gray-100 overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <button 
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button 
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-gray-600">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {days}
        </div>
      </div>
    );
  };

  // Appointment Detail Modal
  const AppointmentModal = () => {
    if (!selectedAppointment) return null;
    
    const apt = selectedAppointment;
    const status = STATUS_CONFIG[apt.status] || STATUS_CONFIG.PENDING;
    const type = TYPE_CONFIG[apt.appointment_type] || TYPE_CONFIG.TEST_DRIVE;
    const TypeIcon = type.icon;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedAppointment(null)} />
        
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${status.bgColor}`}>
                <TypeIcon size={20} className={type.color} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{type.label}</h2>
                <span className={`text-sm font-medium ${status.textColor}`}>{status.label}</span>
              </div>
            </div>
            <button 
              onClick={() => setSelectedAppointment(null)}
              className="p-2 rounded-full hover:bg-gray-100 transition"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Date & Time */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <CalendarIcon size={24} className="text-brand-600" />
              <div>
                <p className="text-sm text-gray-500">Scheduled For</p>
                <p className="font-bold text-gray-900">
                  {formatDate(apt.date)} at {apt.time_slot_display || apt.time_slot}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Customer Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User size={18} className="text-gray-400" />
                  <span className="font-medium text-gray-900">{apt.customer_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-gray-400" />
                  <a href={`mailto:${apt.customer_email}`} className="text-brand-600 hover:underline">
                    {apt.customer_email || 'Not provided'}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-gray-400" />
                  <a href={`tel:${apt.customer_phone}`} className="text-gray-900 hover:text-brand-600">
                    {apt.customer_phone || 'Not provided'}
                  </a>
                </div>
                {apt.lead_id && (
                  <div className="flex items-center gap-3">
                    <User size={18} className="text-gray-400" />
                    <Link
                      to={`/admin/leads?highlight=${apt.lead_id}`}
                      className="text-brand-600 hover:underline text-sm font-medium"
                      onClick={() => setSelectedAppointment(null)}
                    >
                      View Lead Profile →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Vehicle
              </h3>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                {apt.vehicle_image ? (
                  <img 
                    src={apt.vehicle_image} 
                    alt={apt.vehicle_title}
                    className="w-20 h-14 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-20 h-14 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Car size={24} className="text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{apt.vehicle_title}</p>
                  <Link 
                    to={`/vehicles/${apt.vehicle}`}
                    className="text-sm text-brand-600 hover:underline"
                  >
                    View Listing →
                  </Link>
                </div>
              </div>
            </div>

            {/* Notes */}
            {apt.notes && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Customer Notes
                </h3>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <MessageSquare size={18} className="text-gray-400 mt-0.5" />
                  <p className="text-gray-700">{apt.notes}</p>
                </div>
              </div>
            )}

            {/* Check-In/Out Status & Live Timer */}
            {apt.status === 'CONFIRMED' && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Check-In Status
                </h3>
                <div className={`p-4 rounded-xl ${apt.check_in_time && !apt.check_out_time ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'}`}>
                  {!apt.check_in_time ? (
                    <div className="flex items-center gap-3 text-gray-600">
                      <Clock size={20} />
                      <span>Not checked in yet</span>
                    </div>
                  ) : apt.check_out_time ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-green-600">
                        <CheckCircle size={20} />
                        <span className="font-medium">Completed</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Duration: <span className="font-semibold">{apt.duration_display || 'N/A'}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-blue-600">
                        <Timer size={20} className="animate-pulse" />
                        <span className="font-bold">In Progress</span>
                      </div>
                      <div className="flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-lg">
                        <Clock size={16} className="text-blue-600" />
                        <span className="text-blue-800 font-bold text-lg">{elapsedTime || '0m'}</span>
                        <span className="text-blue-600 text-sm">elapsed</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Checked in at: {new Date(apt.check_in_time).toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* QR Code Section - Only for CONFIRMED appointments */}
            {apt.status === 'CONFIRMED' && apt.qr_code_url && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Appointment QR Code
                </h3>
                <div className="flex flex-col items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <img 
                    src={apt.qr_code_url} 
                    alt="Appointment QR Code"
                    className="w-32 h-32 border-2 border-gray-200 rounded-lg bg-white p-1"
                  />
                  <p className="text-xs text-gray-500 text-center">
                    Customer can scan this QR code to check in/out
                  </p>
                  <button
                    onClick={() => handlePrintQR(apt)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
                  >
                    <Printer size={16} />
                    Print Ticket
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="border-t border-gray-100 pt-6 space-y-3">
              {apt.status === 'PENDING' && (
                <button
                  onClick={() => handleConfirm(apt.id)}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  Confirm Appointment
                </button>
              )}
              
              {apt.status === 'CONFIRMED' && (
                <>
                  {/* Check-In / Check-Out Buttons */}
                  {!apt.check_in_time ? (
                    <button
                      onClick={() => handleCheckIn(apt.id)}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                      Manual Check-In
                    </button>
                  ) : !apt.check_out_time ? (
                    <button
                      onClick={() => handleCheckOut(apt.id)}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Square size={18} />}
                      Manual Check-Out
                    </button>
                  ) : (
                    <button
                      onClick={() => handleComplete(apt.id)}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                      Mark as Completed
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleNoShow(apt.id)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-slate-600 text-white font-bold rounded-xl hover:bg-slate-700 transition disabled:opacity-50"
                  >
                    <XCircle size={18} />
                    Mark as No Show
                  </button>
                </>
              )}
              
              {!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(apt.status) && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => alert('Reschedule feature coming soon!')}
                    className="flex items-center justify-center gap-2 py-3 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition"
                  >
                    <RefreshCw size={16} />
                    Reschedule
                  </button>
                  <button
                    onClick={() => handleCancel(apt.id)}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 py-3 border-2 border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Stats
  const stats = useMemo(() => ({
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'PENDING').length,
    confirmed: appointments.filter(a => a.status === 'CONFIRMED').length,
    inProgress: appointments.filter(a => a.check_in_time && !a.check_out_time).length,
    today: appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length,
  }), [appointments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Appointment Calendar</h1>
          <p className="text-gray-500 mt-1">Manage test drives and inspections</p>
        </div>
        <button
          onClick={fetchAppointments}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="rounded-xl bg-white p-4 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Today</p>
          <p className="text-2xl font-bold text-slate-800">{stats.today}</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-4 border border-amber-100">
          <p className="text-sm text-amber-600">Pending</p>
          <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
        </div>
        <div className="rounded-xl bg-green-50 p-4 border border-green-100">
          <p className="text-sm text-green-600">Confirmed</p>
          <p className="text-2xl font-bold text-green-700">{stats.confirmed}</p>
        </div>
        {stats.inProgress > 0 && (
          <div className="rounded-xl bg-blue-50 p-4 border border-blue-200">
            <div className="flex items-center gap-1">
              <Timer size={14} className="text-blue-600 animate-pulse" />
              <p className="text-sm text-blue-600">In Progress</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">{stats.inProgress}</p>
          </div>
        )}
        <div className="rounded-xl bg-white p-4 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Total Upcoming</p>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search customer or vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent w-64"
            />
          </div>
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
          </select>
          
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="ALL">All Types</option>
            <option value="TEST_DRIVE">Test Drives</option>
            <option value="INSPECTION">Inspections</option>
          </select>
        </div>
        
        {/* View Toggle */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition ${
              viewMode === 'list' 
                ? 'bg-brand-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <List size={16} />
            List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition ${
              viewMode === 'calendar' 
                ? 'bg-brand-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Grid3X3 size={16} />
            Calendar
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Empty State */}
      {!error && filteredAppointments.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <CalendarIcon size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No Appointments Found</h3>
          <p className="text-gray-500 mt-1">
            {searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL' 
              ? 'Try adjusting your filters' 
              : 'No upcoming appointments scheduled'}
          </p>
        </div>
      )}

      {/* Main Content */}
      {!error && filteredAppointments.length > 0 && (
        viewMode === 'calendar' ? (
          <CalendarGrid />
        ) : (
          <div className="space-y-6">
            {sortedDates.map(date => (
              <div key={date}>
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`h-3 w-3 rounded-full ${
                    date === new Date().toISOString().split('T')[0] ? 'bg-brand-600' : 'bg-gray-300'
                  }`} />
                  <h3 className="text-lg font-semibold text-gray-900">{formatDate(date)}</h3>
                  <span className="text-sm text-gray-500">
                    ({groupedByDate[date].length} appointment{groupedByDate[date].length !== 1 ? 's' : ''})
                  </span>
                </div>
                
                {/* Appointments Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-6">
                  {groupedByDate[date].map(apt => (
                    <AppointmentCard key={apt.id} appointment={apt} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Appointment Detail Modal */}
      <AppointmentModal />
    </div>
  );
};

export default AdminCalendar;
