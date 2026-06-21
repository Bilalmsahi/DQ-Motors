/**
 * ResponsiveTableWrapper
 *
 * Wraps any <table> in a horizontally-scrollable container so wide tables
 * never break the mobile layout.
 *
 * Usage:
 *   <ResponsiveTableWrapper>
 *     <table> … </table>
 *   </ResponsiveTableWrapper>
 *
 * Props:
 *   children  – the <table> element(s)
 *   minWidth  – minimum table width that triggers scroll (default "800px")
 *   className – extra classes for the outer wrapper
 */
const ResponsiveTableWrapper = ({ children, minWidth = '800px', className = '' }) => {
  return (
    <div
      className={`w-full overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}
    >
      <table
        className="w-full text-left text-sm whitespace-nowrap"
        style={{ minWidth }}
      >
        {children}
      </table>
    </div>
  );
};

export default ResponsiveTableWrapper;
