import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const SearchWidget = () => {
  const navigate = useNavigate();

  // ── Dropdown options from the backend ────────────────────
  const [options, setOptions] = useState({
    makes: [],
    models: [],
    years: [],
    colors: [],
  });

  // ── Selected filter values ───────────────────────────────
  const [filters, setFilters] = useState({
    condition: '', // Was activeTab
    make: '',
    model: '',
    year: '',
    color: '',
  });

  const [focusedField, setFocusedField] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.custom-dropdown-container')) {
        setOpenDropdown(null);
        setFocusedField(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Fetch dropdown options on mount ──────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get('/inventory/filters/');
        setOptions({
          makes: data.makes || [],
          models: data.models || [],
          years: data.years || [],
          colors: data.colors || [],
        });
      } catch (err) {
        console.error('Failed to load filter options', err);
      }
    };
    load();
  }, []);

  // ── Smart model reload when make changes ─────────────────
  useEffect(() => {
    if (!filters.make) return;
    const loadModels = async () => {
      try {
        const data = await api.get(`/inventory/filters/?make=${encodeURIComponent(filters.make)}`);
        setOptions((prev) => ({ ...prev, models: data.models || [] }));
      } catch (err) {
        console.error('Failed to load models for make', err);
      }
    };
    loadModels();
    // Reset model selection when make changes
    setFilters((prev) => ({ ...prev, model: '' }));
  }, [filters.make]);

  // ── Build query string & navigate ────────────────────────
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (filters.condition) params.set('condition', filters.condition.toUpperCase());
    if (filters.make) params.set('make', filters.make);
    if (filters.model) params.set('model', filters.model);
    if (filters.year) {
      params.set('year_min', filters.year);
      params.set('year_max', filters.year);
    }
    if (filters.color) params.set('color', filters.color);

    const qs = params.toString();
    navigate(`/listings${qs ? `?${qs}` : ''}`);
  };

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const fields = [
    { id: 'condition', label: 'Condition', options: [{ value: 'New', label: 'New Car' }, { value: 'Used', label: 'Used Car' }] },
    { id: 'make', label: 'Make', options: options.makes.map(m => ({ value: m, label: m })) },
    { id: 'model', label: 'Model', options: options.models.map(m => ({ value: m, label: m })) },
    { id: 'year', label: 'Year', options: options.years.map(y => ({ value: y, label: y })) },
    { id: 'color', label: 'Color', options: options.colors.map(c => ({ value: c, label: c })) },
  ];

  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-full flex justify-center"
    >
      <div className="relative flex flex-col md:flex-row items-center rounded-2xl md:rounded-full border border-white/20 bg-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.3)] px-6 py-2 gap-2 md:gap-0 w-full md:w-auto">
        {fields.map((field, idx) => (
          <div 
            key={field.id}
            className={`relative custom-dropdown-container flex-1 min-w-[120px] px-4 py-2 w-full md:w-auto ${idx !== fields.length - 1 ? 'md:border-r border-white/20' : ''}`}
          >
            {/* Magnetic Glow */}
            <AnimatePresence>
              {focusedField === field.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 bg-brand-600 blur-xl opacity-20 rounded-full md:rounded-lg -z-10 pointer-events-none"
                />
              )}
            </AnimatePresence>
            
            <label className="block text-[10px] uppercase font-semibold text-white/70 mb-0.5 tracking-wider">{field.label}</label>
            <div 
              className="relative w-full cursor-pointer"
              onClick={() => {
                const isOpening = openDropdown !== field.id;
                setOpenDropdown(isOpening ? field.id : null);
                setFocusedField(isOpening ? field.id : null);
              }}
            >
              <div className="flex items-center justify-between text-white font-medium text-sm w-full py-1">
                <span className="truncate pr-2">
                  {filters[field.id] 
                    ? (field.options.find(o => o.value === filters[field.id])?.label || filters[field.id])
                    : `Any ${field.label}`}
                </span>
                <motion.div animate={{ rotate: openDropdown === field.id ? 180 : 0 }}>
                  <ChevronDown className="text-white/50 shrink-0" size={14} />
                </motion.div>
              </div>

              {/* Custom Animated Dropdown Menu */}
              <AnimatePresence>
                {openDropdown === field.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-3 w-48 max-h-60 overflow-y-auto bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-50 py-2 custom-scrollbar"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div 
                      className={`px-4 py-2 text-[13px] cursor-pointer transition-colors ${!filters[field.id] ? 'bg-brand-600/20 text-brand-600 font-semibold' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                      onClick={() => {
                        updateFilter(field.id, '');
                        setOpenDropdown(null);
                        setFocusedField(null);
                      }}
                    >
                      Any {field.label}
                    </div>
                    {field.options.map((opt) => (
                      <div
                        key={opt.value}
                        className={`px-4 py-2 text-[13px] cursor-pointer transition-colors ${
                          filters[field.id] === opt.value 
                            ? 'bg-brand-600/20 text-brand-600 font-semibold' 
                            : 'text-white hover:bg-white/10'
                        }`}
                        onClick={() => {
                          updateFilter(field.id, opt.value);
                          setOpenDropdown(null);
                          setFocusedField(null);
                        }}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}

        {/* Search Button */}
        <div className="pl-4 pr-2 py-2 w-full md:w-auto mt-2 md:mt-0 flex justify-center">
          <button
            onClick={handleSearch}
            className="flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3 font-semibold text-black transition-colors hover:bg-gray-100 whitespace-nowrap shadow-lg w-full md:w-auto"
          >
            <Search size={18} /> Search
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default SearchWidget;
