import { Phone, MessageCircle, CheckCircle, Calendar } from 'lucide-react';

const SellerCard = ({ onBookTestDrive }) => {
  // Using placeholder data to match screenshot
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4 mb-6">
        <img 
          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop" 
          alt="Agent" 
          className="h-14 w-14 rounded-full object-cover"
        />
        <div>
            <h3 className="font-bold text-gray-900">Arlene McCoy</h3>
            <div className="mt-1 flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 w-fit">
                <CheckCircle size={10} /> Verified Dealer
            </div>
        </div>
      </div>

      <div className="mb-6 text-xs text-gray-500 flex items-start gap-2">
         <div className="mt-0.5 min-w-[10px] h-2.5 bg-gray-300 rounded-full"></div>
         2972 Westheimer Rd. Santa Ana, Illinois 85486
      </div>

      <div className="flex flex-col gap-3">
        {/* Book Test Drive Button - Primary CTA */}
        <button 
          onClick={onBookTestDrive}
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
        >
            <Calendar size={18} /> Book Test Drive
        </button>
        <button className="flex items-center justify-center gap-2 w-full rounded-lg border-2 border-brand-600 py-3 text-sm font-bold text-brand-600 transition hover:bg-brand-50">
            <Phone size={18} /> Call to seller
        </button>
        <button className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#76C045] py-3 text-sm font-bold text-white transition hover:bg-green-600">
            <MessageCircle size={18} /> Chat
        </button>
      </div>
    </div>
  );
};

export default SellerCard;