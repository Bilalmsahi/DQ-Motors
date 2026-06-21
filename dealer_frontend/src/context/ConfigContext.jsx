import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

// Create the context
const ConfigContext = createContext(null);

// Feature flag keys (for type safety and autocomplete)
export const FEATURES = {
  USER_ADS: 'enable_user_ads',
  AI_DESCRIPTION: 'enable_ai_description',
  VIN_DECODER: 'enable_vin_decoder',
  CHAT_SUPPORT: 'enable_chat_support',
  INVOICE_OCR: 'enable_invoice_ocr',
};

/**
 * ConfigProvider - Wraps the app and provides feature flags globally
 * Fetches configuration from backend on mount and shows loader until ready
 */
export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await api.get('/config/');
        setConfig(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load app configuration:', err);
        setError('Failed to load configuration');
        // Set default config as fallback so app doesn't break
        setConfig({
          enable_user_ads: false,
          enable_ai_description: true,
          enable_vin_decoder: true,
          enable_chat_support: false,
          enable_invoice_ocr: true,
          default_purchase_tax_rate: '5.00',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  /**
   * Check if a specific feature is enabled
   * @param {string} featureKey - The feature flag key (e.g., 'enable_user_ads')
   * @returns {boolean}
   */
  const isFeatureEnabled = (featureKey) => {
    if (!config) return false;
    return config[featureKey] === true;
  };

  /**
   * Refresh configuration from server
   * Useful after admin changes settings
   */
  const refreshConfig = async () => {
    try {
      const data = await api.get('/config/');
      setConfig(data);
    } catch (err) {
      console.error('Failed to refresh config:', err);
    }
  };

  // Show full-screen loader while config is being fetched
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="text-center">
          {/* Animated Logo/Spinner */}
          <div className="relative mb-6">
            <div className="h-16 w-16 mx-auto rounded-full border-4 border-gray-200 border-t-brand-600 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800">DQ Motors</h2>
          <p className="text-gray-500 mt-2">Loading configuration...</p>
        </div>
      </div>
    );
  }

  // Show error state if config failed to load (with fallback active)
  if (error) {
    console.warn('Using fallback configuration due to error:', error);
  }

  return (
    <ConfigContext.Provider 
      value={{ 
        config, 
        isFeatureEnabled, 
        refreshConfig,
        loading,
        error 
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

/**
 * Custom hook to access configuration context
 * @returns {{ config: object, isFeatureEnabled: function, refreshConfig: function }}
 */
export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export default ConfigContext;
