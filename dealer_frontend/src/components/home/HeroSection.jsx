import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import SearchWidget from './SearchWidget';
import coverImg from '../../assets/hero-cover.webp';
import coverImg2 from '../../assets/hero-cover-2.webp';

const sliderImages = [
  'https://demoapus1.com/boxcar/wp-content/uploads/2023/11/slider91.jpg',
  'https://demoapus1.com/boxcar/wp-content/uploads/2023/10/slider3.jpg',
];

const HeroSection = ({ hasBanner = false }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (sliderImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + sliderImages.length) % sliderImages.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
  };

  return (
    <div className="relative h-screen min-h-[800px] w-full overflow-hidden">
      {/* Background Slider */}
      {sliderImages.map((img, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={img}
            alt={`Slide ${index + 1}`}
            className="h-full w-full object-cover"
          />
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/10"></div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-6 top-1/2 z-30 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white transition hover:bg-white/20"
        aria-label="Previous slide"
      >
        <ChevronLeft size={28} />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-6 top-1/2 z-30 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white transition hover:bg-white/20"
        aria-label="Next slide"
      >
        <ChevronRight size={28} />
      </button>

      {/* Hero Content */}
      <div className={`absolute inset-0 z-20 flex flex-col px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto w-full ${hasBanner ? 'pt-36 md:pt-40' : 'pt-24'}`}>
        {/* Spacer below header */}
        <div className={hasBanner ? 'h-2 md:h-4' : 'h-4 md:h-8'}></div>
        
        {/* Search Widget - Positioned at top */}
        <div className="w-full z-40 mx-auto max-w-6xl">
          <SearchWidget />
        </div>
        
        {/* Main Content - Centered */}
        <div className="flex flex-1 flex-col items-center justify-center text-center mt-4 md:mt-[-60px]">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="flex flex-col items-center"
          >
            <span className="text-sm md:text-base font-medium tracking-wide text-white/80 uppercase mb-4 font-metro">
              We make finding the right car simple
            </span>
            <h1 className="text-2xl md:text-7xl font-semibold tracking-tight text-white mb-6">
              Search Less. Live More.
            </h1>
          </motion.div>

          {/* CTA Group */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <Link
                to="/inventory"
                className="bg-white text-gray-900 rounded-full px-8 py-3.5 font-medium flex items-center gap-2 hover:scale-105 transition-transform shadow-lg font-metro"
              >
                View Inventory <ArrowUpRight size={18} />
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <Link
                to="/contact"
                className="bg-transparent border border-white text-white rounded-full px-8 py-3.5 font-medium flex items-center gap-2 hover:bg-white/10 transition-colors font-metro"
              >
                Contact Us <ArrowUpRight size={18} />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      {sliderImages.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 gap-2">
          {sliderImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'bg-white w-6' : 'bg-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroSection;
