import { useState, useEffect } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css'; // Import default styles
import { ChevronDown, RotateCcw } from 'lucide-react';
import api from '../../services/api';

const FilterSidebar = ({ filters, setFilters }) => {
  // Dynamic dropdown choices fetched from the server
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [colors, setColors] = useState([]);

  // Fetch makes & colors once on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const data = await api.get('/inventory/vehicles/filter_options/');
        setMakes(data.makes || []);
        setModels(data.models || []);
        setColors(data.colors || []);
      } catch (err) {
        console.error('Failed to load filter options', err);
      }
    };
    fetchOptions();
  }, []);

  // Smart model reload: re-fetch models scoped to selected make
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const endpoint = filters.make && filters.make !== 'All'
          ? `/inventory/vehicles/filter_options/?make=${encodeURIComponent(filters.make)}`
          : '/inventory/vehicles/filter_options/';
        const data = await api.get(endpoint);
        setModels(data.models || []);
      } catch (err) {
        console.error('Failed to load models', err);
      }
    };
    fetchModels();
  }, [filters.make]);

  // Helper to update specific filter fields
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      make: 'All',
      model: 'All',
      color: 'All',
      body_style: 'All',
      fuel_type: 'All',
      status: 'All',
      featured: false,
      priceRange: [0, 250000],
      mileageRange: [0, 200000],
      yearRange: [2010, 2026]
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Filters</h3>
        <button 
          onClick={resetFilters}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-600 transition-colors"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      {/* --- Make Dropdown --- */}
      <div className="space-y-4">
        <div className="relative">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Make</label>
          <select 
            className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-brand-600 focus:outline-none"
            onChange={(e) => {
              handleFilterChange('make', e.target.value);
              // Reset model when make changes
              handleFilterChange('model', 'All');
            }}
            value={filters.make}
          >
            <option value="All">All Makes</option>
            {makes.map(make => (
              <option key={make} value={make}>{make}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 bottom-3 text-gray-400" size={16} />
        </div>

        {/* --- Model Dropdown --- */}
        <div className="relative">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Model</label>
          <select 
            className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-brand-600 focus:outline-none"
            onChange={(e) => handleFilterChange('model', e.target.value)}
            value={filters.model}
          >
            <option value="All">All Models</option>
            {models.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 bottom-3 text-gray-400" size={16} />
        </div>

        {/* --- Color Dropdown --- */}
        <div className="relative">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Color</label>
          <select 
            className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-brand-600 focus:outline-none"
            onChange={(e) => handleFilterChange('color', e.target.value)}
            value={filters.color}
          >
            <option value="All">All Colors</option>
            {colors.map(color => (
              <option key={color} value={color}>{color}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 bottom-3 text-gray-400" size={16} />
        </div>

      </div>

      {/* --- Featured Checkbox --- */}
      <div className="mt-6 flex items-center gap-2">
        <input 
          type="checkbox" 
          id="featured"
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
          checked={filters.featured}
          onChange={(e) => handleFilterChange('featured', e.target.checked)}
        />
        <label htmlFor="featured" className="text-sm text-gray-600">Featured Only</label>
      </div>

      {/* --- Price Range Slider --- */}
      <div className="mt-8 border-t border-gray-100 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <label className="text-sm font-bold text-gray-900">Price</label>
          <span className="text-xs font-bold text-brand-600">
            ${filters.priceRange[0].toLocaleString()} - ${filters.priceRange[1].toLocaleString()}
          </span>
        </div>
        <Slider
          range
          min={0}
          max={250000}
          step={1000}
          value={filters.priceRange}
          onChange={(val) => handleFilterChange('priceRange', val)}
          trackStyle={[{ backgroundColor: '#E20505' }]}
          handleStyle={[
            { borderColor: '#E20505', backgroundColor: 'white', opacity: 1 },
            { borderColor: '#E20505', backgroundColor: 'white', opacity: 1 },
          ]}
          railStyle={{ backgroundColor: '#e5e7eb' }}
        />
      </div>

      {/* --- Mileage Slider --- */}
      <div className="mt-8 border-t border-gray-100 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <label className="text-sm font-bold text-gray-900">Mileage</label>
          <span className="text-xs font-bold text-brand-600">
            {filters.mileageRange[0].toLocaleString()} - {filters.mileageRange[1].toLocaleString()} km
          </span>
        </div>
        <Slider
          range
          min={0}
          max={200000}
          step={5000}
          value={filters.mileageRange}
          onChange={(val) => handleFilterChange('mileageRange', val)}
          trackStyle={[{ backgroundColor: '#E20505' }]}
          handleStyle={[
            { borderColor: '#E20505', backgroundColor: 'white', opacity: 1 },
            { borderColor: '#E20505', backgroundColor: 'white', opacity: 1 },
          ]}
          railStyle={{ backgroundColor: '#e5e7eb' }}
        />
      </div>

      {/* --- Year Slider --- */}
      <div className="mt-8 border-t border-gray-100 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <label className="text-sm font-bold text-gray-900">Year</label>
          <span className="text-xs font-bold text-brand-600">
            {filters.yearRange[0]} - {filters.yearRange[1]}
          </span>
        </div>
        <Slider
          range
          min={2000}
          max={2026}
          value={filters.yearRange}
          onChange={(val) => handleFilterChange('yearRange', val)}
          trackStyle={[{ backgroundColor: '#E20505' }]}
          handleStyle={[
            { borderColor: '#E20505', backgroundColor: 'white', opacity: 1 },
            { borderColor: '#E20505', backgroundColor: 'white', opacity: 1 },
          ]}
          railStyle={{ backgroundColor: '#e5e7eb' }}
        />
      </div>

    </div>
  );
};

export default FilterSidebar;