import { ChevronRight } from 'lucide-react';

const Pagination = () => {
  return (
    <div className="mt-12 flex justify-center gap-2">
      <button className="flex h-10 w-10 items-center justify-center rounded bg-brand-600 font-bold text-white shadow-md">
        1
      </button>
      <button className="flex h-10 w-10 items-center justify-center rounded bg-white font-bold text-gray-600 hover:bg-gray-50">
        2
      </button>
      <button className="flex h-10 w-10 items-center justify-center rounded bg-white font-bold text-gray-600 hover:bg-gray-50">
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default Pagination;