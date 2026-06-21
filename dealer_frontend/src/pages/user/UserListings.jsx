import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyListings } from '../../services/api';
import UserCarCard from '../../components/user/UserCarCard';
import {
  Car,
  Plus,
  Search,
  Filter,
  AlertCircle,
} from 'lucide-react';

const UserListings = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchListings();
  }, []);

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

  // Filter vehicles
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.year.toString().includes(searchQuery);
    
    const matchesStatus = statusFilter === 'ALL' || vehicle.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    ALL: vehicles.length,
    READY: vehicles.filter(v => v.status === 'READY').length,
    PENDING: vehicles.filter(v => v.status === 'PENDING').length,
    SOLD: vehicles.filter(v => v.status === 'SOLD').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
          <p className="text-gray-500 mt-1">Manage all your vehicle listings</p>
        </div>
        <Link
          to="/account/listings/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium shadow-lg shadow-brand-600/25"
        >
          <Plus className="h-5 w-5" />
          Add New Car
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by make, model, or year..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {['ALL', 'READY', 'PENDING', 'SOLD'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'ALL' ? 'All' : status === 'READY' ? 'Active' : status.charAt(0) + status.slice(1).toLowerCase()}
                <span className="ml-1.5 opacity-75">({statusCounts[status]})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Listings */}
      {vehicles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="h-10 w-10 text-brand-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No listings yet</h3>
          <p className="text-gray-500 mb-6">Create your first listing to start selling</p>
          <Link
            to="/account/listings/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            Add Your First Car
          </Link>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No vehicles match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVehicles.map((vehicle) => (
            <UserCarCard
              key={vehicle.id}
              vehicle={vehicle}
              variant="card"
              onStatusChange={fetchListings}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default UserListings;
