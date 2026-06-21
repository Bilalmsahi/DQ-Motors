import { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, 
  Car, 
  Users, 
  DollarSign, 
  Settings,
  LogOut, 
  Search,
  ChevronDown,
  Menu,
  X,
  CalendarCheck,
  History,
  Building2,
  ClipboardList,
  Handshake,
  ArrowLeftRight,
  Wallet,
  PieChart,
  UsersRound,
  BarChart3,
  Shield,
  Loader2,
  Scale,
  Megaphone,
  PenSquare,
  Share2,
  Film,
  MessageSquareQuote,
  Mail,
  FilePlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RoleGuard from '../components/common/RoleGuard';
import NotificationDropdown from '../components/common/NotificationDropdown';
import api from '../services/api';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // ── Global Search state ────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const handleSearch = useCallback((value) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSearchResults(null);
      setSearchOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchOpen(true);
        const data = await api.get(`/config/search/?q=${encodeURIComponent(value.trim())}`);
        setSearchResults(data);
      } catch {
        setSearchResults({ vehicles: [], leads: [], vendors: [], audit_logs: [] });
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  const pickResult = (url) => {
    navigate(url);
    setSearchQuery('');
    setSearchResults(null);
    setSearchOpen(false);
  };

  // close search dropdown on click outside
  useEffect(() => {
    const onClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Protection Logic - Redirect to login if not authenticated
  // Pass current location so user can be redirected back after login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Allow ADMIN, SALES, and TECHNICIAN into the admin panel
  const staffRoles = ['ADMIN', 'SALES', 'TECHNICIAN'];
  if (!user || !staffRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Inventory', path: '/admin/inventory', icon: Car },
    { name: 'CRM Dashboard', path: '/admin/crm-dashboard', icon: ClipboardList, roles: ['ADMIN', 'SALES'] },
    { name: 'Leads', path: '/admin/leads', icon: Users, roles: ['ADMIN', 'SALES'] },
    { name: 'Deals', path: '/admin/deals', icon: Handshake, roles: ['ADMIN', 'SALES'] },
    { name: 'Deal Builder', path: '/admin/deals/new', icon: FilePlus, roles: ['ADMIN', 'SALES'] },
    { name: 'Trade-Ins', path: '/admin/trade-ins', icon: ArrowLeftRight, roles: ['ADMIN', 'SALES'] },
    { name: 'Loans', path: '/admin/loans', icon: Wallet, roles: ['ADMIN'] },
    { name: 'Calendar', path: '/admin/calendar', icon: CalendarCheck },
    { name: 'Financials', path: '/admin/financials', icon: DollarSign, roles: ['ADMIN'] },
    { name: 'Analytics', path: '/admin/analytics', icon: PieChart, roles: ['ADMIN'] },
    { name: 'Performance', path: '/admin/performance', icon: BarChart3, roles: ['ADMIN'] },
    { name: 'Work History', path: '/admin/work-history', icon: History },
    { name: 'Vendors', path: '/admin/vendors', icon: Building2, roles: ['ADMIN'] },
    { name: 'Team', path: '/admin/team', icon: UsersRound, roles: ['ADMIN'] },
    { name: 'Activity Log', path: '/admin/activity-log', icon: Shield, roles: ['ADMIN'] },
    { name: 'Legal Pages', path: '/admin/legal', icon: Scale, roles: ['ADMIN'] },
    { name: 'Campaigns', path: '/admin/marketing', icon: Megaphone, roles: ['ADMIN'] },
    { name: 'Subscribers', path: '/admin/subscribers', icon: Mail, roles: ['ADMIN'] },
    { name: 'Blog', path: '/admin/blog', icon: PenSquare, roles: ['ADMIN'] },
    { name: 'Social Media', path: '/admin/social', icon: Share2, roles: ['ADMIN'] },
    { name: 'Reels Studio', path: '/admin/reels', icon: Film, roles: ['ADMIN'] },
    { name: 'Reviews', path: '/admin/reviews', icon: MessageSquareQuote, roles: ['ADMIN'] },
    // { name: 'Settings', path: '/admin/settings', icon: Settings, roles: ['ADMIN'] },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white 
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 flex flex-col h-screen
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo – pinned top */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6 shrink-0">
          <Link to="/admin/dashboard" className="flex items-center">
            <img
              src="/logo/Logo%20DQ%20Motors%20white.png"
              alt="DQ Motors"
              className="h-10 w-auto object-contain"
            />
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation – scrollable middle */}
        <nav className="flex-1 overflow-y-auto mt-6 px-3 space-y-1 pb-4 sidebar-scroll">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path === '/admin/dashboard' && location.pathname === '/admin');
            
            const link = (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium 
                  transition-all duration-200
                  ${isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                {item.name}
                {isActive && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-white/30" />
                )}
              </Link>
            );

            // If the item has role restrictions, wrap it in RoleGuard
            if (item.roles) {
              return (
                <RoleGuard key={item.name} allowedRoles={item.roles}>
                  {link}
                </RoleGuard>
              );
            }

            return link;
          })}
        </nav>

        {/* Sidebar Footer – pinned bottom */}
        <div className="shrink-0 border-t border-slate-800 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium 
              text-red-400 transition-colors hover:bg-slate-800 hover:text-red-300"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex flex-1 flex-col lg:ml-64">
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-100 bg-white px-4 lg:px-8">
          
          {/* Left: Mobile Menu + Search */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900"
            >
              <Menu size={24} />
            </button>
            
            {/* Search Bar */}
            <div className="hidden sm:flex items-center" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => { if (searchResults) setSearchOpen(true); }}
                  placeholder="Search inventory, leads, vendors..."
                  className="w-72 lg:w-96 rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 
                    text-sm text-slate-800 placeholder-gray-400
                    focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100
                    transition-all"
                />

                {/* Search Dropdown */}
                {searchOpen && (
                  <div className="absolute left-0 top-12 w-full min-w-[360px] rounded-xl border border-gray-100 bg-white shadow-xl z-50 overflow-hidden">
                    {searchLoading ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Searching…</span>
                      </div>
                    ) : searchResults && (
                      (() => {
                        const { vehicles = [], leads = [], vendors = [], audit_logs = [] } = searchResults;
                        const totalCount = vehicles.length + leads.length + vendors.length + audit_logs.length;
                        if (totalCount === 0) {
                          return (
                            <div className="py-8 text-center text-sm text-gray-400">
                              No results found for "{searchQuery}"
                            </div>
                          );
                        }
                        const sections = [
                          { label: 'Vehicles', icon: Car, items: vehicles },
                          { label: 'Leads', icon: Users, items: leads },
                          { label: 'Vendors', icon: Building2, items: vendors },
                          { label: 'Activity Log', icon: Shield, items: audit_logs },
                        ].filter(s => s.items.length > 0);

                        return (
                          <div className="max-h-80 overflow-y-auto">
                            {sections.map((section) => {
                              const SIcon = section.icon;
                              return (
                                <div key={section.label}>
                                  <div className="sticky top-0 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                    <SIcon className="h-3.5 w-3.5" />
                                    {section.label}
                                  </div>
                                  {section.items.map((item) => (
                                    <button
                                      key={`${section.label}-${item.id}`}
                                      onClick={() => pickResult(item.url)}
                                      className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-brand-50/60 transition-colors"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
                                        {item.subtitle && (
                                          <p className="truncate text-xs text-gray-400 mt-0.5">{item.subtitle}</p>
                                        )}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Notifications + Profile */}
          <div className="flex items-center gap-3">
            
            {/* Notifications */}
            <NotificationDropdown />

            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 
                  py-1.5 pl-1.5 pr-3 hover:bg-gray-100 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-700 ring-2 ring-accent-600/20">
                  <span className="text-sm font-bold text-white">
                    {user?.first_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-800">
                    {user?.first_name || user?.username || 'Admin'}
                  </p>
                  <p className="text-xs text-gray-500">{user?.role || 'Staff'}</p>
                </div>
                <ChevronDown size={16} className="text-gray-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileOpen && (
                <div className="absolute right-0 top-14 w-56 rounded-xl border border-gray-100 bg-white shadow-xl">
                  <div className="border-b border-gray-100 px-4 py-3">
                    <p className="text-sm font-medium text-slate-800">
                      {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link 
                      to="/admin/settings" 
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-gray-50"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Settings size={16} />
                      Settings
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-gray-50"
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Click outside to close dropdowns */}
      {profileOpen && (
        <div 
          className="fixed inset-0 z-20" 
          onClick={() => {
            setProfileOpen(false);
            setSearchOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default AdminLayout;
