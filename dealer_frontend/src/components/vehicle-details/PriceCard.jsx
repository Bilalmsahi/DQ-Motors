import { Gauge, Fuel, Zap } from 'lucide-react';
import WishlistButton from '../common/WishlistButton';

const PriceCard = ({ vehicle }) => {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900">{vehicle.make} {vehicle.model} {vehicle.year}</h1>
        <WishlistButton vehicleId={vehicle.id} size="md" />
      </div>
      
      {/* Specs Row */}
      <div className="my-4 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
            <Gauge size={14} /> {vehicle.mileage?.toLocaleString()} km
        </div>
        <div className="flex items-center gap-1">
            <Fuel size={14} /> {vehicle.fuel_type || '---'}
        </div>
        <div className="flex items-center gap-1">
            <Zap size={14} /> {vehicle.transmission || '---'}
        </div>
      </div>

      <div className="text-3xl font-bold text-brand-600">
        ${parseFloat(vehicle.price)?.toLocaleString()}
      </div>
    </div>
  );
};

export default PriceCard;