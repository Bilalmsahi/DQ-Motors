import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, getProfile, register as apiRegister } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const profile = await getProfile();
          setUser(profile);
        } catch {
          // Token invalid/expired - clear it
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (username, password) => {
    await apiLogin(username, password);
    // Fetch user profile after login
    const profile = await getProfile();
    setUser(profile);
    return profile; // Return the user profile for redirect logic
  };

  const register = async (userData) => {
    const data = await apiRegister(userData);
    // User is auto-logged in after registration
    if (data.user) {
      setUser({
        ...data.user,
        full_name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || data.user.username
      });
    }
    return data;
  };

  const logout = () => {
    apiLogout();
    setUser(null);
  };

  /**
   * Login with pre-existing tokens (e.g., from Google OAuth)
   * Tokens are already stored in localStorage by the API call
   * @param {string} accessToken - JWT access token
   * @param {string} refreshToken - JWT refresh token  
   * @param {Object} userData - Optional user data from backend (skips profile fetch)
   */
  // eslint-disable-next-line no-unused-vars
  const loginWithTokens = async (accessToken, refreshToken, userData = null) => {
    // If user data provided (e.g., from Google login), use it directly
    if (userData) {
      setUser(userData);
      return userData;
    }
    
    // Otherwise fetch the user profile
    const profile = await getProfile();
    setUser(profile);
    return profile;
  };

  const isAdmin = user?.role === 'ADMIN';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      loginWithTokens,
      register,
      logout,
      isAdmin,
      isAuthenticated,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
