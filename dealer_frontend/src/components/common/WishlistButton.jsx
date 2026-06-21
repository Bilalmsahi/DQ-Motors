import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * WishlistButton - Heart icon that toggles vehicle like/unlike
 * 
 * Props:
 * - vehicleId: ID of the vehicle
 * - size: 'sm' | 'md' | 'lg' (icon size)
 * - className: Additional CSS classes
 * - showBackground: Show white circular background (good for overlays)
 */
const WishlistButton = ({ 
  vehicleId, 
  size = 'md', 
  className = '',
  showBackground = true 
}) => {
  const { isLiked, toggleWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(false);

  const liked = isLiked(vehicleId);

  // Size configurations
  const sizes = {
    sm: { icon: 16, padding: 'p-1.5' },
    md: { icon: 20, padding: 'p-2' },
    lg: { icon: 24, padding: 'p-2.5' },
  };

  const { icon: iconSize, padding } = sizes[size];

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    // Trigger animation
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    await toggleWishlist(vehicleId);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        ${showBackground ? `${padding} bg-white rounded-full shadow-md hover:shadow-lg` : ''}
        transition-all duration-200 ease-in-out
        hover:scale-110 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2
        ${isAnimating ? 'scale-125' : ''}
        ${className}
      `}
      aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
      title={liked ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart
        size={iconSize}
        className={`
          transition-all duration-200 ease-in-out
          ${liked 
            ? 'fill-brand-600 text-brand-600' 
            : 'fill-transparent text-gray-500 hover:text-brand-600'
          }
          ${isAnimating ? 'animate-pulse' : ''}
        `}
      />
    </button>
  );
};

export default WishlistButton;
