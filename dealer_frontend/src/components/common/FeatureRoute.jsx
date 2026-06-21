import { Suspense } from 'react';
import { useConfig } from '../../context/ConfigContext';
import PageLoader from './PageLoader';

/**
 * FeatureRoute - Conditionally renders a lazy-loaded component based on feature flag
 * 
 * This component combines:
 * 1. Feature flag checking (from ConfigContext)
 * 2. Lazy loading (the component prop should already be a lazy() component)
 * 3. Suspense for loading states
 * 
 * If the feature is disabled, the component is not rendered,
 * and the browser won't download its bundle.
 * 
 * Usage:
 * const SellMyCar = lazy(() => import('./pages/SellMyCar'));
 * 
 * <Route path="/sell-my-car" element={
 *   <FeatureRoute 
 *     feature="enable_user_ads"
 *     component={SellMyCar}
 *   />
 * } />
 */
const FeatureRoute = ({ 
  feature, 
  component: LazyComponent,
  fallback = null,
  loadingMessage = 'Loading page...'
}) => {
  const { isFeatureEnabled } = useConfig();
  
  // Check if feature is enabled BEFORE rendering the lazy component
  if (!isFeatureEnabled(feature)) {
    // Return fallback or a default "Feature Disabled" message
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-4V9m0 0V7m0 2h2m-2 0H9" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Feature Not Available</h2>
          <p className="text-gray-500">This feature is currently not enabled for this site.</p>
        </div>
      </div>
    );
  }
  
  return (
    <Suspense fallback={<PageLoader message={loadingMessage} />}>
      <LazyComponent />
    </Suspense>
  );
};

export default FeatureRoute;
