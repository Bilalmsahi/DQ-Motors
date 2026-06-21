import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Gauge, Fuel, Settings2, Image, User } from 'lucide-react';
import featuredCarsCover from '../../assets/featured-cars.webp';

// Mini Car Card Component
const MiniCarCard = ({ vehicle }) => {
  const imageUrl =
    vehicle.images?.[0]?.image ||
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=2070&auto=format&fit=crop';
  const price = parseFloat(vehicle.price)?.toLocaleString();
  const vehiclePath = vehicle.slug ? `/vehicles/${vehicle.slug}` : `/vehicles/${vehicle.id}`;

  return (
    <Link
      to={vehiclePath}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100/50 ring-1 ring-gray-100"
    >
      {/* Image */}
      <div className="relative h-44 w-full overflow-hidden">
        <img
          src={imageUrl}
          alt={`${vehicle.make} ${vehicle.model}`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {/* Badges */}
        <div className="absolute left-3 top-3 flex gap-2">
          <span className="rounded px-2 py-1 text-[10px] font-medium uppercase text-white bg-brand-600">
            Featured
          </span>
        </div>
        <div className="absolute right-3 top-3 flex gap-2">
          <span className="flex items-center gap-1 rounded bg-black/50 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
            <Image size={12} /> {vehicle.images?.length || 0}
          </span>
          <span className="rounded bg-white px-2 py-1 text-[10px] font-medium text-gray-800">
            {vehicle.year}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 text-xs text-brand-600 font-medium">{vehicle.body_type || 'Sedan'}</div>
        <h3 className="mb-2 text-base font-medium text-gray-900 truncate">
          {vehicle.make} {vehicle.model} {vehicle.year}
        </h3>

        {/* Specs */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <Gauge size={14} /> {vehicle.mileage?.toLocaleString() || '0'} km
          </span>
          <span className="flex items-center gap-1">
            <Fuel size={14} /> {vehicle.fuel_type || 'Gasoline'}
          </span>
          <span className="flex items-center gap-1">
            <Settings2 size={14} /> {vehicle.transmission || 'Automatic'}
          </span>
        </div>

        {/* Price */}
        <div className="text-xl font-medium text-brand-600 mb-4">${price}</div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              <User size={16} className="text-gray-500" />
            </div>
            <span className="text-sm font-medium text-gray-700">Dealer</span>
          </div>
          <span className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
            View car
          </span>
        </div>
      </div>
    </Link>
  );
};

const FeaturedCarsSection = ({ vehicles = [] }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Large showcase images
  const showcaseImages = [
    featuredCarsCover,
    'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?q=80&w=2069&auto=format&fit=crop',
  ];

  return (
    <section className="py-16 md:py-20 bg-white rounded-3xl my-6 shadow-sm">
      <div className="px-2 sm:px-4">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left - Large Showcase Image */}
          <div className="lg:w-1/2">
            <div className="relative h-[680px] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-gray-200">
              <img
                src={showcaseImages[currentImageIndex]}
                alt="Showcase Car"
                className="w-full h-full object-cover"
              />
              {/* Slider Dots */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {showcaseImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`h-3 w-3 rounded-full transition-all ${index === currentImageIndex ? 'bg-brand-600' : 'bg-white/60'
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right - Title + Car Cards */}
          <div className="lg:w-1/2">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3">
              Find your dream car easily and quickly
            </h2>
            <p className="text-gray-500 mb-8">
              Browse thousands of new and used cars from all reputable brands on the market.
            </p>

            {/* Car Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {vehicles.slice(0, 4).map((vehicle) => (
                <MiniCarCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>

            {/* Empty State */}
            {vehicles.length === 0 && (
              <div className="py-20 text-center text-gray-400">Loading vehicles...</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCarsSection;

