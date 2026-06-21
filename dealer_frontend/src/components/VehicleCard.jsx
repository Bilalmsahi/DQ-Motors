import { Link } from 'react-router-dom';
import { Gauge, Fuel, Zap, MapPin } from 'lucide-react';

const VehicleCard = ({ vehicle }) => {
  // Safe access to image
  const imageUrl = vehicle.images && vehicle.images.length > 0 
    ? vehicle.images[0].image 
    : 'https://via.placeholder.com/400x300?text=No+Image';

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg bg-white shadow-sm transition hover:shadow-lg border border-gray-100">
      
      {/* Image Section */}
      <div className="relative h-56 w-full overflow-hidden bg-gray-200">
        <img 
          src={imageUrl} 
          alt={`${vehicle.make} ${vehicle.model}`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        
        {/* Badges */}
        <div className="absolute top-4 left-4">
          <span className={`px-3 py-1 text-xs font-bold uppercase text-white rounded ${vehicle.status === 'READY' ? 'bg-green-600' : 'bg-red-600'}`}>
            {vehicle.status}
          </span>
        </div>

        {/* Price Overlay */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-1.5 rounded text-gray-900 font-bold shadow-sm">
          ${parseFloat(vehicle.price).toLocaleString()}
        </div>
      </div>

      {/* Content Section */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4">
          <div className="flex justify-between items-start">
             <div>
                <h3 className="text-lg font-bold text-gray-900 line-clamp-1">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                <p className="text-sm text-gray-500">{vehicle.trim}</p>
             </div>
          </div>
        </div>

        {/* Specs Grid */}
        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-gray-100 pt-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <Gauge className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-600 font-medium">{vehicle?.mileage?.toLocaleString()} mi</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Fuel className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-600 font-medium">Gas</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Zap className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-600 font-medium">Auto</span>
          </div>
        </div>
        
        {/* Footer / CTA */}
        <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-500 gap-1">
                <MapPin className="w-3 h-3" />
                <span>New York, NY</span>
            </div>
            <Link to={`/vehicles/${vehicle.slug}`} className="text-brand-600 font-semibold hover:text-brand-700">
                View Details
            </Link>
        </div>
      </div>
    </div>
  );
};

export default VehicleCard;