import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowLeft, Loader2, Car } from 'lucide-react';
// import UserLayout from '../../components/user/UserLayout';
import api from '../../services/api';
import WishlistButton from '../../components/common/WishlistButton';

/**
 * MyWishlist - Page displaying all vehicles the user has liked
 * 
 * Features:
 * - Fetches full vehicle details for liked items
 * - Reuses card-style display with remove functionality
 * - Empty state with CTA to browse inventory
 */
const MyWishlist = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const data = await api.get('/inventory/wishlist/');
      setVehicles(data);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle when a vehicle is removed from wishlist
  const handleRemoved = (vehicleId) => {
    setVehicles(prev => prev.filter(v => v.id !== vehicleId));
  };

  return (
    // <UserLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="h-8 w-8 text-brand-600" />
            <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
          </div>
          <p className="text-gray-600">
            Cars you've saved for later. Click the heart to remove.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            <span className="ml-3 text-gray-600">Loading your wishlist...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && vehicles.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <Heart className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Your wishlist is empty
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start browsing our inventory and click the heart icon on cars you love to save them here.
            </p>
            <Link
              to="/inventory"
              className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-[#e65100] transition-colors"
            >
              <Car className="h-5 w-5" />
              Browse Inventory
            </Link>
          </div>
        )}

        {/* Wishlist Grid */}
        {!loading && vehicles.length > 0 && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {vehicles.length} {vehicles.length === 1 ? 'car' : 'cars'} in your wishlist
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((vehicle) => (
                <WishlistCard 
                  key={vehicle.id} 
                  vehicle={vehicle}
                  onRemoved={handleRemoved}
                />
              ))}
            </div>
          </>
        )}

        {/* Back Link */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link
            to="/inventory"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue Browsing
          </Link>
        </div>
      </div>
    // </UserLayout>
  );
};

/**
 * WishlistCard - Individual car card in wishlist with remove functionality
 */
// eslint-disable-next-line no-unused-vars
const WishlistCard = ({ vehicle, onRemoved }) => {
  // eslint-disable-next-line no-unused-vars
  const [isRemoving, setIsRemoving] = useState(false);

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Format mileage
  const formatMileage = (mileage) => {
    return new Intl.NumberFormat('en-US').format(mileage);
  };

  // Get primary image
  const primaryImage = vehicle?.thumbnail
    || '/placeholder-car.jpg';

  return (
    <div 
      className={`bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 transition-all duration-300
        ${isRemoving ? 'opacity-50 scale-95' : 'hover:shadow-lg'}`}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <Link to={`/vehicles/${vehicle.slug}`}>
          <img
            src={primaryImage}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </Link>
        
        {/* Wishlist Button - Top Right */}
        <div className="absolute top-3 right-3">
          <WishlistButton 
            vehicleId={vehicle.id} 
            size="md"
          />
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 text-xs font-semibold rounded-full
            ${vehicle.status === 'READY' 
              ? 'bg-green-100 text-green-800' 
              : vehicle.status === 'PENDING'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
            }`}
          >
            {vehicle.status === 'READY' ? 'Available' : vehicle.status}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <Link to={`/vehicles/${vehicle.id}`}>
          <h3 className="text-lg font-bold text-gray-900 mb-1 hover:text-brand-600 transition-colors line-clamp-1">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
        </Link>
        
        {vehicle.trim && (
          <p className="text-sm text-gray-500 mb-2">{vehicle.trim}</p>
        )}

        {/* Specs */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-3">
          <span>{formatMileage(vehicle.mileage)} mi</span>
          {vehicle.fuel_type && <span>{vehicle.fuel_type}</span>}
          {vehicle.transmission && <span>{vehicle.transmission}</span>}
        </div>

        {/* Price */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-xl font-bold text-brand-600">
            {formatPrice(vehicle.price)}
          </span>
          <Link
            to={`/vehicles/${vehicle.id}`}
            className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors"
          >
            View Details →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MyWishlist;
