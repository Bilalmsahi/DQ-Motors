import { useEffect, useState } from 'react';
import { Star, MessageSquarePlus } from 'lucide-react';
import api from '../../services/api';
import LeaveReviewModal from './LeaveReviewModal';

/* ═══════════════════════════════════════════════════════════
   Small SVG icons for Google & Facebook source badges
   ═══════════════════════════════════════════════════════════ */
const GoogleIcon = () => (
  <svg className="w-5 h-5 inline-block shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.24 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-5 h-5 inline-block shrink-0" viewBox="0 0 24 24">
    <path
      d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      fill="#1877F2"
    />
  </svg>
);

/* ═══════════════════════════════════════════════════════════
   Star row component — solid orange lucide-react stars
   ═══════════════════════════════════════════════════════════ */
const StarRating = ({ rating }) => (
  <div className="flex gap-1 mb-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`w-3.5 h-3.5 ${
          i <= rating
            ? 'fill-brand-600 text-brand-600'
            : 'fill-gray-200 text-gray-200'
        }`}
      />
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════
   ReviewCard Component — Crisp, completely opaque tile
   ═══════════════════════════════════════════════════════════ */
const ReviewCard = ({ t }) => (
  <div className="bg-white border border-gray-100/80 rounded-3xl p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-[280px] md:w-[320px] flex-shrink-0 transition-transform duration-300 hover:scale-[1.03] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] pointer-events-auto h-max cursor-default z-10">
    <StarRating rating={t.rating} />

    <p className="text-sm font-normal text-gray-500 leading-relaxed mb-6 italic">
      "{t.review_text}"
    </p>

    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 font-semibold text-sm shrink-0">
        {t.customer_name?.charAt(0)?.toUpperCase() || '?'}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 truncate text-xs uppercase tracking-wider">
          {t.customer_name}
        </p>
        {t.source && t.source !== 'WEBSITE' && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400 mt-1 font-medium">
            {t.source === 'GOOGLE' && <GoogleIcon />}
            {t.source === 'FACEBOOK' && <FacebookIcon />}
            <span>
              {t.source === 'GOOGLE' ? 'Google' : 'Facebook'}
            </span>
          </span>
        )}
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   TestimonialsSection — Interactive Unobstructed Split-Pane
   ═══════════════════════════════════════════════════════════ */
export default function TestimonialsSection() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/config/testimonials/');
        const data = Array.isArray(res) ? res : res.results || [];
        setReviews(data);
      } catch {
        /* silent – section simply won't render */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || reviews.length === 0) return null;

  // Clone out reviews if array feels dangerously thin 
  let pool = reviews;
  if (pool.length < 6) {
    pool = [...pool, ...pool, ...pool, ...pool];
  } else if (pool.length < 12) {
    pool = [...pool, ...pool];
  }

  // Segment mathematically into staggered columns exactly mirroring our 2-lane grid
  const col1 = pool.filter((_, i) => i % 2 === 0);
  const col2 = pool.filter((_, i) => i % 2 === 1);

  // Triple each array within its own map sequence so it seamlessly continuously loops.
  const loopCol1 = [...col1, ...col1, ...col1];
  const loopCol2 = [...col2, ...col2, ...col2];

  return (
    <section className="bg-gray-50 py-20 px-6 lg:px-12 w-full overflow-hidden border-y border-gray-100">
      
      {/* Structural Asymmetric Grid Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
        
        {/*
          ──────── LEFT PANE ──────── 
          Sticky Anchor for Typography and CTA 
        */}
        <div className="lg:col-span-5 lg:sticky lg:top-32 pt-10">
          <span className="inline-block px-4 py-1.5 bg-white text-brand-600 text-xs font-semibold tracking-wider uppercase rounded-full mb-6 shadow-sm border border-gray-100">
            Client Experiences
          </span>
          <h2 className="text-4xl md:text-5xl font-semibold text-gray-900 leading-tight mb-6 tracking-tight">
            What Our Customers Say
          </h2>
          <p className="text-gray-500 text-base mb-8 font-medium leading-relaxed max-w-sm">
            Genuine feedback from drivers who found exactly what they were looking for through our specialized dealership network.
          </p>
          
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-3.5 rounded-full text-sm font-medium hover:bg-brand-600 transition-colors shadow-xl hover:shadow-brand-600/20 font-metro"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Leave a Review
          </button>
        </div>

        {/* 
          ──────── RIGHT PANE ──────── 
          Depth of Field Scrolling Foreground 
        */}
        <div 
          className="lg:col-span-7 relative h-[600px] md:h-[700px] w-full"
          style={{
            /* Smoothly fades cards in/out on the top/bottom edges of the container completely unobstructed */
            maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)'
          }}
        >
          <div className="flex justify-center md:justify-end gap-6 md:gap-8 w-full h-full pointer-events-auto mt-20 md:pr-4">
              
              {/* Column 1 - Travels Up Continuous */}
              <div className="group relative flex-col gap-6 md:gap-8 w-max h-max">
                  <div className="flex flex-col gap-6 md:gap-8 animate-float-up hover-pause transform-gpu will-change-transform" style={{ '--duration': '35s' }}>
                    {loopCol1.map((t, index) => (
                      <ReviewCard key={`c1-${index}`} t={t} />
                    ))}
                  </div>
              </div>

              {/* Column 2 - Travels Down Slightly Slower */}
              <div className="group hidden sm:flex relative flex-col gap-6 md:gap-8 w-max h-max -mt-[300px]">
                  <div className="flex flex-col gap-6 md:gap-8 animate-float-down hover-pause transform-gpu will-change-transform" style={{ '--duration': '45s' }}>
                    {loopCol2.map((t, index) => (
                      <ReviewCard key={`c2-${index}`} t={t} />
                    ))}
                  </div>
              </div>

          </div>
        </div>
      </div>

      <LeaveReviewModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Internal CSS mapping infinite translate bindings to the custom elements */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) translateZ(0); }
          100% { transform: translateY(max(-33.333%, -2000px)) translateZ(0); }
        }
        @keyframes floatDown {
          0% { transform: translateY(max(-33.333%, -2000px)) translateZ(0); }
          100% { transform: translateY(0) translateZ(0); }
        }
        .animate-float-up {
          animation: floatUp var(--duration) linear infinite;
        }
        .animate-float-down {
          animation: floatDown var(--duration) linear infinite;
        }
        
        /* Forcefully pause individual column scrolling smoothly on hover */
        .hover-pause:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
