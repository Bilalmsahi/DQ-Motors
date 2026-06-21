import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Car, Zap, ArrowUpRight } from 'lucide-react';
import suvCover from '../../assets/h42.jpg';
import sedanCover from '../../assets/h43.jpg';
import hatchbackCover from '../../assets/gallery1-3.jpg';
import hybridCover from '../../assets/gallery1-4.jpg';
import coupeCover from '../../assets/gallery1-5.jpg';

const categories = [
  {
    title: 'SUV',
    image: suvCover,
    link: '/inventory?body_style=SUV',
    spanClass: 'md:col-span-3',
    icon: <Car className="size-5 transition-colors duration-300 group-hover:text-brand-600" />
  },
  {
    title: 'Sedan',
    image: sedanCover,
    link: '/inventory?body_style=SEDAN',
    spanClass: 'md:col-span-3',
    icon: <Car className="size-5 transition-colors duration-300 group-hover:text-brand-600" />
  },
  {
    title: 'Hatchback',
    image: hatchbackCover,
    link: '/inventory?body_style=HATCHBACK',
    spanClass: 'md:col-span-2',
    icon: <Car className="size-5 transition-colors duration-300 group-hover:text-brand-600" />
  },
  {
    title: 'Hybrid',
    image: hybridCover,
    link: '/inventory?fuel_type=HYBRID',
    spanClass: 'md:col-span-2',
    icon: <Zap className="size-5 transition-colors duration-300 group-hover:text-brand-600" />
  },
  {
    title: 'Coupe',
    image: coupeCover,
    link: '/inventory?body_style=COUPE',
    spanClass: 'md:col-span-2',
    icon: <Car className="size-5 transition-colors duration-300 group-hover:text-brand-600" />
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20
    }
  }
};

const BrowseByType = () => {
  return (
    <section className="py-16 md:py-24 bg-white w-full">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-8">
        
        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-gray-700">
            Browse by Type
          </h2>
          <Link 
            to="/inventory" 
            className="hidden items-center gap-1 text-sm font-semibold text-gray-600 hover:text-brand-600 transition-colors md:flex group"
          >
            View All <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Bento Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-6"
        >
          {categories.map((category) => (
            <motion.div 
              key={category.title}
              variants={cardVariants}
              className={`relative group overflow-hidden rounded-3xl cursor-pointer w-full h-[280px] lg:h-[360px] shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-shadow duration-500 ${category.spanClass}`}
            >
              <Link to={category.link} className="block w-full h-full">
                {/* Background Image */}
                <img 
                  src={category.image} 
                  alt={category.title} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-105"
                  loading="lazy"
                />

                {/* Bottom Dark Gradient Overlay for Contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Floating Category Pill */}
                <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-3 text-sm font-medium text-gray-900 shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-[0_0_30px_rgba(226, 5, 5,0.3)]">
                  {category.icon}
                  <span className="transition-all duration-300 group-hover:tracking-wide group-hover:text-brand-600">
                    {category.title}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile View All Link */}
        <div className="mt-8 flex justify-center md:hidden">
          <Link 
            to="/inventory" 
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-brand-600 hover:text-brand-600"
          >
            View All Categories <ArrowUpRight size={16} />
          </Link>
        </div>

      </div>
    </section>
  );
};

export default BrowseByType;

