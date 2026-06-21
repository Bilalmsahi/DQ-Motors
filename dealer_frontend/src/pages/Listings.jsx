import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

// Components
import Navbar from '../components/home/Navbar';
import CampaignBanner from '../components/home/CampaignBanner';
import Footer from '../components/home/Footer';
import CarCard from '../components/home/CarCard';
import FilterSidebar from '../components/listings/FilterSidebar';
import ListingHeader from '../components/listings/ListingHeader';
import PaginationControls from '../components/common/PaginationControls';

const Listings = () => {
  const [searchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // ── Pagination & Sort ───────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [sortBy, setSortBy] = useState('-created_at');

  // ── Tab (condition) ─────────────────────────────────────
  const conditionParam = searchParams.get('condition');
  const [activeTab, setActiveTab] = useState(
    conditionParam === 'NEW' ? 'New Car' : conditionParam === 'USED' ? 'Used Car' : 'All'
  );

  // ── Sidebar Filters ─────────────────────────────────────
  const [filters, setFilters] = useState({
    make: searchParams.get('make') || 'All',
    model: searchParams.get('model') || 'All',
    color: searchParams.get('color') || 'All',
    body_style: searchParams.get('body_style') || 'All',
    fuel_type: searchParams.get('fuel_type') || 'All',
    status: 'All',
    featured: false,
    priceRange: [0, 250000],
    mileageRange: [0, 200000],
    yearRange: [
      Number(searchParams.get('year_min')) || 2000,
      Number(searchParams.get('year_max')) || 2026,
    ],
  });

  // Sync filters when URL search params change (e.g. homepage search widget / footer links)
  useEffect(() => {
    const makeParam = searchParams.get('make');
    const modelParam = searchParams.get('model');
    const colorParam = searchParams.get('color');
    const yearMin = searchParams.get('year_min');
    const yearMax = searchParams.get('year_max');
    const condParam = searchParams.get('condition');

    setFilters((prev) => ({
      ...prev,
      make: makeParam || 'All',
      model: modelParam || 'All',
      color: colorParam || 'All',
      body_style: searchParams.get('body_style') || 'All',
      fuel_type: searchParams.get('fuel_type') || 'All',
      yearRange: [
        Number(yearMin) || prev.yearRange[0],
        Number(yearMax) || prev.yearRange[1],
      ],
    }));

    if (condParam === 'NEW') setActiveTab('New Car');
    else if (condParam === 'USED') setActiveTab('Used Car');

    setCurrentPage(1);
  }, [searchParams]);

  // Build query params and fetch from server
  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      // Pagination & ordering
      params.set('page', currentPage);
      if (sortBy) params.set('ordering', sortBy);

      // Condition tab
      if (activeTab === 'New Car') params.set('condition', 'NEW');
      if (activeTab === 'Used Car') params.set('condition', 'USED');

      // Only show vehicles available for sale
      params.set('status', 'READY');

      // Exact-match sidebar filters
      if (filters.make !== 'All') params.set('make', filters.make);
      if (filters.model !== 'All') params.set('model', filters.model);
      if (filters.color !== 'All') params.set('color', filters.color);
      if (filters.body_style !== 'All') params.set('body_style', filters.body_style);
      if (filters.fuel_type !== 'All') params.set('fuel_type', filters.fuel_type);
      if (filters.featured) params.set('featured', 'true');

      // Range filters
      if (filters.priceRange[0] > 0) params.set('price_min', filters.priceRange[0]);
      if (filters.priceRange[1] < 250000) params.set('price_max', filters.priceRange[1]);
      if (filters.mileageRange[0] > 0) params.set('mileage_min', filters.mileageRange[0]);
      if (filters.mileageRange[1] < 200000) params.set('mileage_max', filters.mileageRange[1]);
      if (filters.yearRange[0] > 2000) params.set('year_min', filters.yearRange[0]);
      if (filters.yearRange[1] < 2026) params.set('year_max', filters.yearRange[1]);

      const data = await api.get(`/inventory/vehicles/?${params.toString()}`);
      setVehicles(data.results ?? []);
      setTotalCount(data.count ?? 0);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, activeTab, filters]);

  // Debounce fetch so slider drags don't spam the API
  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchVehicles();
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [fetchVehicles]);

  // When filters or tab change, reset page to 1
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSortChange = (val) => {
    setSortBy(val);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <Navbar />
      <CampaignBanner />

      {/* Page Header */}
      <div className="bg-gray-50 py-10">
        <div className="container mx-auto px-6">
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            {totalCount.toLocaleString()}+ Get The Best Deals On Used Cars
          </h1>
          <p className="mt-2 text-gray-500 text-center">Explore our selection of high-quality vehicles.</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          
          {/* Left Column: Sidebar (25%) */}
          <div className="lg:col-span-1">
            <FilterSidebar 
              filters={filters} 
              setFilters={handleFiltersChange} 
            />
          </div>

          {/* Right Column: Grid (75%) */}
          <div className="lg:col-span-3">
            
            <ListingHeader 
              total={totalCount}
              activeTab={activeTab}
              setActiveTab={handleTabChange}
              sortBy={sortBy}
              onSortChange={handleSortChange}
            />

            {/* Loading State */}
            {loading && (
              <div className="py-20 text-center text-gray-400">Loading vehicles...</div>
            )}

            {/* Empty State */}
            {!loading && vehicles.length === 0 && (
              <div className="py-16 text-center bg-gray-50 rounded-2xl mt-6 px-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 rounded-full mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-xl font-semibold text-gray-700">No vehicles match your filters</p>
                <p className="mt-2 text-gray-500">Try adjusting your filter criteria or let us find one for you.</p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                  <button 
                    onClick={() => handleFiltersChange({
                      make: 'All', model: 'All', color: 'All', body_style: 'All', fuel_type: 'All',
                      status: 'All', featured: false, priceRange: [0, 250000], mileageRange: [0, 200000], yearRange: [2000, 2026]
                    })}
                    className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                  >
                    Reset Filters
                  </button>
                  <a 
                    href="/find-my-car"
                    className="px-6 py-2.5 bg-brand-600 text-white rounded-xl font-medium hover:bg-[#e65100] transition-colors"
                  >
                    🔍 Request a Car Search
                  </a>
                </div>
              </div>
            )}

            {/* Vehicle Grid */}
            {!loading && vehicles.length > 0 && (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {vehicles.map((vehicle) => (
                  <CarCard key={vehicle.id} vehicle={vehicle} fullWidth />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && vehicles.length > 0 && (
              <div className="mt-10">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  pageSize={pageSize}
                  label="vehicles"
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Find My Car CTA Section */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Can't Find What You're Looking For?
          </h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Tell us what car you need and we'll search our network to find it for you. 
            It's free and there's no obligation.
          </p>
          <a 
            href="/find-my-car"
            className="inline-flex items-center gap-2 bg-brand-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-[#e65100] transition-colors shadow-lg shadow-brand-600/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Submit a Vehicle Request
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Listings;