import { useState } from 'react';
import { Outlet, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/home/Navbar';
import Footer from '../components/home/Footer';
import {
  LayoutDashboard,
  Car,
  PlusCircle,
  User,
  Heart,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

const UserLayout = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect if not authenticated (with state to return after login)
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { 
      icon: LayoutDashboard, 
      label: 'Dashboard', 
      path: '/account',
      end: true 
    },
    { 
      icon: Car, 
      label: 'My Listings', 
      path: '/account/listings' 
    },
    { 
      icon: PlusCircle, 
      label: 'Add New Car', 
      path: '/account/listings/new' 
    },
    { 
      icon: Heart, 
      label: 'My Wishlist', 
      path: '/account/wishlist' 
    },
    { 
      icon: User, 
      label: 'Profile', 
      path: '/account/profile' 
    },
  ];

  // eslint-disable-next-line no-unused-vars
  const NavItem = ({ icon: Icon, label, path, end }) => (
    <NavLink
      to={path}
      end={end}
      onClick={() => setSidebarOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
          isActive
            ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
            : 'text-gray-600 hover:bg-gray-100'
        }`
      }
    >
      <Icon className="h-5 w-5" />
      <span className="font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Standard Navbar */}
      <Navbar />

      <div className="pt-20 flex">
        {/* Mobile Sidebar Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed bottom-6 right-6 z-50 p-4 bg-brand-600 text-white rounded-full shadow-lg"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Sidebar Overlay (Mobile) */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-20 left-0 z-40 lg:z-0
            w-72 h-[calc(100vh-5rem)] bg-white border-r border-gray-200
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="flex flex-col h-full p-4">
            {/* User Info */}
            <div className="p-4 bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl text-white mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {user?.full_name || user?.username || 'User'}
                  </p>
                  <p className="text-sm text-brand-100 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1">
              {navItems.map((item) => (
                <NavItem key={item.path} {...item} />
              ))}
            </nav>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors mt-4"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Log Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-5rem)] p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserLayout;
