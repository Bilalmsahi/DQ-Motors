import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Car,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  Tag,
  Gauge,
  Calendar,
  MoreVertical,
  AlertCircle,
} from 'lucide-react';

/**
 * UserCarCard - Reusable card component for user's vehicle listings
 * Supports two variants: 'card' (grid view) and 'compact' (list view)
 */
const UserCarCard = ({ vehicle, variant = 'card', onStatusChange }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const statusConfig = {
    READY: { 
      label: 'Active', 
      icon: CheckCircle, 
      bgColor: 'bg-green-100', 
      textColor: 'text-green-700',
      dotColor: 'bg-green-500'
    },
    PENDING: { 
      label: 'Pending', 
      icon: Clock, 
      bgColor: 'bg-yellow-100', 
      textColor: 'text-yellow-700',
      dotColor: 'bg-yellow-500'
    },
    SOLD: { 
      label: 'Sold', 
      icon: Tag, 
      bgColor: 'bg-gray-100', 
      textColor: 'text-gray-700',
      dotColor: 'bg-gray-500'
    },
  };

  const status = statusConfig[vehicle.status] || statusConfig.READY;
  const StatusIcon = status.icon;

  const handleMarkSold = async () => {
    setLoading(true);
    try {
      await api.patch(`/inventory/vehicles/${vehicle.slug}/`, { status: 'SOLD' });
      onStatusChange?.();
    } catch (err) {
      console.error('Failed to mark as sold:', err);
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  const handleMarkReady = async () => {
    setLoading(true);
    try {
      await api.patch(`/inventory/vehicles/${vehicle.slug}/`, { status: 'READY' });
      onStatusChange?.();
    } catch (err) {
      console.error('Failed to mark as ready:', err);
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/inventory/vehicles/${vehicle.slug}/`);
      onStatusChange?.();
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  // Compact variant (for dashboard list)
  if (variant === 'compact') {
    return (
      <>
        <div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
          {/* Thumbnail */}
          <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {vehicle.images?.[0] ? (
              <img
                src={vehicle.images[0].image}
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Car className="h-6 w-6 text-gray-300" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5" />
                {vehicle.mileage?.toLocaleString()} mi
              </span>
              <span className="text-brand-600 font-semibold">
                ${vehicle.price?.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.textColor} flex items-center gap-1`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`}></span>
            {status.label}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Link
              to={`/vehicles/${vehicle.slug}`}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="View"
            >
              <Eye className="h-4 w-4" />
            </Link>
            <Link
              to={`/account/listings/edit/${vehicle.slug}`}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Card variant (for grid view)
  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
        {/* Image */}
        <div className="relative aspect-[16/10] bg-gray-100">
          {vehicle.images?.[0] ? (
            <img
              src={vehicle.images[0].image}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Car className="h-12 w-12 text-gray-300" />
            </div>
          )}
          
          {/* Status Badge */}
          <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.textColor} flex items-center gap-1.5`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {status.label}
          </div>

          {/* Menu Button */}
          <div className="absolute top-3 right-3">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 bg-white/90 hover:bg-white rounded-lg shadow-sm transition-colors"
            >
              <MoreVertical className="h-4 w-4 text-gray-600" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                  <Link
                    to={`/vehicles/${vehicle.slug}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="h-4 w-4" />
                    View Listing
                  </Link>
                  <Link
                    to={`/account/listings/edit/${vehicle.slug}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Link>
                  
                  <div className="border-t border-gray-100 my-1" />
                  
                  {vehicle.status !== 'SOLD' ? (
                    <button
                      onClick={handleMarkSold}
                      disabled={loading}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Mark as Sold
                    </button>
                  ) : (
                    <button
                      onClick={handleMarkReady}
                      disabled={loading}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                    >
                      <Tag className="h-4 w-4" />
                      Relist
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-lg text-gray-900">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          {vehicle.trim && (
            <p className="text-sm text-gray-500">{vehicle.trim}</p>
          )}
          
          <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Gauge className="h-4 w-4" />
              {vehicle.mileage?.toLocaleString()} mi
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(vehicle.created_at).toLocaleDateString()}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xl font-bold text-brand-600">
              ${vehicle.price?.toLocaleString()}
            </p>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Link
                to={`/account/listings/edit/${vehicle.slug}`}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Edit
              </Link>
              {vehicle.status !== 'SOLD' && (
                <button
                  onClick={handleMarkSold}
                  disabled={loading}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  Mark Sold
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Listing</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete{' '}
              <span className="font-medium">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserCarCard;
