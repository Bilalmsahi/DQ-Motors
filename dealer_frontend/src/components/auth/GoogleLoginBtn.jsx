import { GoogleLogin } from '@react-oauth/google';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { googleLogin } from '../../services/api';

/**
 * GoogleLoginBtn - Google Sign-In button component
 * 
 * Uses @react-oauth/google to handle OAuth flow.
 * On success, sends the credential to our backend which returns JWT tokens.
 */
const GoogleLoginBtn = ({ onError }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithTokens } = useAuth();
  const [loading, setLoading] = useState(false);

  // Get redirect path from location state
  const from = location.state?.from?.pathname || null;

  const handleSuccess = async (credentialResponse) => {
    setLoading(true);
    
    try {
      // Send Google ID token to our backend for verification
      const data = await googleLogin(credentialResponse.credential);
      
      // Store tokens and update auth state
      // The backend already returns user data, so we pass it directly
      await loginWithTokens(data.access, data.refresh, data.user);
      
      // Redirect based on role
      const userRole = data.user?.role;
      if (from?.startsWith('/admin') && userRole === 'ADMIN') {
        navigate(from);
      } else if (from) {
        navigate(from);
      } else {
        navigate(userRole === 'ADMIN' ? '/admin' : '/account');
      }
    } catch (error) {
      console.error('Google login failed:', error);
      onError?.(error.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleError = () => {
    onError?.('Google sign-in was cancelled or failed.');
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-3 rounded-xl border border-gray-200 bg-gray-50">
        <div className="h-5 w-5 border-2 border-gray-300 border-t-brand-600 rounded-full animate-spin mr-2" />
        <span className="text-gray-600">Signing in with Google...</span>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap={false}
        theme="outline"
        size="large"
        width="320px"
        text="continue_with"
        shape="rectangular"
        logo_alignment="left"
      />
    </div>
  );
};

export default GoogleLoginBtn;
