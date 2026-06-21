import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const WishlistContext = createContext(null);

/**
 * WishlistProvider - Manages the user's wishlist/favorites state
 * 
 * Features:
 * - Loads wishlist IDs on mount (if logged in)
 * - Provides optimistic UI updates for instant feedback
 * - Syncs state across all components using the heart button
 */
export const WishlistProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [likedIds, setLikedIds] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load wishlist IDs when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlistIds();
    } else {
      // Clear wishlist when logged out
      setLikedIds([]);
    }
  }, [isAuthenticated]);

  /**
   * Fetch just the IDs of liked vehicles (efficient)
   */
  const fetchWishlistIds = async () => {
    try {
      setLoading(true);
      const data = await api.get('/inventory/wishlist/ids/');
      setLikedIds(data.vehicle_ids || []);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
      setLikedIds([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if a vehicle is in the wishlist
   */
  const isLiked = useCallback((vehicleId) => {
    return likedIds.includes(vehicleId);
  }, [likedIds]);

  /**
   * Toggle like/unlike for a vehicle
   * Uses optimistic UI - updates state immediately, then syncs with server
   */
  const toggleWishlist = useCallback(async (vehicleId) => {
    if (!isAuthenticated) {
      // Could trigger a login modal here
      console.warn('User must be logged in to like vehicles');
      return { success: false, requiresAuth: true };
    }

    const wasLiked = likedIds.includes(vehicleId);
    
    // Optimistic update - immediately update UI
    setLikedIds(prev => 
      wasLiked 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );

    try {
      // Sync with server
      const response = await api.post('/inventory/wishlist/toggle/', { 
        vehicle_id: vehicleId 
      });
      
      return { success: true, isLiked: response.is_liked };
    } catch (error) {
      // Revert optimistic update on error
      console.error('Failed to toggle wishlist:', error);
      setLikedIds(prev => 
        wasLiked 
          ? [...prev, vehicleId]  // Re-add if was liked
          : prev.filter(id => id !== vehicleId)  // Remove if wasn't liked
      );
      
      return { success: false, error: error.message };
    }
  }, [isAuthenticated, likedIds]);

  /**
   * Get the count of liked vehicles
   */
  const wishlistCount = likedIds.length;

  return (
    <WishlistContext.Provider value={{
      likedIds,
      loading,
      isLiked,
      toggleWishlist,
      wishlistCount,
      refreshWishlist: fetchWishlistIds,
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export default WishlistContext;
