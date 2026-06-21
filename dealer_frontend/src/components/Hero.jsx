import { ArrowDown, Search } from 'lucide-react';

const Hero = () => {
  return (
    <div className="relative h-screen w-full">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1503376763036-066120622c74?q=80&w=2070&auto=format&fit=crop')",
        }}
      >
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-center px-6 md:px-20">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-gray-200">
          Where excellence meets the road
        </p>
        <h1 className="max-w-3xl text-5xl font-bold leading-tight text-white md:text-7xl">
          Premium <br />
          Quality Cars <br />
          for Sale
        </h1>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-6 flex items-center gap-2 text-white md:left-20 animate-bounce">
          <span className="text-sm">Scroll Down</span>
          <ArrowDown className="h-4 w-4" />
        </div>
      </div>

      {/* Floating Search Bar (Visual Only) */}
      <div className="absolute -bottom-12 left-0 right-0 z-20 mx-auto w-[90%] max-w-6xl rounded bg-white px-6 py-6 shadow-xl md:px-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          <input 
            type="text" 
            placeholder="Search by ID, make, or model..." 
            className="w-full border-b border-gray-300 py-2 focus:border-blue-600 focus:outline-none"
          />
          <div className="flex gap-4">
            <select className="border-b border-gray-300 py-2 text-gray-500 focus:outline-none bg-transparent">
              <option>All Status</option>
              <option>New</option>
              <option>Used</option>
            </select>
            <select className="border-b border-gray-300 py-2 text-gray-500 focus:outline-none bg-transparent">
              <option>All Makes</option>
              <option>Toyota</option>
              <option>BMW</option>
            </select>
          </div>
          <button className="flex h-12 w-12 items-center justify-center rounded bg-blue-600 text-white transition hover:bg-blue-700">
             <Search className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero;