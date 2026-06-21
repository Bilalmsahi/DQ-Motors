/**
 * PageLoader - Full page loading spinner
 * Used as fallback for React.lazy() Suspense
 */
const PageLoader = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-40">
      <div className="text-center">
        <div className="relative mb-4">
          <div className="h-12 w-12 mx-auto rounded-full border-4 border-gray-200 border-t-brand-600 animate-spin" />
        </div>
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    </div>
  );
};

export default PageLoader;
