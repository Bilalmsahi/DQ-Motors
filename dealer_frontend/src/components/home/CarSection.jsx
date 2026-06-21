import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CarCard from './CarCard';

const CarSection = ({ title, vehicles, bgColor = "bg-white" }) => {
  const [hoveredCardIndex, setHoveredCardIndex] = useState(null);

  // For a continuous marquee effect, duplicate the list. 
  // We need enough items to fill the screen twice so that it loops cleanly.
  // Because 'vehicles' is dynamic, we just double it. 
  const displayVehicles = vehicles.length > 0 ? [...vehicles, ...vehicles, ...vehicles] : [];

  return (
    <section className={`py-12 md:py-20 ${bgColor} overflow-hidden w-full relative`}>
      <div className="px-4 sm:px-8 mb-8 max-w-[1600px] mx-auto flex items-end justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">{title}</h2>
        </div>
      </div>

      {vehicles.length > 0 ? (
        // Slider Track Wrapper
        <div className="relative w-full flex overflow-hidden py-6 px-4">
          {/* Subtle light mode fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />

          {/* The scrolling track */}
          <motion.div 
             className="flex gap-5 w-max transform-gpu will-change-transform"
             animate={{ x: ["0%", "-33.333333%"] }} // Scroll one third of the tripled array
             transition={{ 
               repeat: Infinity, 
               ease: "linear", 
               duration: vehicles.length * 5 
             }}
             // Pause the sliding animation smoothly when hovered
             style={{ 
               animationPlayState: hoveredCardIndex !== null ? 'paused' : 'running' 
             }}
          >
            {displayVehicles.map((car, index) => {
               // Calculate original index to ensure uniform dimming
               const originalIndex = index % vehicles.length;
               const isDimmed = hoveredCardIndex !== null && hoveredCardIndex !== originalIndex;
               
               return (
                  <CarCard 
                    key={`${car.id}-${index}`} 
                    vehicle={car}
                    isDimmed={isDimmed}
                    onHover={() => setHoveredCardIndex(originalIndex)}
                    onHoverLeave={() => setHoveredCardIndex(null)}
                  />
               );
            })}
          </motion.div>
        </div>
      ) : (
        <div className="py-20 text-center text-gray-400 font-medium tracking-wide">Loading vehicles...</div>
      )}
      
      {/* Global Style Override for animation-play-state fallback if Framer Motion converts it to GSAP style JS driven animation */}
      <style>{`
        .flex.gap-5.w-max {
          /* Fallback for native CSS marquee if Framer Motion uses CSS */
          animation-play-state: ${hoveredCardIndex !== null ? 'paused !important' : 'running'};
        }
      `}</style>
    </section>
  );
};

export default CarSection;
