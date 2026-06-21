import { useConfig } from '../../context/ConfigContext';

/**
 * FeatureGuard - Conditionally renders children based on feature flags
 * 
 * Usage:
 * <FeatureGuard feature="enable_user_ads">
 *   <SellMyCarPage />
 * </FeatureGuard>
 * 
 * With fallback:
 * <FeatureGuard feature="enable_chat_support" fallback={<DisabledMessage />}>
 *   <ChatWidget />
 * </FeatureGuard>
 * 
 * @param {string} feature - The feature flag key to check
 * @param {React.ReactNode} children - Content to render if feature is enabled
 * @param {React.ReactNode} fallback - Optional content to render if feature is disabled
 * @param {boolean} invert - If true, renders children when feature is DISABLED
 */
const FeatureGuard = ({ 
  feature, 
  children, 
  fallback = null,
  invert = false 
}) => {
  const { isFeatureEnabled } = useConfig();
  
  const isEnabled = isFeatureEnabled(feature);
  
  // Invert logic if needed (useful for "show this when feature is OFF")
  const shouldRender = invert ? !isEnabled : isEnabled;
  
  if (shouldRender) {
    return children;
  }
  
  return fallback;
};

/**
 * Higher-Order Component version of FeatureGuard
 * Useful for wrapping entire page components
 * 
 * Usage:
 * const ProtectedPage = withFeatureGuard(MyPage, 'enable_user_ads');
 */
export const withFeatureGuard = (
  WrappedComponent, 
  feature, 
  FallbackComponent = null
) => {
  return function FeatureGuardedComponent(props) {
    return (
      <FeatureGuard feature={feature} fallback={FallbackComponent && <FallbackComponent />}>
        <WrappedComponent {...props} />
      </FeatureGuard>
    );
  };
};

/**
 * Hook version for more complex conditional logic
 * 
 * Usage:
 * const canShowAds = useFeatureFlag('enable_user_ads');
 * if (canShowAds) { ... }
 */
export const useFeatureFlag = (feature) => {
  const { isFeatureEnabled } = useConfig();
  return isFeatureEnabled(feature);
};

export default FeatureGuard;
