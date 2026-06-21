import { Check } from 'lucide-react';

const Features = ({ features }) => {
  return (
    <div id="features" className="scroll-mt-24 rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
      <h3 className="mb-6 text-xl font-bold text-gray-900">Features</h3>
      
      {features && features.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {features.map((feature) => (
                <div key={feature.id} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#76C045]/10">
                        <Check size={12} className="text-[#76C045]" />
                    </div>
                    {feature.name}
                </div>
            ))}
        </div>
      ) : (
        <p className="text-gray-400 italic">No specific features listed.</p>
      )}
    </div>
  );
};

export default Features;