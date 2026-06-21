import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const services = [
  {
    icon: (
      <svg className="w-8 h-8 text-brand-600" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="8" y="20" width="48" height="24" rx="4" />
        <circle cx="20" cy="44" r="6" />
        <circle cx="44" cy="44" r="6" />
        <path d="M8 28h8M48 28h8" />
        <circle cx="32" cy="12" r="8" strokeDasharray="4 2" />
        <path d="M28 12h8M32 8v8" />
      </svg>
    ),
    title: 'Browse Inventory',
    description: 'Find the ideal car for you and browse our expansive, affordable inventory.',
    link: '/inventory',
    linkText: 'Search inventory',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-brand-600" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="12" y="24" width="40" height="20" rx="3" />
        <circle cx="24" cy="44" r="5" />
        <circle cx="40" cy="44" r="5" />
        <path d="M12 32h40" />
        <circle cx="32" cy="14" r="8" />
        <text x="28" y="18" fontSize="10" fill="currentColor" stroke="none" fontWeight="bold">$</text>
      </svg>
    ),
    title: 'Get An Offer',
    description: "What's your car worth? Get the best, transparent value for your vehicle today.",
    link: '/trade-in',
    linkText: 'Get trade-in value',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-brand-600" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 16c-8 0-12 4-12 12v16c0 4 2 6 6 6h4" />
        <path d="M44 16c8 0 12 4 12 12v16c0 4-2 6-6 6h-4" />
        <rect x="16" y="36" width="32" height="16" rx="3" />
        <circle cx="32" cy="24" r="10" />
        <path d="M28 24h8M32 20v8" />
      </svg>
    ),
    title: 'Apply For Financing',
    description: 'Fill out our secure credit approval form for your next vehicle loan easily.',
    link: '/financing',
    linkText: 'Apply now',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-brand-600" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 44l-8 8M44 44l8 8" />
        <path d="M16 48l-4 4M48 48l4 4" />
        <rect x="16" y="20" width="32" height="24" rx="4" />
        <circle cx="32" cy="32" r="6" />
        <path d="M32 26v-6M26 32h-6" />
      </svg>
    ),
    title: 'Expert Service',
    description: 'Expert technicians will keep your vehicle in top running condition year-round.',
    link: '/contact',
    linkState: { subject: 'Service' },
    linkText: 'Schedule service',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 }
  }
};

const ServicesSection = () => {
  return (
    <section className="py-16 md:py-24 bg-transparent max-w-[1600px] mx-auto overflow-visible relative">
      <div className="px-4 sm:px-6 lg:px-8">
        
        {/* Harmonized Section Header (Reduced Weights) */}
        <div className="mb-14 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 leading-tight">
            Find your dream car easily and quickly
          </h2>
          <p className="mt-4 text-gray-500 font-normal">
            Browse thousands of new and used cars from all reputable brands across the market.
          </p>
        </div>

        {/* Services Floating Bento Grid */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {services.map((service, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              className="group relative overflow-hidden rounded-3xl bg-white p-8 border border-gray-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(226, 5, 5,0.06)] hover:-translate-y-1 transition-all duration-500 flex flex-col h-full"
            >
              {/* Elegant Corner Glow (X-Factor) */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-600 opacity-0 blur-2xl rounded-full group-hover:opacity-10 transition-opacity duration-700 pointer-events-none z-0" />

              {/* Icon Casing */}
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-brand-50/50 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-brand-600/10 transition-all duration-500 ease-out">
                {service.icon}
              </div>

              {/* Text Module */}
              <div className="relative z-10 flex-1 flex flex-col">
                 <h3 className="text-lg xl:text-xl font-semibold text-gray-900 mb-3 tracking-normal">
                   {service.title}
                 </h3>
                 <p className="text-sm font-normal text-gray-500 leading-relaxed mb-8">
                   {service.description}
                 </p>
                 
                 {/* Borderless Animated CTA */}
                 <Link
                   to={service.link}
                   state={service.linkState}
                   className="mt-auto inline-flex items-center text-sm font-medium text-brand-600 w-max"
                 >
                   {service.linkText}
                   <ArrowRight 
                     size={16} 
                     className="ml-2 transition-transform duration-300 ease-out group-hover:translate-x-1.5" 
                   />
                 </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesSection;

