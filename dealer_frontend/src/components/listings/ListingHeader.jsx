import { LayoutGrid, List } from 'lucide-react';
import SortDropdown from '../common/SortDropdown';

const sortOptions = [
  { value: '-created_at', label: 'Newest First' },
  { value: 'created_at',  label: 'Oldest First' },
  { value: '-price',      label: 'Price: High → Low' },
  { value: 'price',       label: 'Price: Low → High' },
  { value: '-year',       label: 'Year: Newest' },
  { value: 'year',        label: 'Year: Oldest' },
  { value: 'mileage',     label: 'Mileage: Low → High' },
  { value: '-mileage',    label: 'Mileage: High → Low' },
];

const ListingHeader = ({ total, activeTab, setActiveTab, sortBy, onSortChange }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Listings</h2>
      <p className="mt-1 text-sm text-gray-500">There are currently <span className="font-bold text-brand-600">{total}</span> results</p>

      <div className="mt-6 flex flex-col justify-between gap-4 rounded-lg bg-gray-50 p-2 sm:flex-row sm:items-center">
        
        {/* Tabs */}
        <div className="flex gap-2">
          {['All', 'New Car', 'Used Car'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded px-4 py-2 text-sm font-bold transition-all ${
                activeTab === tab 
                ? 'bg-brand-600 text-white shadow-sm' 
                : 'bg-transparent text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button className="rounded bg-white p-2 text-brand-600 shadow-sm ring-1 ring-gray-200">
               <LayoutGrid size={18} />
            </button>
            <button className="rounded bg-transparent p-2 text-gray-400 hover:text-gray-600">
               <List size={18} />
            </button>
          </div>
          
          <SortDropdown
            options={sortOptions}
            currentValue={sortBy}
            onChange={onSortChange}
          />
        </div>

      </div>
    </div>
  );
};

export default ListingHeader;