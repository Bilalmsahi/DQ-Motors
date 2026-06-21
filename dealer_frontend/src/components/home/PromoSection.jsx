import { Apple, PlayCircle, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const PromoSection = () => {
  return (
    <section className="py-16 md:py-20">
      <div className="px-2 sm:px-4">
        <div className="grid gap-8 md:grid-cols-2">
          
          {/* Box 1: App Download (Black) */}
          <div className="relative overflow-hidden rounded-3xl bg-[#0f141a] px-8 md:px-10 py-14 md:py-16 text-white shadow-2xl ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-1">
            <div className="relative z-10 max-w-md">
                <h3 className="text-3xl font-semibold">Download our app</h3>
                <p className="mt-4 text-gray-400">Whether you're buying, selling, or simply researching cars, DQMotors is the app for you.</p>
                <div className="mt-8 flex gap-4">
                    <button className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">
                        <Apple size={24} /> <div className="text-left text-xs"><span className="block">Download on the</span><span className="text-sm font-medium">App Store</span></div>
                    </button>
                    <button className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">
                        <PlayCircle size={24} /> <div className="text-left text-xs"><span className="block">Get it on</span><span className="text-sm font-medium">Google Play</span></div>
                    </button>
                </div>
            </div>
            {/* Abstract Circle decoration */}
            <div className="absolute -right-20 -bottom-40 h-80 w-80 rounded-full border-4 border-white/5"></div>
          </div>

          {/* Box 2: Looking for car (Orange) */}
          <div className="relative overflow-hidden rounded-3xl bg-brand-600 px-8 md:px-10 py-14 md:py-16 text-white shadow-2xl ring-1 ring-brand-400/20 transition-transform duration-300 hover:-translate-y-1">
             <div className="relative z-10 max-w-md">
                <h3 className="text-3xl font-semibold">Are you looking for a car?</h3>
                <p className="mt-4 text-white/80">Save time and effort as you no longer need to visit multiple stores to find the right car.</p>
                <Link to="/inventory"> <button className="mt-8 flex items-center gap-2 rounded-full bg-white px-8 py-3 font-medium text-brand-600 hover:bg-gray-100 font-metro">
                    Find cars <Search size={16} />
                </button></Link>
            </div>
             {/* Abstract Lines decoration */}
             <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 transform skew-x-12"></div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default PromoSection;
