import { ArrowUpDown } from 'lucide-react';

/**
 * Reusable sort-by dropdown for admin list pages.
 *
 * Props:
 *   options      – Array of { label: string, value: string }
 *   currentValue – string (matches one of the option values)
 *   onChange      – (value: string) => void
 *   className    – optional extra classes on the wrapper
 */
const SortDropdown = ({ options = [], currentValue, onChange, className = '' }) => {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <ArrowUpDown size={16} className="pointer-events-none absolute left-3 text-gray-400" />
      <select
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-10
          text-sm font-medium text-slate-700 cursor-pointer
          hover:bg-gray-100 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100
          transition-all"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {/* Custom chevron */}
      <svg
        className="pointer-events-none absolute right-3 h-4 w-4 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
};

export default SortDropdown;
