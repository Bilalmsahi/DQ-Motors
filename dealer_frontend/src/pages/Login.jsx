import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/home/Navbar';
import GoogleLoginBtn from '../components/auth/GoogleLoginBtn';
import { Lock, User, Mail, ArrowRight } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();

  // Get the redirect path from location state (e.g., when redirected from protected route)
  const from = location.state?.from?.pathname || null;

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      // If user was trying to access admin, redirect there
      if (from?.startsWith('/admin') && user.role === 'ADMIN') {
        navigate(from);
      } else if (from) {
        // Redirect to where they came from
        navigate(from);
      } else {
        // Default redirect based on role
        navigate(user.role === 'ADMIN' ? '/admin' : '/account');
      }
    }
  }, [isAuthenticated, user, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedInUser = await login(username, password);
      
      // Redirect based on where they came from or role
      if (from?.startsWith('/admin') && loggedInUser?.role === 'ADMIN') {
        navigate(from);
      } else if (from) {
        navigate(from);
      } else {
        navigate(loggedInUser?.role === 'ADMIN' ? '/admin' : '/account');
      }
    } catch (err) {
      console.error(err);
      setError('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <div className="flex items-center justify-center px-4 pt-28 pb-16">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-500 mt-2">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 transition-all"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition-all hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider - Or continue with */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <GoogleLoginBtn onError={(msg) => setError(msg)} />

          {/* Divider - New to DQMotors */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-500">New to DQMotors?</span>
            </div>
          </div>

          {/* Register Link */}
          <Link
            to="/register"
            className="w-full rounded-xl border-2 border-gray-200 py-3 font-semibold text-gray-700 transition-all hover:border-brand-600 hover:text-brand-600 flex items-center justify-center gap-2"
          >
            <Mail className="h-5 w-5" />
            Create an Account
          </Link>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Login;