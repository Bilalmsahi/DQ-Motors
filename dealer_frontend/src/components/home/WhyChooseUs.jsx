import { CheckCircle } from 'lucide-react';
import whyChooseUs1 from '../../assets/why-choose-us-1.webp';
import whyChooseUs2 from '../../assets/why-choose-us-2.webp';

const features = [
  {
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#E20505" strokeWidth="2">
        <rect x="12" y="16" width="24" height="32" rx="2" />
        <path d="M18 24h12M18 32h12M18 40h8" />
        <circle cx="44" cy="28" r="12" />
        <path d="M40 28h8M44 24v8" />
      </svg>
    ),
    title: 'Proven Expertise',
    description:
      'Our experienced team excels in car sales with many years of successfully navigating the market, delivering informed decisions and optimal results.',
  },
  {
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#E20505" strokeWidth="2">
        <circle cx="32" cy="32" r="20" />
        <path d="M32 16v8M32 40v8M16 32h8M40 32h8" />
        <circle cx="32" cy="32" r="8" />
        <path d="M28 28l8 8M36 28l-8 8" />
      </svg>
    ),
    title: 'Customized Solutions',
    description:
      'We pride ourselves on creating personalized strategies to suit your unique goals, ensuring a seamless car selling journey.',
  },
  {
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#E20505" strokeWidth="2">
        <circle cx="24" cy="24" r="12" />
        <circle cx="40" cy="40" r="12" />
        <path d="M24 16v4M20 20h8" />
        <path d="M36 44h8" />
      </svg>
    ),
    title: 'Transparent Partnerships',
    description:
      'Transparency is key in our client relationships. We prioritize clear communication and ethical practices, fostering trust and reliability throughout.',
  },
];

const WhyChooseUs = () => {
  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-gray-50 to-gray-100/50 overflow-hidden rounded-3xl my-6 shadow-sm">
      <div className="px-2 sm:px-4">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div className="flex-1">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
              Why Choose Auto Deal
            </h2>
            <p className="text-gray-500 mb-10 max-w-md">
              Our experienced team excels in car sales with many years of successfully navigating
              the market, delivering informed decisions and optimal results.
            </p>

            {/* Feature List */}
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex gap-5 items-start p-5 rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-300 ring-1 ring-gray-100"
                >
                  <div className="flex-shrink-0 text-brand-600">{feature.icon}</div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Image Collage */}
          <div className="flex-1 relative min-h-[500px] w-full">
            {/* Top Image */}
            <div className="absolute top-0 right-0 w-[70%] h-[280px] rounded-2xl overflow-hidden shadow-xl">
              <img
                src={whyChooseUs2}
                alt="Luxury SUV"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Badge - Proven Expertise */}
            <div className="absolute top-4 right-4 z-10 bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
              <CheckCircle className="text-brand-600" size={20} />
              <span className="text-sm font-semibold text-gray-900">Proven Expertise</span>
            </div>

            {/* Bottom Image */}
            <div className="absolute bottom-0 left-0 w-[70%] h-[280px] rounded-2xl overflow-hidden shadow-xl">
              <img
                src={whyChooseUs1}
                alt="Modern Electric Car"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Badge - 1 million visits */}
            <div className="absolute top-[45%] left-[30%] z-10 bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
              <CheckCircle className="text-brand-600" size={20} />
              <span className="text-sm font-semibold text-gray-900">1 million visits per day</span>
            </div>

            {/* Badge - Car Sellers */}
            <div className="absolute bottom-[10%] left-[40%] z-10 bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
              <CheckCircle className="text-brand-600" size={20} />
              <span className="text-sm font-semibold text-gray-900">7,800 car sellers</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;

