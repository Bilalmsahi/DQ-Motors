import { useEffect, useState } from 'react';
import api from '../services/api'; // Using the fetch wrapper we created
import { Gauge, Fuel, Zap, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const FeaturedVehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        // Fetch only READY featured vehicles from the dedicated endpoint
        const data = await api.get('/inventory/vehicles/featured/');
        const list = Array.isArray(data) ? data : data.results || [];
        setVehicles(list.slice(0, 3)); 
      } catch (error) {
        console.error("Failed to load vehicles", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLatest();
  }, []);

  if (loading) return <div className="py-20 text-center">Loading Inventory...</div>;

  return (
    <section className="bg-gray-50 py-24 px-6 md:px-20">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Latest Arrivals</h2>
        <p className="mt-2 text-gray-500">Curabitur tellus leo, euismod sit amet gravida at.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((car) => (
          <div key={car.id} className="group relative overflow-hidden rounded-lg bg-white shadow-sm transition hover:shadow-lg">
            
            {/* Image Container */}
            <div className="relative h-64 w-full overflow-hidden bg-gray-200">
              {car.images && car.images.length > 0 ? (
                <img 
                  src={car.images[0].image} 
                  alt={`${car.make} ${car.model}`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">No Image</div>
              )}
              
              {/* Floating Price Tag */}
              <div className="absolute bottom-4 left-4 rounded bg-white px-3 py-1 font-bold text-gray-900 shadow">
                ${parseFloat(car.price).toLocaleString()}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">{car.make} {car.model}</h3>
                    <p className="text-sm text-gray-500">{car.condition} • {car.year}</p>
                </div>
                {/* Status Badge */}
                <span className={`text-xs px-2 py-1 rounded ${car.status === 'READY' ? 'bg-green-100 text-green-800' : car.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                    {car.status === 'READY' ? 'Available' : car.status}
                </span>
              </div>

              {/* Specs Grid */}
              <div className="mt-6 grid grid-cols-4 gap-2 border-t border-gray-100 pt-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Gauge className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-600">{car.mileage}mi</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Fuel className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-600">Gas</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Zap className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-600">Auto</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-600">NY</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
        
      <div className="mt-12 text-center">
        <Link to="/inventory" className="inline-block rounded bg-gray-900 px-8 py-3 font-medium text-white transition hover:bg-gray-800">
            View All Inventory
        </Link>
      </div>
    </section>
  );
};

export default FeaturedVehicles;