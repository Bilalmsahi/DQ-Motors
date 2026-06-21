import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyListings } from '../../services/api';
import api from '../../services/api';
import {
  Car,
  Plus,
  TrendingUp,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  CalendarCheck,
  QrCode,
  Ticket,
} from 'lucide-react';
import UserCarCard from '../../components/user/UserCarCard';
import TicketModal from '../../components/user/TicketModal';

const UserDashboard = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Ticket Modal State
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch listings and appointments in parallel
      const [listingsData, appointmentsData] = await Promise.all([
        getMyListings().catch(() => []),
        api.get('/crm/appointments/my_appointments/').catch(() => []),
      ]);
      setVehicles(listingsData);
      setAppointments(appointmentsData);
    } catch {
      setError('Failed to load your data');
    } finally {
      setLoading(false);
    }
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      const data = await getMyListings();
      setVehicles(data);
    } catch {
      setError('Failed to load your listings');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTicket = (appointment) => {
    setSelectedAppointment(appointment);
    setTicketModalOpen(true);
  };

  // Get upcoming/active appointments
  const upcomingAppointments = appointments.filter(
    apt => ['PENDING', 'CONFIRMED'].includes(apt.status)
  ).slice(0, 3);

  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'READY').length,
    pending: vehicles.filter(v => v.status === 'PENDING').length,
    sold: vehicles.filter(v => v.status === 'SOLD').length,
  };

  const recentListings = vehicles.slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.first_name || user?.username}! 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Here's what's happening with your listings
          </p>
        </div>
        <Link
          to="/account/listings/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium shadow-lg shadow-brand-600/25"
        >
          <Plus className="h-5 w-5" />
          List New Car
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-xl">
              <Car className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Listings</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-xl">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-100 rounded-xl">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 rounded-xl">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.sold}</p>
              <p className="text-sm text-gray-500">Sold</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <CalendarCheck className="h-5 w-5 text-brand-600" />
              <h2 className="text-lg font-semibold text-gray-900">Your Appointments</h2>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {upcomingAppointments.map((apt) => (
              <div 
                key={apt.id}
                className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4"
              >
                {/* Vehicle Image */}
                <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {apt.vehicle_image ? (
                    <img 
                      src={apt.vehicle_image} 
                      alt={apt.vehicle_title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* Appointment Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">
                      {apt.vehicle_title}
                    </p>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      apt.status === 'CONFIRMED' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {apt.status_display || apt.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(apt.date + 'T00:00:00').toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })} at {apt.time_slot_display || apt.time_slot}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span>
                      {apt.appointment_type === 'TEST_DRIVE' ? '🚗 Test Drive' : '🔍 Inspection'}
                    </span>
                  </div>
                </div>
                
                {/* View Ticket Button - Only for Confirmed */}
                {apt.status === 'CONFIRMED' && apt.qr_code_url && (
                  <button
                    onClick={() => handleViewTicket(apt)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
                  >
                    <QrCode className="h-4 w-4" />
                    View Ticket
                  </button>
                )}
                
                {/* Pending Status */}
                {apt.status === 'PENDING' && (
                  <span className="text-sm text-gray-500 italic">
                    Awaiting confirmation
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions / Empty State */}
      {vehicles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="h-10 w-10 text-brand-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No listings yet
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Start selling your car today! It only takes a few minutes to create your first listing.
          </p>
          <Link
            to="/account/listings/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            Create Your First Listing
          </Link>
        </div>
      ) : (
        <>
          {/* Recent Listings */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Recent Listings</h2>
              <Link
                to="/account/listings"
                className="text-brand-600 hover:text-brand-700 text-sm font-medium flex items-center gap-1"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="divide-y divide-gray-100">
              {recentListings.map((vehicle) => (
                <UserCarCard 
                  key={vehicle.id} 
                  vehicle={vehicle} 
                  variant="compact"
                  onStatusChange={fetchListings}
                />
              ))}
            </div>
          </div>

          {/* Tips Section */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-3">💡 Tips to sell faster</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                Add high-quality photos from multiple angles
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                Write a detailed description including service history
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                Price competitively based on market value
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                Respond quickly to inquiries
              </li>
            </ul>
          </div>
        </>
      )}

      {/* Ticket Modal */}
      <TicketModal
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        appointment={selectedAppointment}
      />
    </div>
  );
};

export default UserDashboard;
