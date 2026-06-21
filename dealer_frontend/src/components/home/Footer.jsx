import { useState } from 'react';
import { Facebook, Linkedin, Instagram, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await api.post('/marketing/newsletter/subscribe/', { email });
      setStatus('success');
      setMessage(res.message || 'Thanks for subscribing!');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setMessage(err?.response?.data?.email?.[0] || err?.message || 'Something went wrong.');
    }
  };
  return (
    <footer className="bg-[#1a1f2e] text-white px-[6%]">
      {/* Top Stats Bar */}
      <div className="border-b border-gray-700/50">
        <div className="container mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Stat 1 */}
            <div className="flex items-center gap-4">
              <div className="text-gray-400">
                <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M24 8L28 16H20L24 8Z" />
                  <path d="M16 16H32V20H16V16Z" />
                  <path d="M18 20V36H30V20" />
                  <path d="M14 36H34" />
                  <circle cx="24" cy="12" r="2" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-brand-600">One of the</h4>
                <p className="text-sm text-gray-400">Largest Auto portal</p>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="flex items-center gap-4">
              <div className="text-gray-400">
                <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="10" y="8" width="28" height="32" rx="2" />
                  <path d="M16 16H32" />
                  <path d="M16 22H32" />
                  <path d="M16 28H26" />
                  <text x="18" y="38" fontSize="8" fill="currentColor" stroke="none">SOLD</text>
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-white">Car Sold</h4>
                <p className="text-sm text-gray-400">Every few minutes</p>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="flex items-center gap-4">
              <div className="text-gray-400">
                <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="18" cy="18" r="8" />
                  <circle cx="30" cy="30" r="8" />
                  <path d="M18 14v8M14 18h8" strokeDasharray="2 2" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-white">Offers</h4>
                <p className="text-sm text-gray-400">Stay updated pay less</p>
              </div>
            </div>

            {/* Stat 4 */}
            <div className="flex items-center gap-4">
              <div className="text-gray-400">
                <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 36L24 12L34 36" />
                  <path d="M18 28H30" />
                  <circle cx="34" cy="14" r="6" />
                  <text x="31" y="17" fontSize="8" fill="currentColor" stroke="none">?</text>
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-white">Decode the right car</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Links Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Column 1 - Quick Links */}
          <div>
            <h4 className="mb-6 text-lg font-medium text-white">Quick Links</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link to="/listings" className="hover:text-white transition-colors">Browse Inventory</Link></li>
              <li><Link to="/find-my-car" className="hover:text-brand-600 transition-colors flex items-center gap-1">🔍 Find My Car</Link></li>
              <li><Link to="/user-dashboard" className="hover:text-white transition-colors">Sell Your Car</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
            </ul>
          </div>

          {/* Column 2 - Popular Makes */}
          <div>
            <h4 className="mb-6 text-lg font-medium text-white">Popular Makes</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link to="/listings?make=Toyota" className="hover:text-white transition-colors">Toyota</Link></li>
              <li><Link to="/listings?make=Honda" className="hover:text-white transition-colors">Honda</Link></li>
              <li><Link to="/listings?make=Ford" className="hover:text-white transition-colors">Ford</Link></li>
              <li><Link to="/listings?make=BMW" className="hover:text-white transition-colors">BMW</Link></li>
              <li><Link to="/listings?make=Mercedes-Benz" className="hover:text-white transition-colors">Mercedes-Benz</Link></li>
            </ul>
          </div>

          {/* Column 3 - Legal */}
          <div>
            <h4 className="mb-6 text-lg font-medium text-white">Legal</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms and Conditions</Link></li>
              <li><Link to="/returns" className="hover:text-white transition-colors">Return Policy</Link></li>
            </ul>
          </div>

          {/* Column 4 - Newsletter */}
          <div>
            <h4 className="mb-6 text-lg font-medium text-white">Newsletter</h4>
            <p className="mb-6 text-sm text-gray-400 leading-relaxed">
              Stay on top of the latest car trends, tips, and tricks for selling your car.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (status !== 'idle') setStatus('idle'); }}
                required
                className="w-full rounded-full border border-gray-600 bg-transparent px-5 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-600 transition-colors"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full rounded-full bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {status === 'loading' ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : 'Send'}
              </button>
              {status === 'success' && (
                <p className="flex items-center gap-1.5 text-xs text-green-400">
                  <CheckCircle size={14} /> {message}
                </p>
              )}
              {status === 'error' && (
                <p className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle size={14} /> {message}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-gray-700/50">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img
                src="/logo/Logo%20DQ%20Motors%20white.png"
                alt="DQ Motors"
                className="h-10 w-auto object-contain"
              />
            </Link>

            {/* Copyright */}
            <p className="text-sm text-gray-500">© 2024 DQ Motors. All rights reserved</p>
            {/* Social Icons */}
            <div className="flex gap-3">
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700/50 text-gray-400 hover:bg-brand-600 hover:text-white transition-all">
                <Facebook size={18} />
              </a>
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700/50 text-gray-400 hover:bg-brand-600 hover:text-white transition-all">
                <Linkedin size={18} />
              </a>
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700/50 text-gray-400 hover:bg-brand-600 hover:text-white transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700/50 text-gray-400 hover:bg-brand-600 hover:text-white transition-all">
                <Instagram size={18} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
