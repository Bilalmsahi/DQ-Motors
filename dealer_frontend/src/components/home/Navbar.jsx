import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Heart, ChevronDown, ChevronUp, Car, User, LogOut, Menu, X, ArrowRightLeft, DollarSign, Crosshair, Wrench } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import FeatureGuard from '../common/FeatureGuard';
import { motion, AnimatePresence } from 'framer-motion';

const LOGO_DARK_BG = '/logo/Logo%20DQ%20Motors%20white.png';
const LOGO_LIGHT_BG = '/logo/Logo%20DQ%20Motors.png';

const Navbar = ({ transparent: forceTransparent }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const drawerRef = useRef(null);
  const servicesRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handler = (e) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target)) {
        setIsServicesOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const isHomePage = location.pathname === '/';
  const transparent = forceTransparent !== undefined ? forceTransparent : isHomePage;

  const navBg = transparent
    ? 'relative bg-transparent'
    : 'sticky bg-white shadow-sm border-b border-gray-100';

  const logoSrc = transparent ? LOGO_DARK_BG : LOGO_LIGHT_BG;

  const linkColor = transparent ? 'text-white/90' : 'text-gray-700';
  const linkHover = 'hover:text-brand-600';
  const activeColor = 'text-brand-600';

  const iconColor = transparent
    ? 'text-white/80 hover:text-white'
    : 'text-gray-600 hover:text-brand-600';

  const addListingStyle = transparent
    ? 'border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20'
    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100';

  const burgerColor = transparent ? 'text-white' : 'text-gray-700';

  const mobileNav = (path) => {
    setIsMobileMenuOpen(false);
    navigate(path);
  };

  const isActive = (path, startsWith = false) =>
    startsWith ? location.pathname.startsWith(path) : location.pathname === path;

  const mobileLinkClass = (path, startsWith = false) => {
    const active = isActive(path, startsWith);
    return `block w-full text-left py-4 px-6 text-[15px] font-medium transition-all duration-300 ${
      active
        ? 'text-brand-600 bg-gradient-to-r from-brand-600/10 to-transparent border-l-2 border-brand-600'
        : 'text-gray-200 border-b border-white/5 hover:bg-white/5 hover:text-brand-600 hover:pl-8'
    }`;
  };

  const itemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.3 } }
  };

  return (
    <>
      <nav className={`top-0 left-0 right-0 z-50 w-full ${navBg}`}>
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          <Link to="/" className="flex items-center">
            <img
              src={logoSrc}
              alt="DQ Motors"
              className="h-10 md:h-12 w-auto object-contain"
            />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link to="/" className={`flex items-center gap-1 font-medium transition ${isActive('/') ? activeColor : linkColor} ${linkHover}`}>
              Home
            </Link>
            <Link to="/inventory" className={`flex items-center gap-1 font-medium transition ${isActive('/inventory') ? activeColor : linkColor} ${linkHover}`}>
              Buy Car
            </Link>

            <div className="relative" ref={servicesRef}>
              <button
                onClick={() => setIsServicesOpen((v) => !v)}
                className={`flex items-center gap-1 font-medium transition ${
                  isActive('/trade-in') || isActive('/financing') || isActive('/find-my-car') ? activeColor : linkColor
                } ${linkHover}`}
              >
                Services
                <ChevronDown size={15} className={`transition-transform duration-200 ${isServicesOpen ? 'rotate-180' : ''}`} />
              </button>
              <div
                className={`absolute left-1/2 -translate-x-1/2 top-full mt-3 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 transition-all duration-200 origin-top ${
                  isServicesOpen
                    ? 'opacity-100 visible scale-100'
                    : 'opacity-0 invisible scale-95'
                }`}
              >
                <Link
                  to="/find-my-car"
                  onClick={() => setIsServicesOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition ${
                    isActive('/find-my-car') ? 'text-brand-600 bg-brand-50' : 'text-gray-700 hover:bg-gray-50 hover:text-brand-600'
                  }`}
                >
                  <Crosshair size={16} className="text-gray-400" /> Find My Car
                </Link>
                <Link
                  to="/trade-in"
                  onClick={() => setIsServicesOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition ${
                    isActive('/trade-in') ? 'text-brand-600 bg-brand-50' : 'text-gray-700 hover:bg-gray-50 hover:text-brand-600'
                  }`}
                >
                  <ArrowRightLeft size={16} className="text-gray-400" /> Value My Trade
                </Link>
                <Link
                  to="/financing"
                  onClick={() => setIsServicesOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition ${
                    isActive('/financing') ? 'text-brand-600 bg-brand-50' : 'text-gray-700 hover:bg-gray-50 hover:text-brand-600'
                  }`}
                >
                  <DollarSign size={16} className="text-gray-400" /> Financing
                </Link>
              </div>
            </div>

            <FeatureGuard feature="enable_user_ads">
              <Link
                to="/sell-your-car"
                className={`flex items-center gap-1 font-medium transition ${isActive('/sell', true) || isActive('/account', true) ? activeColor : linkColor} ${linkHover}`}
              >
                Sell Your Car
              </Link>
            </FeatureGuard>
            <Link to="/blog" className={`font-medium transition ${isActive('/blog', true) ? activeColor : linkColor} ${linkHover}`}>
              Blog
            </Link>
            <Link to="/contact" className={`font-medium transition ${linkColor} ${linkHover}`}>
              Contact
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-4 md:flex">
              <Link to="/account/wishlist" className={`transition ${iconColor}`}><Heart size={20} /></Link>

              {isAuthenticated ? (
                <>
                  <FeatureGuard feature="enable_user_ads">
                    <Link to="/account" className={`flex items-center gap-2 transition ${iconColor}`} title="My Account">
                      <User size={20} />
                    </Link>
                  </FeatureGuard>

                  <div className="relative group">
                    <button className="flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white font-metro">
                      <span className="max-w-[100px] truncate">
                        {user?.first_name || user?.username || 'Account'}
                      </span>
                      <ChevronDown size={14} />
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                      <FeatureGuard feature="enable_user_ads">
                        <Link to="/account" className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50">
                          <User size={16} /> My Account
                        </Link>
                        <Link to="/account/listings" className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50">
                          <Car size={16} /> My Listings
                        </Link>
                      </FeatureGuard>
                      {user?.role === 'ADMIN' && (
                        <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50">
                          <User size={16} /> Admin Panel
                        </Link>
                      )}
                      <div className="border-t border-gray-100 my-1" />
                      <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50">
                        <LogOut size={16} /> Log Out
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 font-metro"
                >
                  Register / Login
                </Link>
              )}
            </div>

            <FeatureGuard feature="enable_user_ads">
              <Link
                to={isAuthenticated ? '/account/listings/new' : '/sell-your-car'}
                className={`hidden items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition md:flex font-metro ${addListingStyle}`}
              >
                <Car size={16} /> Sell Your Car
              </Link>
            </FeatureGuard>

            <button
              className={`md:hidden p-2 rounded-lg transition ${burgerColor}`}
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Overlay + Drawer (Framer Engine) ────────── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Dark Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Dark Mode Glass Drawer */}
            <motion.div
              ref={drawerRef}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed top-0 right-0 z-50 h-full w-[85%] max-w-sm bg-[#0a0a0a]/85 backdrop-blur-2xl border-l border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center">
                  <img
                    src={LOGO_DARK_BG}
                    alt="DQ Motors"
                    className="h-9 w-auto object-contain"
                  />
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 transition"
                  aria-label="Close menu"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Scrollable Content Engine */}
              <div className="flex flex-col h-[calc(100%-65px)] overflow-y-auto">
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
                  }}
                  className="flex flex-col w-full"
                >
                  <motion.button variants={itemVariants} onClick={() => mobileNav('/')} className={mobileLinkClass('/')}>
                    Home
                  </motion.button>
                  <motion.button variants={itemVariants} onClick={() => mobileNav('/inventory')} className={mobileLinkClass('/inventory')}>
                    Buy Car
                  </motion.button>

                  <motion.div variants={itemVariants}>
                    <button
                      onClick={() => setIsServicesOpen((v) => !v)}
                      className={`flex w-full items-center justify-between py-4 px-6 text-[15px] font-medium transition-all duration-300 ${
                        isActive('/trade-in') || isActive('/financing') || isActive('/find-my-car')
                          ? 'text-brand-600 bg-gradient-to-r from-brand-600/10 to-transparent border-l-2 border-brand-600'
                          : 'text-gray-200 border-b border-white/5 hover:bg-white/5 hover:text-brand-600 hover:pl-8'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Wrench size={16} className="text-brand-600/70" /> Services
                      </span>
                      {isServicesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 bg-white/5 ${isServicesOpen ? 'max-h-48' : 'max-h-0'}`}>
                      <div className="flex flex-col border-l border-white/10 ml-6 my-2">
                        <button onClick={() => mobileNav('/find-my-car')} className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-gray-300 hover:text-brand-600 hover:bg-white/5 transition-colors">
                          <Crosshair size={15} className="text-gray-500" /> Find My Car
                        </button>
                        <button onClick={() => mobileNav('/trade-in')} className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-gray-300 hover:text-brand-600 hover:bg-white/5 transition-colors">
                          <ArrowRightLeft size={15} className="text-gray-500" /> Value My Trade
                        </button>
                        <button onClick={() => mobileNav('/financing')} className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-gray-300 hover:text-brand-600 hover:bg-white/5 transition-colors">
                          <DollarSign size={15} className="text-gray-500" /> Financing
                        </button>
                      </div>
                    </div>
                  </motion.div>

                  <FeatureGuard feature="enable_user_ads">
                    <motion.button variants={itemVariants} onClick={() => mobileNav('/sell-your-car')} className={mobileLinkClass('/sell', true)}>
                      Sell Your Car
                    </motion.button>
                  </FeatureGuard>
                  <motion.button variants={itemVariants} onClick={() => mobileNav('/blog')} className={mobileLinkClass('/blog', true)}>
                    Blog
                  </motion.button>
                  <motion.button variants={itemVariants} onClick={() => mobileNav('/contact')} className={mobileLinkClass('/contact')}>
                    Contact
                  </motion.button>

                  <div className="border-t border-white/5 mx-6 mt-4 mb-2" />

                  {/* Auth Actions Block */}
                  <motion.div variants={itemVariants} className="px-6 pb-6 space-y-3">
                    {isAuthenticated ? (
                      <>
                        <div className="pb-2">
                          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest">Signed In As</p>
                          <p className="text-sm font-medium text-white truncate">
                            {user?.first_name || user?.username || 'User'}
                          </p>
                        </div>

                        <button onClick={() => mobileNav('/user-dashboard')} className="mt-4 w-full rounded-xl border border-white/20 bg-transparent px-4 py-3 text-center text-[15px] font-medium text-white hover:bg-white/10 transition-colors font-metro">
                          Dashboard
                        </button>

                        <FeatureGuard feature="enable_user_ads">
                          <button
                            onClick={() => mobileNav('/account/listings/new')}
                            className="mt-3 w-full rounded-xl bg-brand-600 px-4 py-3 text-center text-[15px] font-medium text-white shadow-[0_0_15px_rgba(226,5,5,0.3)] hover:shadow-[0_0_25px_rgba(226,5,5,0.5)] hover:bg-white hover:text-black transition-all font-metro"
                          >
                            Sell Your Car
                          </button>
                        </FeatureGuard>

                        <button
                          onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                          className="mt-4 flex w-full justify-center items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[15px] font-medium text-red-500 hover:bg-red-500/20 transition-colors"
                        >
                          <LogOut size={16} /> Log Out
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => mobileNav('/login')}
                          className="mt-4 w-full rounded-xl border border-white/20 bg-transparent px-4 py-3 text-center text-[15px] font-medium text-white hover:bg-white/10 transition-colors font-metro"
                        >
                          Login / Register
                        </button>

                        <FeatureGuard feature="enable_user_ads">
                           <button
                             onClick={() => mobileNav('/sell-your-car')}
                             className="mt-3 w-full rounded-xl bg-brand-600 px-4 py-3 text-center text-[15px] font-medium text-white shadow-[0_0_15px_rgba(226,5,5,0.3)] hover:shadow-[0_0_25px_rgba(226,5,5,0.5)] hover:bg-white hover:text-black transition-all font-metro"
                           >
                             Sell Your Car
                           </button>
                        </FeatureGuard>
                      </>
                    )}
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
