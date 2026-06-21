import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import api from '../services/api';

// Components
import Navbar from '../components/home/Navbar';
import CampaignBanner from '../components/home/CampaignBanner';
import HeroSection from '../components/home/HeroSection';
import ServicesSection from '../components/home/ServicesSection';
import WhyChooseUs from '../components/home/WhyChooseUs';
import FeaturedCarsSection from '../components/home/FeaturedCarsSection';
import LoanCalculatorSection from '../components/home/LoanCalculatorSection';
import CarSection from '../components/home/CarSection';
import BrowseByType from '../components/home/BrowseByType';
import PromoSection from '../components/home/PromoSection';
import AgentSection from '../components/home/AgentSection';
import TestimonialsSection from '../components/home/TestimonialsSection';
import Footer from '../components/home/Footer';
import ScrollReveal from '../components/common/ScrollReveal';

const Home = () => {
  const [recentCars, setRecentCars] = useState([]);
  const [recommendedCars, setRecommendedCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasBanner, setHasBanner] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [recent, recommended] = await Promise.all([
          api.get('/inventory/vehicles/recent/'),
          api.get('/inventory/vehicles/recommended/'),
        ]);
        setRecentCars(Array.isArray(recent) ? recent : recent.results || []);
        setRecommendedCars(Array.isArray(recommended) ? recommended : recommended.results || []);
      } catch (error) {
        console.error('Failed to load inventory:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 font-sans text-gray-900">
      {/* Banner + Navbar stacked — banner sits above the transparent navbar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex flex-col">
        <CampaignBanner onBannerChange={setHasBanner} />
        <Navbar />
      </div>

      {/* Hero includes the Search Widget */}
      <HeroSection hasBanner={hasBanner} />

      {/* Main Content Wrapper - constrained width with padding */}
      <main className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
        {/* Most Searched Cars */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-600"></div>
          </div>
        ) : (
          <>
            <CarSection
              title="Recently Added Cars"
              vehicles={recentCars}
            />



            {/* Module 3: Bento Grid Browse By Type */}
            <BrowseByType />

            <CarSection
              title="Recommended Used Cars For You"
              vehicles={recommendedCars}
              bgColor="bg-gray-50/50"
            />
          </>
        )}


        {/* Recommended Cars */}



        {/* Services Section - Browse, Get Offer, Financing, Service */}
        <ScrollReveal direction="up" duration={800}>
          <ServicesSection />
        </ScrollReveal>

        {/* Why Choose Us Section */}
        <ScrollReveal direction="left" duration={900}>
          <WhyChooseUs />
        </ScrollReveal>

        {/* Customer Testimonials */}
        <ScrollReveal direction="up" duration={800}>
          <TestimonialsSection />
        </ScrollReveal>

        {/* Auto Loan Calculator */}
        <ScrollReveal direction="right" duration={900}>
          <LoanCalculatorSection />
        </ScrollReveal>


        {/* Find My Car CTA */}
        <ScrollReveal direction="up" duration={800}>
          <div className="relative my-24 overflow-hidden rounded-[2.5rem] bg-[#050505] px-8 py-16 md:py-20 text-center shadow-2xl border border-white/5">
            {/* Absolute Laser Edge X-Factor */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-600 to-transparent"></div>
            {/* Soft Radial Glow Background */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-600/15 via-transparent to-transparent pointer-events-none" />

            <h2 className="relative z-10 text-3xl md:text-5xl font-semibold tracking-tight text-white mb-4">
              Can't Find Your Dream Car?
            </h2>
            <p className="relative z-10 text-gray-400 text-base md:text-lg mb-10 max-w-2xl mx-auto font-normal">
              Tell us what you're looking for and we'll search our global network to source the exact specifications you desire.
            </p>
            <a
              href="/find-my-car"
              className="relative z-10 inline-flex items-center gap-3 bg-brand-600 text-white px-8 py-4 rounded-full text-[15px] font-semibold hover:bg-white hover:text-black transition-all duration-500 shadow-[0_0_30px_rgba(226, 5, 5,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] group font-metro"
            >
              Find My Car
              <Search size={18} className="group-hover:rotate-90 transition-transform duration-500" />
            </a>
          </div>
        </ScrollReveal>
      </main>

      {/* Footer */}
      <ScrollReveal direction="up" duration={600} distance={30}>
        <Footer />
      </ScrollReveal>
    </div>
  );
};

export default Home;