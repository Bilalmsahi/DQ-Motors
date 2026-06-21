import { Link } from 'react-router-dom';
import { Car, User, Menu } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Car className="h-8 w-8 text-blue-600" />
            <span>Carz</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="font-medium text-gray-700 hover:text-blue-600 transition">
              Home
            </Link>
            <Link to="/inventory" className="font-medium text-gray-700 hover:text-blue-600 transition">
              Inventory
            </Link>
            <Link to="/about" className="font-medium text-gray-700 hover:text-blue-600 transition">
              About Us
            </Link>
            <Link to="/contact" className="font-medium text-gray-700 hover:text-blue-600 transition">
              Contact
            </Link>
          </div>

          {/* Login Button */}
          <div className="hidden md:flex items-center gap-4">
            <Link 
              to="/login" 
              className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <User className="h-4 w-4" /> Login
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            <Menu className="h-6 w-6 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-white border-t p-4 flex flex-col space-y-4">
          <Link to="/" className="text-gray-700">Home</Link>
          <Link to="/inventory" className="text-gray-700">Inventory</Link>
          <Link to="/login" className="text-blue-600 font-semibold">Login</Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;