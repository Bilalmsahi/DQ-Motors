import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ChevronRight } from 'lucide-react';
import api from '../../services/api';

/**
 * Full-width promotional banner shown below the Navbar on public pages.
 * Fetches the latest active campaign and renders a countdown timer.
 */
const CampaignBanner = ({ onBannerChange }) => {
  const [campaign, setCampaign] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);

  // ── Fetch active campaign ──────────────────────────────
  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const data = await api.get('/marketing/campaigns/active/');
        const list = Array.isArray(data) ? data : data.results ?? [];
        if (list.length > 0) {
          const c = list[0];
          setCampaign(c);
          onBannerChange?.(true);
          // Initialize countdown immediately so there's no blank flash
          const diff = new Date(c.end_date) - Date.now();
          if (diff > 0) {
            setTimeLeft({
              days: Math.floor(diff / 86_400_000),
              hours: Math.floor((diff / 3_600_000) % 24),
              mins: Math.floor((diff / 60_000) % 60),
              secs: Math.floor((diff / 1_000) % 60),
            });
          }
        }
      } catch {
        // silent – banner simply won't show
      }
    };
    fetchCampaign();
  }, []);

  // ── Countdown ticker ───────────────────────────────────
  const calcRemaining = (endDate) => {
    const diff = new Date(endDate) - Date.now();
    if (diff <= 0) return null;
    return {
      days: Math.floor(diff / 86_400_000),
      hours: Math.floor((diff / 3_600_000) % 24),
      mins: Math.floor((diff / 60_000) % 60),
      secs: Math.floor((diff / 1_000) % 60),
    };
  };

  useEffect(() => {
    if (!campaign) return;

    timerRef.current = setInterval(() => {
      const remaining = calcRemaining(campaign.end_date);
      if (!remaining) {
        clearInterval(timerRef.current);
        setCampaign(null);
        onBannerChange?.(false);
      }
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [campaign]);

  // Nothing to show
  if (!campaign || !timeLeft) return null;

  const pad = (n) => String(n).padStart(2, '0');

  const discountLabel =
    campaign.discount_type === 'PERCENT'
      ? `${parseFloat(campaign.discount_value)}% OFF`
      : `$${parseFloat(campaign.discount_value).toLocaleString()} OFF`;

  return (
    <div className="relative w-full overflow-hidden bg-black/30 backdrop-blur-md border-b border-white/8">
      {/* Brand accent line — ties to hero's brand-colored CTA elements */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-600 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6 text-white">
          {/* Left – discount badge + title */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-semibold tracking-wide uppercase">
              {discountLabel}
            </span>
            <span className="font-medium text-sm sm:text-base truncate text-white/90">
              {campaign.title}
            </span>
          </div>

          {/* Center – Countdown */}
          <div className="flex items-center gap-2">
            <Clock size={14} className="shrink-0 text-white/60" />
            <div className="flex items-center gap-1 text-sm font-mono font-medium tracking-wider">
              <TimeUnit value={pad(timeLeft.days)} label="D" />
              <span className="text-white/40 mx-0.5">:</span>
              <TimeUnit value={pad(timeLeft.hours)} label="H" />
              <span className="text-white/40 mx-0.5">:</span>
              <TimeUnit value={pad(timeLeft.mins)} label="M" />
              <span className="text-white/40 mx-0.5">:</span>
              <TimeUnit value={pad(timeLeft.secs)} label="S" />
            </div>
          </div>

          {/* Right – CTA */}
          <Link
            to="/listings"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 px-4 py-1.5 text-xs sm:text-sm font-medium text-white transition-colors backdrop-blur-sm"
          >
            Shop Now <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
};

const TimeUnit = ({ value, label }) => (
  <span className="inline-flex flex-col items-center leading-none">
    <span className="bg-white/15 rounded px-1.5 py-0.5 text-white">{value}</span>
    <span className="mt-0.5 text-[8px] uppercase text-white/50 font-sans">{label}</span>
  </span>
);

export default CampaignBanner;

