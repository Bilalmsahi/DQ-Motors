import { Link } from 'react-router-dom';
import { Gauge, Fuel, Zap, ArrowUpRight } from 'lucide-react';
import WishlistButton from '../common/WishlistButton';

const CarCard = ({ vehicle, isDimmed, onHover, onHoverLeave, fullWidth = false }) => {
  // Fallbacks for missing data
  const imageUrl = vehicle.images?.[0]?.image || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=2070&auto=format&fit=crop';
  const price = parseFloat(vehicle.price)?.toLocaleString();
  const campaignPrice = vehicle.active_campaign_price
    ? parseFloat(vehicle.active_campaign_price)?.toLocaleString()
    : null;
  const campaignInfo = vehicle.active_campaign;
  
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onHoverLeave}
      className={`group relative flex flex-col ${fullWidth ? 'w-full' : 'flex-shrink-0 w-[280px] md:w-[320px]'} overflow-hidden rounded-2xl bg-white border border-gray-100 transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.06)] z-10 ${
        isDimmed 
          ? 'opacity-40 scale-[0.98] blur-[1px]' 
          : 'opacity-100 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(226, 5, 5,0.12)] hover:border-brand-600/30 hover:z-20'
      }`}
    >
      <Link to={`/vehicles/${vehicle.slug}`} className="flex flex-col h-full">
        
        {/* Image Container */}
        <div className="relative w-full aspect-video overflow-hidden bg-gray-50">
          <img 
            src={imageUrl} 
            alt={`${vehicle.make} ${vehicle.model}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          
          {/* Top-Left Badges */}
          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1">
            <span className="bg-white/95 text-brand-600 px-2.5 py-1 text-[10px] uppercase tracking-wider font-medium rounded-md shadow-sm">
              {vehicle.status === 'AVAILABLE' ? 'Great Price' : vehicle.status}
            </span>
            {campaignInfo && (
              <span className="bg-white/95 text-accent-600 px-2.5 py-1 text-[10px] uppercase tracking-wider font-medium rounded-md shadow-sm">
                Sale
              </span>
            )}
          </div>

          {/* Wishlist Button - Top Right */}
          <div className="absolute right-2.5 top-2.5">
            <div className="h-7 w-7 flex items-center justify-center bg-white/95 rounded-full shadow-sm text-gray-900 transition-transform hover:scale-110 cursor-pointer" onClick={(e) => e.preventDefault()}>
               <WishlistButton vehicleId={vehicle.id} size="sm" />
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex flex-col flex-1 px-4 py-3">
          {/* Titles & Subtitle */}
          <div className="mb-2">
            <h3 className="text-base md:text-lg font-medium text-gray-900 tracking-tight leading-tight truncate" title={`${vehicle.make} ${vehicle.model}`}>
              {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-[11px] text-gray-500 truncate mt-0.5">
              {vehicle.condition || 'Pre-owned'} • {vehicle.year} • {vehicle.color || 'Standard Color'}
            </p>
          </div>
          
          {/* Clean Horizontal Spec Grid */}
          <div className="flex items-center justify-between bg-gray-50/50 rounded-lg p-2 my-2 border border-gray-100/50">
            <div className="flex items-center gap-1.5">
              <Gauge className="size-4 text-gray-400" />
              <span className="text-[10px] md:text-xs font-semibold text-gray-600">
                {vehicle.mileage?.toLocaleString() || 0} mi
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Fuel className="size-4 text-gray-400" />
              <span className="text-[10px] md:text-xs font-semibold text-gray-600">
                {vehicle.fuel_type || 'Petrol'}
              </span> 
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="size-4 text-gray-400" />
              <span className="text-[10px] md:text-xs font-semibold text-gray-600">
                {vehicle.transmission || 'Auto'}
              </span>
            </div>
          </div>

          {/* Footer: Pricing & CTA */}
          <div className="mt-auto pt-2 flex items-center justify-between">
            {campaignPrice ? (
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] text-gray-400 line-through">${price}</span>
                <span className="text-lg font-semibold text-gray-900">${campaignPrice}</span>
              </div>
            ) : (
              <div className="text-lg font-semibold text-gray-900">${price}</div>
            )}
            
            <span className="text-sm font-medium text-brand-600 flex items-center gap-1 transition-transform group-hover:translate-x-1">
              View Details <ArrowUpRight size={16} />
            </span>
          </div>
        </div>
        
        {/* Magnetic Brand Accent (X-Factor) */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 bg-brand-600 transition-all duration-300 group-hover:w-full" />
      </Link>
    </div>
  );
};

export default CarCard;
